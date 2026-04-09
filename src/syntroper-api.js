/**
 * syntroper-api.js — Handles all communication with the Syntroper backend.
 *
 * This module is the ONLY place where network requests are made.
 * It sends diagram source code to the Syntroper API for rendering and
 * receives back a hosted image URL.
 *
 * The action does NOT render diagrams itself — all rendering (mermaid, plantuml,
 * ditaa, ascii) happens server-side on Syntroper's infrastructure. This keeps
 * the GitHub Action lightweight (no heavy rendering dependencies).
 *
 * API CONTRACT:
 *
 *   Request:
 *     POST {api_url}/v1/diagrams/import
 *     Headers: { "content-type": "application/json", "authorization": "Bearer <token>" (optional) }
 *     Body: { "code": "<canonicalized diagram source>" }
 *
 *   Success Response (HTTP 200):
 *     {
 *       "success": true,
 *       "diagram_id": "uuid-here",           ← Unique ID for this diagram on Syntroper
 *       "image_url": "https://s3...png",     ← Hosted image URL (S3 bucket)
 *       "diagram_type": "flowchart",          ← Detected diagram type
 *       "title": "My Flow"                    ← Auto-generated title
 *     }
 *
 *   Error Response:
 *     HTTP 4xx/5xx with error text body
 *
 * The image_url from the response is what gets embedded in the rewritten README.
 * The diagram_id is stored in the HTML metadata comment for the browser extension.
 *
 * Used by: index.js (called once for each diagram block)
 */
const { info } = require("./logger");  // Logging utility

/**
 * uploadDiagram() — Send a single diagram's source to the Syntroper API.
 *
 * @param {Object} params
 * @param {string} params.apiUrl - Base API URL (e.g. "https://dev-api.syntroper.ai")
 * @param {string} params.token - Optional auth token (empty string = no auth)
 * @param {string} params.engine - Diagram engine name (e.g. "mermaid") — logged for debugging
 * @param {string} params.rawSource - Original raw source (not used in request, kept for reference)
 * @param {string} params.canonicalSource - Canonicalized source — this is what gets sent to the API
 * @param {Object} params.hashes - Hash object from hashes.js — used for logging
 * @returns {Promise<{ diagramId: string, imageUrl: string, interactiveUrl: string }>}
 */
async function uploadDiagram({
  apiUrl,
  token,
  engine,
  rawSource,
  canonicalSource,
  hashes
}) {
  // Log which diagram we're uploading, showing first 12 chars of hash for identification
  info(`Uploading diagram (engine=${engine}, canonical=${hashes.canonicalHash.slice(0, 12)}…)`);

  // ── Build request headers ─────────────────────────────────────────────
  const headers = { "content-type": "application/json" };  // Always send JSON
  if (token) {
    // If an auth token was provided in the workflow inputs, include it.
    // This allows authenticated access to the API for private/paid features.
    headers["authorization"] = `Bearer ${token}`;
  }

  // ── Build the full API URL ────────────────────────────────────────────
  // Strip trailing slashes from the base URL to avoid double-slash issues.
  // e.g. "https://dev-api.syntroper.ai/" + "/v1/..." → "https://dev-api.syntroper.ai/v1/..."
  const url = apiUrl.replace(/\/+$/, "") + "/v1/diagrams/import";

  // ── Make the HTTP POST request ────────────────────────────────────────
  // Uses Node.js built-in fetch() (available in Node 18+).
  // We send the CANONICALIZED source, not the raw source, so the API can
  // match it against previously uploaded diagrams for deduplication.
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ code: canonicalSource })  // Only the source code is sent
  });

  // ── Handle HTTP errors ────────────────────────────────────────────────
  // If the API returns 4xx or 5xx, read the error body and throw.
  if (!response.ok) {
    const text = await response.text();  // Read error message from response body
    throw new Error(`Syntroper API error ${response.status}: ${text}`);
  }

  // ── Parse JSON response ───────────────────────────────────────────────
  const data = await response.json();

  // ── Validate success flag ─────────────────────────────────────────────
  // The API always returns a "success" boolean. Even on HTTP 200, it might
  // report success=false for business logic failures.
  if (!data.success) {
    throw new Error(`Syntroper API returned success=false: ${JSON.stringify(data)}`);
  }

  // ── Map API response to our internal format ───────────────────────────
  // The API uses snake_case (diagram_id, image_url), but our action uses camelCase.
  // interactiveUrl is set to image_url for now — will point to an embed page
  // once the browser extension's interactive viewer is built.
  return {
    diagramId: data.diagram_id,        // UUID assigned by Syntroper (e.g. "51df3992-ae60-...")
    imageUrl: data.image_url,          // Hosted image URL on S3 (e.g. "https://snt-dev-media.s3...png")
    interactiveUrl: data.image_url     // TODO: Will become embed URL for browser extension iframe
  };
}

module.exports = { uploadDiagram };

/**
 * syntroper-api.js — Handles all communication with the Syntroper backend.
 *
 * Sends diagram source code to the Syntroper API for rendering.
 * The API is responsible for rendering all diagram types (mermaid, plantuml,
 * ditaa, ascii) server-side and returning a hosted image URL.
 *
 * Request:
 *   POST <api_url>
 *   Body: { "code": "<diagram source>" }
 *
 * Response:
 *   {
 *     "success": true,
 *     "diagram_id": "...",
 *     "image_url": "https://...png",
 *     "diagram_type": "flowchart",
 *     "title": "My Flow"
 *   }
 *
 * The image_url is what gets embedded in the rewritten markdown.
 * The action does NOT render diagrams itself — Syntroper handles that.
 */
const { info } = require("./logger");

async function uploadDiagram({
  apiUrl,
  token,
  engine,
  rawSource,
  canonicalSource,
  hashes
}) {
  info(`Uploading diagram (engine=${engine}, canonical=${hashes.canonicalHash.slice(0, 12)}…)`);

  const headers = { "content-type": "application/json" };
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
  }

  const url = apiUrl.replace(/\/+$/, "") + "/v1/diagrams/import";
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ code: canonicalSource })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Syntroper API error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(`Syntroper API returned success=false: ${JSON.stringify(data)}`);
  }

  // Map API response fields to what the rest of the action expects
  return {
    diagramId: data.diagram_id,
    imageUrl: data.image_url,
    interactiveUrl: data.image_url
  };
}

module.exports = { uploadDiagram };

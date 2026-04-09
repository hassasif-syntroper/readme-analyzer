/**
 * hashes.js — Generates three-level identity hashes for diagrams.
 *
 * WHY THREE HASHES?
 * Each hash serves a different purpose in the Syntroper system:
 *
 *   1. rawSourceHash:  SHA-256 of the canonicalized source text alone.
 *      Purpose: Exact source tracking and provenance.
 *      Example use: "Has this exact source text been seen before?"
 *
 *   2. canonicalHash:  SHA-256 of { engine + canonicalSource }.
 *      Purpose: PRIMARY diagram identity key for deduplication.
 *      Why engine is included: The same source text "A-->B" could be valid
 *      Mermaid AND PlantUML, but would render differently. Including the
 *      engine ensures they're treated as separate diagrams.
 *      Key property: Same diagram in different repos → same canonicalHash.
 *
 *   3. renderHash:     SHA-256 of { engine + canonicalHash + renderConfig }.
 *      Purpose: Asset cache key for generated images (PNG/SVG).
 *      Why separate from canonicalHash: If we change the theme or upgrade
 *      the renderer version, we want NEW images but the SAME diagram identity.
 *      Key property: Same diagram + different theme → different renderHash.
 *
 * PRACTICAL IMPLICATIONS:
 *   - Whitespace-only edits → same canonicalHash → no re-render, no duplicate
 *   - Theme change → same canonicalHash, different renderHash → re-render only
 *   - Renderer upgrade → same canonicalHash, different renderHash → re-render only
 *   - Cross-repo dedup works via canonicalHash (same diagram = same identity)
 *
 * HASH FLOW:
 *   canonicalSource ──────────────────────────────────────→ rawSourceHash
 *   canonicalSource + engine ─────────────────────────────→ canonicalHash
 *   canonicalHash + engine + renderConfig ────────────────→ renderHash
 *
 * Used by: index.js (called for each diagram block after canonicalization)
 */
const crypto = require("crypto");  // Node.js built-in cryptography module

/**
 * sha256() — Compute SHA-256 hash of a string, returned as a hex string.
 *
 * SHA-256 produces a 64-character hex string (256 bits).
 * Example: sha256("hello") → "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
 *
 * @param {string} value - The string to hash
 * @returns {string} 64-character hex SHA-256 hash
 */
function sha256(value) {
  return crypto.createHash("sha256")  // Create a SHA-256 hash instance
    .update(value)                     // Feed the input string into it
    .digest("hex");                    // Output the hash as a hex string
}

/**
 * makeHashes() — Generate all three identity hashes for a diagram.
 *
 * @param {Object} params
 * @param {string} params.engine - Canonical engine name (e.g. "mermaid", "plantuml")
 * @param {string} params.canonicalSource - Canonicalized diagram source (from canonicalize.js)
 * @param {Object} params.renderConfig - Rendering options like { theme: "default", rendererVersion: "1" }
 * @returns {{ rawSourceHash: string, canonicalHash: string, renderHash: string }}
 */
function makeHashes({ engine, canonicalSource, renderConfig }) {
  // ── Step 1: canonicalHash (primary identity) ────────────────────────
  // JSON.stringify ensures consistent key ordering for deterministic hashing.
  // Input: { engine: "mermaid", canonicalSource: "graph TD\n  A-->B" }
  // This hash is the MAIN diagram identity used for deduplication.
  const canonicalPayload = JSON.stringify({
    engine,            // Include engine so same source in different engines = different hash
    canonicalSource    // The normalized diagram source text
  });

  const canonicalHash = sha256(canonicalPayload);  // e.g. "abc123..."

  // ── Step 2: renderHash (asset cache key) ────────────────────────────
  // Includes canonicalHash + renderConfig so theme/version changes = new cache key.
  // Input: { engine: "mermaid", canonicalHash: "abc123...", renderConfig: { theme: "default" } }
  const renderPayload = JSON.stringify({
    engine,            // Included again for completeness
    canonicalHash,     // Links back to the canonical identity
    renderConfig       // Theme, renderer version, etc. — changing this = new image
  });

  const renderHash = sha256(renderPayload);  // e.g. "def456..."

  // ── Step 3: rawSourceHash (provenance) ──────────────────────────────
  // Just the source text alone, without engine. For exact source tracking.
  const rawSourceHash = sha256(canonicalSource);  // e.g. "ghi789..."

  return { rawSourceHash, canonicalHash, renderHash };
}

module.exports = { makeHashes, sha256 };

/**
 * hashes.js — Generates three-level identity hashes for diagrams.
 *
 * Three hash levels serve different purposes:
 *
 *   1. rawSourceHash:  SHA-256 of the canonicalized source text.
 *      Used for exact source tracking and provenance.
 *
 *   2. canonicalHash:  SHA-256 of { engine + canonicalSource }.
 *      Used as the primary diagram identity key for deduplication.
 *      Same diagram in different repos → same canonicalHash.
 *
 *   3. renderHash:     SHA-256 of { engine + canonicalHash + renderConfig }.
 *      Used as the asset cache key for generated images.
 *      Same diagram with different theme/renderer version → different renderHash.
 *
 * This means:
 *   - Whitespace-only edits don't create new diagram IDs
 *   - Renderer upgrades only invalidate render assets, not diagram identity
 *   - Cross-repo dedup works via canonicalHash
 */
const crypto = require("crypto");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function makeHashes({ engine, canonicalSource, renderConfig }) {
  const canonicalPayload = JSON.stringify({
    engine,
    canonicalSource
  });

  const canonicalHash = sha256(canonicalPayload);

  const renderPayload = JSON.stringify({
    engine,
    canonicalHash,
    renderConfig
  });

  const renderHash = sha256(renderPayload);

  const rawSourceHash = sha256(canonicalSource);

  return { rawSourceHash, canonicalHash, renderHash };
}

module.exports = { makeHashes, sha256 };

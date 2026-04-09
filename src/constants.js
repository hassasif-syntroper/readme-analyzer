/**
 * constants.js — Shared constants and configuration for the entire action.
 *
 * This file is the single source of truth for:
 *   - Which diagram engines are supported (ENGINE_* constants)
 *   - How markdown fence tags map to engine names (FENCE_TAG_MAP)
 *   - Rewrite mode options (managed_blocks vs check_only)
 *   - Canonicalizer version (bumped when canonicalization logic changes)
 *
 * To add a new diagram type:
 *   1. Add an ENGINE_* constant below
 *   2. Add the fence tag(s) to FENCE_TAG_MAP (multiple tags can map to one engine)
 *   3. The Syntroper API handles rendering — no client-side rendering needed
 *
 * Used by: scan.js (FENCE_TAG_MAP for regex), canonicalize.js (CANONICALIZER_VERSION),
 *          index.js (REWRITE_CHECK_ONLY), markdown-rewrite.js (via scan.js BLOCK_RE)
 */
module.exports = {
  // ── Canonical engine names ──────────────────────────────────────────
  // These are the normalized internal names used throughout the action.
  // When a user writes ```puml, it gets mapped to "plantuml" via FENCE_TAG_MAP.
  ENGINE_MERMAID: "mermaid",       // Mermaid.js diagrams (flowchart, sequence, class, etc.)
  ENGINE_PLANTUML: "plantuml",     // PlantUML diagrams (also covers the "puml" alias)
  ENGINE_DITAA: "ditaa",           // Ditaa ASCII-to-diagram renderer
  ENGINE_ASCII: "ascii",           // Raw ASCII art (passed through as-is)

  // ── Rewrite mode options ────────────────────────────────────────────
  // Controls what the action does after uploading diagrams to the API.
  REWRITE_MANAGED_BLOCKS: "managed_blocks",  // Replace ```mermaid blocks with image + metadata
  REWRITE_CHECK_ONLY: "check_only",          // Upload only, don't modify any files

  // ── Canonicalizer version ───────────────────────────────────────────
  // Bump this if canonicalization logic changes, so hashes are recalculated.
  // This prevents stale cached images from being served after a logic update.
  CANONICALIZER_VERSION: "1",

  // ── Fence tag → engine mapping ──────────────────────────────────────
  // Maps the language tag after ``` in markdown to the canonical engine name.
  // Multiple tags can map to the same engine (e.g. "puml" → "plantuml").
  // This object's keys are also used to build the scanning regex in scan.js:
  //   Object.keys(FENCE_TAG_MAP).join("|") → "mermaid|plantuml|puml|ditaa|ascii"
  FENCE_TAG_MAP: {
    mermaid: "mermaid",      // ```mermaid  → engine "mermaid"
    plantuml: "plantuml",    // ```plantuml → engine "plantuml"
    puml: "plantuml",        // ```puml     → engine "plantuml" (alias)
    ditaa: "ditaa",          // ```ditaa    → engine "ditaa"
    ascii: "ascii"           // ```ascii    → engine "ascii"
  }
};

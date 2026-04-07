/**
 * constants.js — Shared constants and configuration.
 *
 * ENGINE_* constants are the canonical engine names used internally.
 * FENCE_TAG_MAP maps markdown fence language tags to canonical engine names
 * (e.g. "dot" and "neato" both map to "graphviz").
 *
 * To add a new diagram type:
 *   1. Add an ENGINE_* constant
 *   2. Add the fence tag(s) to FENCE_TAG_MAP
 *   3. The Syntroper API handles rendering — no client-side changes needed
 */
module.exports = {
  ENGINE_MERMAID: "mermaid",
  ENGINE_PLANTUML: "plantuml",
  ENGINE_DITAA: "ditaa",
  ENGINE_ASCII: "ascii",
  REWRITE_MANAGED_BLOCKS: "managed_blocks",
  REWRITE_CHECK_ONLY: "check_only",
  CANONICALIZER_VERSION: "1",

  // Maps fence language tags to canonical engine names
  FENCE_TAG_MAP: {
    mermaid: "mermaid",
    plantuml: "plantuml",
    puml: "plantuml",
    ditaa: "ditaa",
    ascii: "ascii"
  }
};

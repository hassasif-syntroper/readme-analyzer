module.exports = {
  ENGINE_MERMAID: "mermaid",
  ENGINE_PLANTUML: "plantuml",
  ENGINE_DITAA: "ditaa",
  ENGINE_D2: "d2",
  ENGINE_GRAPHVIZ: "graphviz",
  ENGINE_ASCII: "ascii",
  ENGINE_SVGBOB: "svgbob",
  REWRITE_MANAGED_BLOCKS: "managed_blocks",
  REWRITE_CHECK_ONLY: "check_only",
  CANONICALIZER_VERSION: "1",

  // Maps fence language tags to canonical engine names
  FENCE_TAG_MAP: {
    mermaid: "mermaid",
    plantuml: "plantuml",
    puml: "plantuml",
    ditaa: "ditaa",
    d2: "d2",
    dot: "graphviz",
    graphviz: "graphviz",
    neato: "graphviz",
    ascii: "ascii",
    svgbob: "svgbob"
  }
};

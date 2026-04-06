const { CANONICALIZER_VERSION } = require("./constants");

function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");
}

function collapseBlankLines(text) {
  return text.replace(/\n{3,}/g, "\n\n");
}

function trimTrailingWhitespace(text) {
  return text
    .split("\n")
    .map(line => line.replace(/[ \t]+$/g, ""))
    .join("\n");
}

function canonicalizeDiagram(engine, source) {
  let out = normalizeNewlines(source);
  out = trimTrailingWhitespace(out);
  out = collapseBlankLines(out);
  out = out.trim();

  return out;
}

module.exports = { canonicalizeDiagram, CANONICALIZER_VERSION };

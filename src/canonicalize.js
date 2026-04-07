/**
 * canonicalize.js — Normalizes diagram source to produce stable hashes.
 *
 * Problem: Whitespace-only edits (trailing spaces, blank lines, CRLF vs LF)
 * would produce different hashes and create duplicate diagram entries.
 *
 * Solution: Conservative canonicalization that only removes formatting-only
 * differences we are confident do not affect diagram output:
 *   - CRLF → LF
 *   - Trailing whitespace on each line
 *   - Multiple consecutive blank lines → single blank line
 *   - Leading/trailing blank lines trimmed
 *
 * Important: We intentionally do NOT normalize indentation inside content,
 * reorder statements, strip comments, or modify anything inside quoted strings.
 * Those changes could alter diagram semantics.
 */
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

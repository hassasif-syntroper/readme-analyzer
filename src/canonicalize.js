/**
 * canonicalize.js — Normalizes diagram source to produce stable hashes.
 *
 * WHY THIS EXISTS:
 * Problem: Whitespace-only edits (trailing spaces, blank lines, CRLF vs LF)
 * would produce different SHA-256 hashes and create duplicate diagram entries
 * in Syntroper, even though the rendered diagram is visually identical.
 *
 * Solution: Run the source through a conservative canonicalization pipeline
 * BEFORE hashing. This ensures formatting-only differences produce the SAME hash.
 *
 * What we normalize (safe — never changes diagram output):
 *   - CRLF → LF               (Windows vs Mac/Linux line endings)
 *   - Trailing whitespace      (invisible spaces/tabs at end of lines)
 *   - Multiple blank lines     (3+ consecutive newlines → 2 newlines)
 *   - Leading/trailing blanks  (empty lines at the start/end of the source)
 *
 * What we do NOT normalize (unsafe — could change diagram meaning):
 *   - Indentation inside content   (some diagrams are indent-sensitive)
 *   - Statement order               (reordering could change layout)
 *   - Comments inside diagram code  (some engines use comments for directives)
 *   - Quoted string contents        (labels, titles, descriptions)
 *
 * FLOW:
 *   Raw source → normalizeNewlines → trimTrailingWhitespace → collapseBlankLines → trim
 *                                                                                   ↓
 *                                                                          Canonical source
 *                                                                          (fed to hashes.js)
 *
 * Used by: index.js (called for each diagram block before hashing)
 */
const { CANONICALIZER_VERSION } = require("./constants");  // Version tag for cache invalidation

/**
 * normalizeNewlines() — Convert Windows-style line endings to Unix-style.
 *
 * Windows uses \r\n (carriage return + line feed), Mac/Linux use \n (line feed only).
 * A diagram written on Windows and the same diagram on Mac would have different bytes,
 * producing different hashes. This normalizes both to \n.
 *
 * @param {string} text - Raw source text
 * @returns {string} Text with all \r\n replaced by \n
 */
function normalizeNewlines(text) {
  return text.replace(/\r\n/g, "\n");  // Replace all Windows line endings → Unix
}

/**
 * collapseBlankLines() — Reduce 3+ consecutive newlines to exactly 2 (one blank line).
 *
 * Some editors or users might add extra blank lines between diagram sections.
 * These don't affect rendering, but would change the hash.
 * Example: "A-->B\n\n\n\nC-->D" → "A-->B\n\nC-->D"
 *
 * @param {string} text - Source text with normalized newlines
 * @returns {string} Text with excessive blank lines collapsed
 */
function collapseBlankLines(text) {
  return text.replace(/\n{3,}/g, "\n\n");  // 3+ newlines → exactly 2 newlines
}

/**
 * trimTrailingWhitespace() — Remove invisible spaces/tabs at the end of each line.
 *
 * Editors often add or remove trailing whitespace silently.
 * "  A[User] --> B[Action]   " and "  A[User] --> B[Action]" render the same diagram,
 * but have different bytes. This strips trailing spaces/tabs from every line.
 *
 * Note: We do NOT touch leading whitespace (indentation), because some diagram
 * languages (like YAML-based configs in Mermaid) are indent-sensitive.
 *
 * @param {string} text - Source text to clean
 * @returns {string} Text with trailing whitespace removed from each line
 */
function trimTrailingWhitespace(text) {
  return text
    .split("\n")                              // Split into individual lines
    .map(line => line.replace(/[ \t]+$/g, "")) // Remove trailing spaces/tabs from each line
    .join("\n");                               // Rejoin into a single string
}

/**
 * canonicalizeDiagram() — Main entry point. Runs all normalization steps in order.
 *
 * The order matters:
 *   1. normalizeNewlines first — so \r\n doesn't interfere with \n-based operations
 *   2. trimTrailingWhitespace — clean each line
 *   3. collapseBlankLines — reduce excessive blank lines
 *   4. trim — remove leading/trailing blank lines from the whole block
 *
 * @param {string} engine - The diagram engine (currently unused, reserved for engine-specific rules)
 * @param {string} source - The raw diagram source text from the markdown block
 * @returns {string} Canonicalized source, ready for hashing
 */
function canonicalizeDiagram(engine, source) {
  let out = normalizeNewlines(source);       // Step 1: \r\n → \n
  out = trimTrailingWhitespace(out);         // Step 2: Remove trailing spaces from each line
  out = collapseBlankLines(out);             // Step 3: Collapse 3+ blank lines → 1 blank line
  out = out.trim();                          // Step 4: Remove leading/trailing blank lines

  return out;  // Ready for hashing in hashes.js
}

module.exports = { canonicalizeDiagram, CANONICALIZER_VERSION };

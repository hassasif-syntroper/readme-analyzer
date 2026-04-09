/**
 * scan.js — Finds markdown files and extracts fenced diagram blocks.
 *
 * This is the first step in the pipeline: given glob patterns like "README.md"
 * or "docs/*.md", it finds matching files and extracts all diagram code blocks.
 *
 * Uses fast-glob to match file patterns, then applies a regex to find
 * fenced code blocks with supported diagram language tags.
 *
 * Supported fence tags (defined in constants.js FENCE_TAG_MAP):
 *   mermaid, plantuml, puml, ditaa, ascii
 *
 * Each detected block includes:
 *   - engine:        Canonical engine name (e.g. "puml" → "plantuml")
 *   - source:        Raw diagram source text (content between the fences)
 *   - originalMatch: Full matched string including fences (for replacement later)
 *   - start/end:     Character positions in the file (for position-based operations)
 *
 * Example: Given this markdown content:
 *   ## Architecture
 *   ```mermaid
 *   graph TD
 *     A-->B
 *   ```
 *
 * The scanner produces:
 *   { engine: "mermaid", source: "graph TD\n  A-->B", originalMatch: "```mermaid\n...\n```", start: 20, end: 52 }
 *
 * Used by: index.js (to get blocks for processing), markdown-rewrite.js (BLOCK_RE for replacement)
 */
const fs = require("fs/promises");           // Node.js file system (promise-based)
const fg = require("fast-glob");             // Fast file globbing library
const { FENCE_TAG_MAP } = require("./constants");  // Maps fence tags to engine names

// ── Build the scanning regex ────────────────────────────────────────────
// Join all supported fence tags into a regex alternation: "mermaid|plantuml|puml|ditaa|ascii"
const SUPPORTED_TAGS = Object.keys(FENCE_TAG_MAP).join("|");

// The main regex that finds diagram blocks in markdown files.
// Pattern breakdown:
//   ```              — Opening fence (3 backticks)
//   (mermaid|...)    — Capture group 1: the language tag
//   \n               — Newline after the language tag
//   ([\s\S]*?)       — Capture group 2: the diagram source (lazy match = as little as possible)
//   ```              — Closing fence (3 backticks)
//   "g" flag         — Global: find ALL matches in the file, not just the first
const BLOCK_RE = new RegExp("```(" + SUPPORTED_TAGS + ")\\n([\\s\\S]*?)```", "g");

/**
 * scanFiles() — Scan markdown files for diagram blocks.
 *
 * @param {string[]} patterns - Glob patterns like ["README.md", "docs/*.md"]
 * @returns {Promise<Array<{ path: string, content: string, blocks: Array }>>}
 *          Array of files that contain at least one diagram block.
 *          Files with no diagram blocks are excluded from the results.
 */
async function scanFiles(patterns) {
  // Resolve glob patterns to actual file paths on disk.
  // onlyFiles: true — skip directories. unique: true — no duplicate paths.
  const paths = await fg(patterns, { onlyFiles: true, unique: true });
  const results = [];  // Will hold { path, content, blocks } for each file with diagrams

  // Process each matching file
  for (const path of paths) {
    const content = await fs.readFile(path, "utf8");  // Read the entire file as a string
    const blocks = [];  // Diagram blocks found in this file
    let match;          // Will hold each regex match result

    // Reset the regex's internal position counter.
    // IMPORTANT: Since BLOCK_RE has the "g" flag, it remembers where it left off.
    // We must reset to 0 before each new file, otherwise it would start scanning
    // from where it stopped in the PREVIOUS file.
    BLOCK_RE.lastIndex = 0;

    // Find all diagram blocks in this file using the regex.
    // BLOCK_RE.exec() returns null when no more matches are found.
    while ((match = BLOCK_RE.exec(content)) !== null) {
      const tag = match[1].toLowerCase();       // e.g. "mermaid", "puml", "Mermaid" → "mermaid"
      const engine = FENCE_TAG_MAP[tag] || tag;  // Normalize: "puml" → "plantuml", "mermaid" → "mermaid"

      blocks.push({
        engine,                                  // Canonical engine name (e.g. "plantuml")
        source: match[2].trimEnd(),              // Diagram source text, trailing whitespace removed
        originalMatch: match[0],                 // Full match including ```mermaid\n...\n``` (used by rewriter)
        start: match.index,                      // Character position where ```mermaid starts in the file
        end: match.index + match[0].length       // Character position where ``` ends in the file
      });
    }

    // Only include files that have at least one diagram block.
    // Files with no diagrams are skipped entirely.
    if (blocks.length > 0) {
      results.push({ path, content, blocks });
    }
  }

  return results;
}

module.exports = { scanFiles, BLOCK_RE };

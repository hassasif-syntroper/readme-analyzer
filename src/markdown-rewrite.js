/**
 * markdown-rewrite.js — Replaces diagram code blocks with managed image blocks.
 *
 * This is the FINAL step in the pipeline (before git commit).
 * After the Syntroper API returns an imageUrl for each diagram, this module
 * replaces the original fenced code block (e.g. ```mermaid...```) with a
 * "managed block" that contains a static image and metadata.
 *
 * BEFORE (original markdown):
 *   ```mermaid
 *   graph TD
 *     A-->B
 *   ```
 *
 * AFTER (managed block):
 *   <!-- syntroper:start -->
 *   [![Diagram](https://s3...png)](https://s3...png)
 *
 *   Open interactive version on Syntroper.
 *   Use the Syntroper browser extension for inline interactive mode.
 *   <!-- syntroper:diagram canonical=abc123 render=def456 id=uuid engine=mermaid -->
 *   <!-- syntroper:end -->
 *
 * WHY THIS FORMAT?
 *   - The [![Diagram](...)](...) is a standard markdown image link — works everywhere
 *   - HTML comments (<!-- -->) are invisible on GitHub but machine-readable
 *   - The browser extension reads the "id" from the comment to load an interactive iframe
 *   - The hashes provide provenance for debugging and cache invalidation
 *   - syntroper:start/end markers let us identify our blocks for future re-runs (TODO)
 *
 * REPLACEMENT STRATEGY:
 *   We use a single-pass regex callback (content.replace(BLOCK_RE, callback)).
 *   This avoids two bugs from earlier approaches:
 *     1. String.replace() with static replacement interprets $-patterns ($1, $&, etc.)
 *        which corrupted content when diagram source contained $ characters
 *     2. Position-based replacement (slice) shifted offsets when processing multiple blocks
 *   The callback approach processes all blocks in one pass, so no position shifting occurs.
 *
 * Used by: index.js (called once per file after all blocks in that file are uploaded)
 */
const fs = require("fs/promises");      // Node.js file system (promise-based)
const { BLOCK_RE } = require("./scan"); // Same regex used for scanning — ensures exact match

/**
 * makeManagedBlock() — Build the replacement markdown for a single diagram.
 *
 * Takes a block object (with .rendered data from the API) and returns
 * the managed block string that will replace the original ```mermaid...``` block.
 *
 * @param {Object} block - A diagram block with block.rendered and block.engine
 * @param {Object} block.rendered - API response data: { imageUrl, interactiveUrl, canonicalHash, renderHash, diagramId }
 * @param {string} block.engine - Canonical engine name (e.g. "mermaid")
 * @returns {string} The full managed block markdown string
 */
function makeManagedBlock(block) {
  return [
    "<!-- syntroper:start -->",                        // Start marker — extension and future re-runs detect this
    `[![Diagram](${block.rendered.imageUrl})](${block.rendered.interactiveUrl})`,  // Clickable image link
    "",                                                // Blank line for markdown spacing
    "Open interactive version on Syntroper.",           // User-facing text (visible on GitHub)
    "Use the Syntroper browser extension for inline interactive mode.",  // Encourages extension install
    `<!-- syntroper:diagram canonical=${block.rendered.canonicalHash || ""} render=${block.rendered.renderHash || ""} id=${block.rendered.diagramId} engine=${block.engine} -->`,  // Metadata comment — machine-readable
    "<!-- syntroper:end -->"                           // End marker — closes the managed block
  ].join("\n");  // Join all lines with newlines into a single string
}

/**
 * rewriteMarkdownFile() — Replace all diagram blocks in a file with managed blocks.
 *
 * Strategy:
 *   1. Re-read the file from disk (same content that was scanned earlier)
 *   2. Build a Map: original match text → managed block replacement
 *   3. Run a single-pass regex replace using a callback function
 *   4. Write the new content back to disk (only if something changed)
 *
 * @param {string} filePath - Path to the markdown file (e.g. "README.md")
 * @param {Array} blocks - Array of block objects from scanFiles(), each with .rendered data
 * @returns {Promise<boolean>} true if the file was modified, false if no changes
 */
async function rewriteMarkdownFile(filePath, blocks) {
  // Re-read the file from disk. This should be identical to what scanFiles() read,
  // since nothing modifies the file between scanning and rewriting.
  let content = await fs.readFile(filePath, "utf8");

  // ── Step 1: Build replacement map ───────────────────────────────────
  // Key = the exact original match string (e.g. "```mermaid\ngraph TD\n  A-->B\n```")
  // Value = the managed block that replaces it
  // Only include blocks that were successfully rendered (block.rendered exists)
  const replacements = new Map();
  for (const block of blocks) {
    if (block.rendered) {
      replacements.set(block.originalMatch, makeManagedBlock(block));
    }
  }

  // If no blocks were rendered (e.g. all API calls failed), don't modify the file
  if (replacements.size === 0) return false;

  // ── Step 2: Single-pass regex replacement ───────────────────────────
  // Reset the regex position counter (same reason as in scan.js — "g" flag remembers position)
  BLOCK_RE.lastIndex = 0;

  // Replace all diagram blocks in one pass using a callback function.
  // The callback receives the full match string and returns the replacement.
  // WHY a callback? Two reasons:
  //   1. Avoids $-pattern bugs: String.replace("old", "new") interprets $1, $&, etc.
  //      in "new". A callback's return value is used literally — no special patterns.
  //   2. Single pass: All blocks are replaced at once, so we don't need to worry
  //      about character positions shifting as earlier blocks change length.
  const newContent = content.replace(BLOCK_RE, (match) => {
    // If this match is in our replacement map, replace it; otherwise keep it as-is.
    // (Keeps non-rendered blocks unchanged.)
    return replacements.has(match) ? replacements.get(match) : match;
  });

  // ── Step 3: Write back only if content changed ──────────────────────
  const changed = newContent !== content;
  if (changed) {
    await fs.writeFile(filePath, newContent, "utf8");  // Overwrite the file with new content
  }

  return changed;  // true = file was modified, false = no changes
}

module.exports = { rewriteMarkdownFile, makeManagedBlock };

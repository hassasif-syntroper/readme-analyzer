/**
 * markdown-rewrite.js — Replaces diagram code blocks with managed image blocks.
 *
 * After the Syntroper API returns an imageUrl for each diagram, this module
 * replaces the original fenced code block (e.g. ```mermaid...```) with a
 * managed block that contains:
 *
 *   <!-- syntroper:start -->
 *   [![Diagram](imageUrl)](interactiveUrl)
 *   Open interactive version on Syntroper.
 *   <!-- syntroper:diagram canonical=... render=... id=... engine=... -->
 *   <!-- syntroper:end -->
 *
 * The HTML comments serve as metadata markers that:
 *   - The browser extension can detect for inline interactive rendering
 *   - The action can detect on re-runs to update existing blocks (TODO)
 *   - Provide provenance (hashes, engine, diagram ID)
 */
const fs = require("fs/promises");
const { BLOCK_RE } = require("./scan");

function makeManagedBlock(block) {
  return [
    "<!-- syntroper:start -->",
    `[![Diagram](${block.rendered.imageUrl})](${block.rendered.interactiveUrl})`,
    "",
    "Open interactive version on Syntroper.",
    "Use the Syntroper browser extension for inline interactive mode.",
    `<!-- syntroper:diagram canonical=${block.rendered.canonicalHash || ""} render=${block.rendered.renderHash || ""} id=${block.rendered.diagramId} engine=${block.engine} -->`,
    "<!-- syntroper:end -->"
  ].join("\n");
}

async function rewriteMarkdownFile(filePath, blocks) {
  let content = await fs.readFile(filePath, "utf8");

  // Build a map from originalMatch text → managed block replacement
  const replacements = new Map();
  for (const block of blocks) {
    if (block.rendered) {
      replacements.set(block.originalMatch, makeManagedBlock(block));
    }
  }

  if (replacements.size === 0) return false;

  // Single-pass replacement using the same regex as scanning.
  // Using a callback function avoids $-pattern interpretation issues.
  BLOCK_RE.lastIndex = 0;
  const newContent = content.replace(BLOCK_RE, (match) => {
    return replacements.has(match) ? replacements.get(match) : match;
  });

  const changed = newContent !== content;
  if (changed) {
    await fs.writeFile(filePath, newContent, "utf8");
  }

  return changed;
}

module.exports = { rewriteMarkdownFile, makeManagedBlock };

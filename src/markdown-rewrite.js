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
  let changed = false;

  for (const block of blocks) {
    const replacement = makeManagedBlock(block);
    if (content.includes(block.originalMatch)) {
      content = content.replace(block.originalMatch, replacement);
      changed = true;
    }
  }

  if (changed) {
    await fs.writeFile(filePath, content, "utf8");
  }

  return changed;
}

module.exports = { rewriteMarkdownFile, makeManagedBlock };

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

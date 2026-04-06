const fs = require("fs/promises");
const fg = require("fast-glob");

const BLOCK_RE = /```(mermaid|plantuml|puml)\n([\s\S]*?)```/g;

async function scanFiles(patterns) {
  const paths = await fg(patterns, { onlyFiles: true, unique: true });
  const results = [];

  for (const path of paths) {
    const content = await fs.readFile(path, "utf8");
    const blocks = [];
    let match;

    BLOCK_RE.lastIndex = 0;
    while ((match = BLOCK_RE.exec(content)) !== null) {
      const engine = match[1] === "puml" ? "plantuml" : match[1];
      blocks.push({
        engine,
        source: match[2].trimEnd(),
        originalMatch: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }

    if (blocks.length > 0) {
      results.push({ path, content, blocks });
    }
  }

  return results;
}

module.exports = { scanFiles };

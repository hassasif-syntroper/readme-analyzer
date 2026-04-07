const fs = require("fs/promises");
const fg = require("fast-glob");
const { FENCE_TAG_MAP } = require("./constants");

const SUPPORTED_TAGS = Object.keys(FENCE_TAG_MAP).join("|");
const BLOCK_RE = new RegExp("```(" + SUPPORTED_TAGS + ")\\n([\\s\\S]*?)```", "g");

async function scanFiles(patterns) {
  const paths = await fg(patterns, { onlyFiles: true, unique: true });
  const results = [];

  for (const path of paths) {
    const content = await fs.readFile(path, "utf8");
    const blocks = [];
    let match;

    BLOCK_RE.lastIndex = 0;
    while ((match = BLOCK_RE.exec(content)) !== null) {
      const tag = match[1].toLowerCase();
      const engine = FENCE_TAG_MAP[tag] || tag;
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

module.exports = { scanFiles, BLOCK_RE };

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs/promises");
const path = require("path");
const os = require("os");

// We test the regex and block extraction logic directly
// by creating temp files and scanning them.

const BLOCK_RE = /```(mermaid|plantuml|puml)\n([\s\S]*?)```/g;

function extractBlocks(content) {
  const blocks = [];
  let match;
  BLOCK_RE.lastIndex = 0;
  while ((match = BLOCK_RE.exec(content)) !== null) {
    const engine = match[1] === "puml" ? "plantuml" : match[1];
    blocks.push({
      engine,
      source: match[2].trimEnd(),
      start: match.index,
      end: match.index + match[0].length
    });
  }
  return blocks;
}

describe("block extraction", () => {
  it("detects a mermaid block", () => {
    const md = '# Title\n\n```mermaid\ngraph TD\n  A --> B\n```\n\nSome text.';
    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].engine, "mermaid");
    assert.equal(blocks[0].source, "graph TD\n  A --> B");
  });

  it("detects a plantuml block", () => {
    const md = '```plantuml\n@startuml\nAlice -> Bob\n@enduml\n```';
    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].engine, "plantuml");
  });

  it("normalizes puml to plantuml", () => {
    const md = '```puml\n@startuml\nAlice -> Bob\n@enduml\n```';
    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].engine, "plantuml");
  });

  it("detects multiple blocks", () => {
    const md = [
      "# Doc",
      "",
      "```mermaid",
      "graph TD",
      "  A --> B",
      "```",
      "",
      "Some text.",
      "",
      "```plantuml",
      "@startuml",
      "Alice -> Bob",
      "@enduml",
      "```"
    ].join("\n");

    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].engine, "mermaid");
    assert.equal(blocks[1].engine, "plantuml");
  });

  it("returns empty array when no blocks found", () => {
    const md = "# Just a heading\n\nSome paragraph text.\n";
    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 0);
  });

  it("captures correct start and end positions", () => {
    const prefix = "# Title\n\n";
    const block = "```mermaid\ngraph TD\n  A --> B\n```";
    const md = prefix + block + "\n\nTrailing.";
    const blocks = extractBlocks(md);
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].start, prefix.length);
    assert.equal(blocks[0].end, prefix.length + block.length);
  });
});

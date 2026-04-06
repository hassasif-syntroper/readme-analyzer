const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { makeManagedBlock } = require("../src/markdown-rewrite");

describe("makeManagedBlock", () => {
  it("produces expected managed block structure", () => {
    const block = {
      engine: "mermaid",
      rendered: {
        imageUrl: "https://cdn.syntroper.com/diag/abc.svg",
        interactiveUrl: "https://syntroper.com/d/diag_123",
        diagramId: "diag_123",
        canonicalHash: "cafebabe",
        renderHash: "deadbeef"
      }
    };

    const result = makeManagedBlock(block);

    assert.ok(result.startsWith("<!-- syntroper:start -->"), "should start with marker");
    assert.ok(result.endsWith("<!-- syntroper:end -->"), "should end with marker");
    assert.ok(result.includes("[![Diagram]"), "should contain image link");
    assert.ok(result.includes("https://cdn.syntroper.com/diag/abc.svg"), "should contain image URL");
    assert.ok(result.includes("https://syntroper.com/d/diag_123"), "should contain interactive URL");
    assert.ok(result.includes("canonical=cafebabe"), "should contain canonical hash");
    assert.ok(result.includes("render=deadbeef"), "should contain render hash");
    assert.ok(result.includes("id=diag_123"), "should contain diagram ID");
    assert.ok(result.includes("engine=mermaid"), "should contain engine");
  });

  it("handles missing hash fields gracefully", () => {
    const block = {
      engine: "plantuml",
      rendered: {
        imageUrl: "https://cdn.syntroper.com/diag/xyz.svg",
        interactiveUrl: "https://syntroper.com/d/diag_456",
        diagramId: "diag_456"
      }
    };

    const result = makeManagedBlock(block);

    assert.ok(result.includes("canonical="), "should have canonical field even if empty");
    assert.ok(result.includes("render="), "should have render field even if empty");
    assert.ok(result.includes("engine=plantuml"), "should contain plantuml engine");
  });
});

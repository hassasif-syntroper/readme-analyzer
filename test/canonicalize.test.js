const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { canonicalizeDiagram } = require("../src/canonicalize");

describe("canonicalizeDiagram", () => {
  it("normalizes CRLF to LF", () => {
    const input = "graph TD\r\n  A --> B\r\n";
    const result = canonicalizeDiagram("mermaid", input);
    assert.ok(!result.includes("\r"), "should not contain CR");
    assert.equal(result, "graph TD\n  A --> B");
  });

  it("trims trailing whitespace from lines", () => {
    const input = "graph TD   \n  A --> B  \n  B --> C\t\t";
    const result = canonicalizeDiagram("mermaid", input);
    assert.equal(result, "graph TD\n  A --> B\n  B --> C");
  });

  it("collapses multiple blank lines into one", () => {
    const input = "graph TD\n\n\n\n  A --> B\n\n\n  B --> C";
    const result = canonicalizeDiagram("mermaid", input);
    assert.equal(result, "graph TD\n\n  A --> B\n\n  B --> C");
  });

  it("trims leading and trailing blank lines", () => {
    const input = "\n\n  graph TD\n  A --> B\n\n";
    const result = canonicalizeDiagram("mermaid", input);
    assert.equal(result, "graph TD\n  A --> B");
  });

  it("produces identical output for whitespace-only differences", () => {
    const a = "graph TD\r\n  A --> B  \r\n\r\n\r\n  B --> C\r\n";
    const b = "graph TD\n  A --> B\n\n  B --> C\n";
    const resultA = canonicalizeDiagram("mermaid", a);
    const resultB = canonicalizeDiagram("mermaid", b);
    assert.equal(resultA, resultB);
  });

  it("preserves whitespace inside the diagram content", () => {
    const input = 'graph TD\n  A["Hello   World"] --> B';
    const result = canonicalizeDiagram("mermaid", input);
    assert.ok(result.includes("Hello   World"), "should preserve inner spaces");
  });

  it("works for plantuml engine", () => {
    const input = "@startuml\r\nAlice -> Bob : hello\r\n@enduml\r\n";
    const result = canonicalizeDiagram("plantuml", input);
    assert.equal(result, "@startuml\nAlice -> Bob : hello\n@enduml");
  });
});

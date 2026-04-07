const { scanFiles } = require("./src/scan");
const { canonicalizeDiagram } = require("./src/canonicalize");
const { makeHashes } = require("./src/hashes");
const { rewriteMarkdownFile } = require("./src/markdown-rewrite");
const fs = require("fs/promises");

// Mock API response — in production this comes from Syntroper API
function mockApiResponse(hashes) {
  return {
    diagramId: hashes.canonicalHash.slice(0, 16),
    imageUrl: `https://cdn.syntroper.com/d/${hashes.renderHash}.svg`,
    interactiveUrl: `https://syntroper.com/d/${hashes.canonicalHash.slice(0, 16)}`
  };
}

async function main() {
  // Copy fixture so we don't destroy the original
  const src = "test-fixtures/sample.md";
  const dest = "test-fixtures/sample-output.md";
  await fs.copyFile(src, dest);

  const files = await scanFiles([dest]);
  console.log(`Found ${files.length} file(s)\n`);

  for (const file of files) {
    console.log(`📄 ${file.path} — ${file.blocks.length} diagram(s)\n`);

    for (const block of file.blocks) {
      const canonical = canonicalizeDiagram(block.engine, block.source);
      const hashes = makeHashes({
        engine: block.engine,
        canonicalSource: canonical,
        renderConfig: { theme: "default", rendererVersion: "1" }
      });

      const result = mockApiResponse(hashes);

      console.log(`  Engine:        ${block.engine}`);
      console.log(`  CanonicalHash: ${hashes.canonicalHash}`);
      console.log(`  RenderHash:    ${hashes.renderHash}`);
      console.log(`  Image URL:     ${result.imageUrl}`);
      console.log(`  Interactive:   ${result.interactiveUrl}`);
      console.log();

      block.rendered = {
        ...result,
        canonicalHash: hashes.canonicalHash,
        renderHash: hashes.renderHash
      };
    }

    await rewriteMarkdownFile(file.path, file.blocks);
  }

  const output = await fs.readFile(dest, "utf8");
  console.log("=== Rewritten markdown ===\n");
  console.log(output);
}

main().catch(console.error);

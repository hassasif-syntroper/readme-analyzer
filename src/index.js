const core = require("@actions/core");
const { getInputs } = require("./inputs");
const { scanFiles } = require("./scan");
const { canonicalizeDiagram } = require("./canonicalize");
const { makeHashes } = require("./hashes");
const { uploadDiagram } = require("./syntroper-api");
const { rewriteMarkdownFile } = require("./markdown-rewrite");
const { maybeCommitChanges } = require("./git");
const { info } = require("./logger");
const { REWRITE_CHECK_ONLY } = require("./constants");

async function run() {
  try {
    const inputs = getInputs();

    info(`Scanning patterns: ${inputs.paths.join(", ")}`);
    const files = await scanFiles(inputs.paths);

    let diagramsFound = 0;
    let changed = false;

    for (const file of files) {
      info(`Processing ${file.path} (${file.blocks.length} diagram(s))`);

      for (const block of file.blocks) {
        diagramsFound += 1;

        const canonical = canonicalizeDiagram(block.engine, block.source);
        const hashes = makeHashes({
          engine: block.engine,
          canonicalSource: canonical,
          renderConfig: { theme: "default", rendererVersion: "1" }
        });

        const uploaded = await uploadDiagram({
          token: inputs.token,
          engine: block.engine,
          rawSource: block.source,
          canonicalSource: canonical,
          hashes,
          filePath: file.path,
          repository: process.env.GITHUB_REPOSITORY || "",
          commitSha: process.env.GITHUB_SHA || ""
        });

        block.rendered = {
          ...uploaded,
          canonicalHash: hashes.canonicalHash,
          renderHash: hashes.renderHash
        };
      }

      if (inputs.rewriteMode !== REWRITE_CHECK_ONLY) {
        const fileChanged = await rewriteMarkdownFile(file.path, file.blocks);
        changed = changed || fileChanged;
      }
    }

    if (changed && inputs.commitChanges) {
      await maybeCommitChanges(inputs.commitMessage);
    }

    info(`Done. Diagrams found: ${diagramsFound}, changed: ${changed}`);
    core.setOutput("changed", String(changed));
    core.setOutput("diagrams_found", String(diagramsFound));
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();

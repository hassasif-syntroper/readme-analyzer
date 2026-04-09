/**
 * index.js — Main orchestrator for the Syntroper GitHub Action.
 *
 * This is the ENTRYPOINT that GitHub Actions runs (via dist/index.js).
 * When a workflow triggers, GitHub does: node dist/index.js → which calls run().
 *
 * COMPLETE PIPELINE (in order):
 *   1. Read action inputs from workflow YAML (api_url, paths, etc.)     → inputs.js
 *   2. Scan markdown files for fenced diagram blocks (```mermaid...```) → scan.js
 *   3. For each block:
 *      a. Canonicalize the source (normalize whitespace)                → canonicalize.js
 *      b. Generate 3 identity hashes (canonical, render, raw)           → hashes.js
 *      c. Upload source to Syntroper API → get back image URL           → syntroper-api.js
 *   4. Rewrite markdown files: replace code blocks with image blocks    → markdown-rewrite.js
 *   5. Optionally commit and push the changes                           → git.js
 *
 * DATA FLOW:
 *   Workflow YAML → inputs → scanFiles → [canonicalize → hash → upload] per block → rewrite → commit
 *
 * ERROR HANDLING:
 *   Any unhandled error is caught and reported via core.setFailed(),
 *   which marks the GitHub Actions workflow step as failed (red X in the UI).
 *
 * OUTPUTS (available to subsequent workflow steps):
 *   - changed: "true" or "false" — whether any files were modified
 *   - diagrams_found: number of diagram blocks found across all files
 */
const core = require("@actions/core");                              // GitHub Actions toolkit (inputs, outputs, failure reporting)
const { getInputs } = require("./inputs");                          // Step 1: Read workflow inputs
const { scanFiles } = require("./scan");                            // Step 2: Find diagram blocks in markdown
const { canonicalizeDiagram } = require("./canonicalize");          // Step 3a: Normalize whitespace
const { makeHashes } = require("./hashes");                         // Step 3b: Generate identity hashes
const { uploadDiagram } = require("./syntroper-api");               // Step 3c: Upload to Syntroper API
const { rewriteMarkdownFile } = require("./markdown-rewrite");      // Step 4: Replace blocks with images
const { maybeCommitChanges } = require("./git");                    // Step 5: Git commit & push
const { info } = require("./logger");                               // Logging utility
const { REWRITE_CHECK_ONLY } = require("./constants");              // Constant for check-only mode

/**
 * run() — Main function. Executes the entire pipeline from start to finish.
 *
 * Takes NO parameters — everything comes from GitHub Actions inputs (environment variables).
 * This function is called once, at the bottom of this file: run();
 */
async function run() {
  try {
    // ── Step 1: Read inputs ───────────────────────────────────────────
    // Reads api_url, token, paths, rewrite_mode, commit_changes, commit_message
    // from the workflow YAML "with:" block via GitHub Actions environment variables.
    const inputs = getInputs();

    // ── Step 2: Scan markdown files ───────────────────────────────────
    // Find all markdown files matching the glob patterns (e.g. "README.md")
    // and extract fenced diagram blocks (```mermaid, ```plantuml, etc.)
    info(`Scanning patterns: ${inputs.paths.join(", ")}`);
    const files = await scanFiles(inputs.paths);
    // files = [{ path: "README.md", content: "...", blocks: [{ engine, source, ... }, ...] }]

    let diagramsFound = 0;  // Counter: total diagram blocks found across all files
    let changed = false;     // Flag: whether any file was actually modified

    // ── Step 3: Process each file and its diagram blocks ──────────────
    for (const file of files) {
      info(`Processing ${file.path} (${file.blocks.length} diagram(s))`);

      // Process each diagram block within this file
      for (const block of file.blocks) {
        diagramsFound += 1;

        // Step 3a: Canonicalize — normalize whitespace so formatting-only
        // edits produce the same hash (see canonicalize.js for details)
        const canonical = canonicalizeDiagram(block.engine, block.source);

        // Step 3b: Hash — generate 3 identity hashes for dedup and caching
        // renderConfig is currently static; will become configurable later
        const hashes = makeHashes({
          engine: block.engine,
          canonicalSource: canonical,
          renderConfig: { theme: "default", rendererVersion: "1" }
        });

        // Step 3c: Upload — POST the canonical source to Syntroper API
        // Returns: { diagramId, imageUrl, interactiveUrl }
        const uploaded = await uploadDiagram({
          apiUrl: inputs.apiUrl,        // e.g. "https://dev-api.syntroper.ai"
          token: inputs.token,          // Auth token (or empty string)
          engine: block.engine,         // e.g. "mermaid"
          rawSource: block.source,      // Original source (for reference)
          canonicalSource: canonical,   // Normalized source (sent to API)
          hashes                        // Hashes (used for logging)
        });

        // Attach the API response + hashes to the block object.
        // This data is used by markdown-rewrite.js to build the managed block.
        block.rendered = {
          ...uploaded,                          // { diagramId, imageUrl, interactiveUrl }
          canonicalHash: hashes.canonicalHash,  // For the metadata HTML comment
          renderHash: hashes.renderHash         // For the metadata HTML comment
        };
      }

      // ── Step 4: Rewrite the markdown file ─────────────────────────────
      // Replace all ```mermaid blocks with managed blocks (image + metadata).
      // Skip if mode is "check_only" (upload only, don't modify files).
      if (inputs.rewriteMode !== REWRITE_CHECK_ONLY) {
        const fileChanged = await rewriteMarkdownFile(file.path, file.blocks);
        changed = changed || fileChanged;  // Track if ANY file was modified
      }
    }

    // ── Step 5: Commit and push (optional) ────────────────────────────
    // Only commits if: (a) at least one file was modified, AND (b) commit_changes is "true"
    if (changed && inputs.commitChanges) {
      await maybeCommitChanges(inputs.commitMessage);
    }

    // ── Report results ────────────────────────────────────────────────
    info(`Done. Diagrams found: ${diagramsFound}, changed: ${changed}`);

    // Set GitHub Actions outputs — these can be used by subsequent workflow steps.
    // Example: if: steps.diagrams.outputs.changed == 'true'
    core.setOutput("changed", String(changed));
    core.setOutput("diagrams_found", String(diagramsFound));
  } catch (error) {
    // If anything fails, mark the workflow step as failed.
    // This shows a red X in the GitHub Actions UI and stops the workflow.
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

// ── Execute ─────────────────────────────────────────────────────────────
// This is the actual entrypoint. When GitHub runs "node dist/index.js",
// this line kicks off the entire pipeline.
run();

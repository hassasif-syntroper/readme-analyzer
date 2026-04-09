/**
 * inputs.js — Reads and validates GitHub Action inputs.
 *
 * Inputs are defined in action.yml and provided by users in their workflow YAML.
 * This module parses them into a clean JS object used by index.js.
 *
 * Example workflow YAML that provides these inputs:
 *   - uses: hassasif-syntroper/readme-analyzer@main
 *     with:
 *       api_url: "https://dev-api.syntroper.ai"
 *       paths: |
 *         README.md
 *         docs/*.md
 *       rewrite_mode: managed_blocks
 *       commit_changes: "true"
 *
 * Input descriptions:
 *   - api_url:        Syntroper API base URL (required). e.g. "https://dev-api.syntroper.ai"
 *   - token:          Syntroper API auth token (optional). Used for authenticated API calls.
 *   - paths:          Newline-separated glob patterns for markdown files to scan.
 *   - rewrite_mode:   "managed_blocks" = replace diagram blocks with images.
 *                     "check_only" = upload to API but don't modify files.
 *   - commit_changes: "true" = auto-commit and push changes. "false" = only modify files locally.
 *   - commit_message: Custom commit message for the auto-commit.
 *
 * Used by: index.js (called once at the start of run())
 */
const core = require("@actions/core");  // GitHub Actions toolkit for reading inputs

/**
 * splitLines() — Splits a multi-line string into an array of non-empty trimmed lines.
 *
 * GitHub Actions passes multi-line inputs as a single string with newlines.
 * For example, the "paths" input might be:
 *   "README.md\ndocs/*.md\n"
 * This function converts that to: ["README.md", "docs/*.md"]
 *
 * @param {string} value - The raw multi-line string from the action input
 * @returns {string[]} Array of non-empty, trimmed lines
 */
function splitLines(value) {
  return value
    .split(/\r?\n/)       // Split on newlines (handles both \n and \r\n)
    .map(s => s.trim())   // Remove leading/trailing whitespace from each line
    .filter(Boolean);     // Remove empty lines (empty string is falsy)
}

/**
 * getInputs() — Reads all action inputs and returns them as a typed object.
 *
 * core.getInput() reads from the environment variables that GitHub Actions
 * sets based on the workflow YAML "with:" block. The env var format is:
 *   INPUT_API_URL, INPUT_TOKEN, INPUT_PATHS, etc.
 *
 * @returns {{ apiUrl: string, token: string, paths: string[], rewriteMode: string, commitChanges: boolean, commitMessage: string }}
 */
function getInputs() {
  // Required: the Syntroper API base URL (e.g. "https://dev-api.syntroper.ai")
  // The action will POST diagram source to {apiUrl}/v1/diagrams/import
  const apiUrl = core.getInput("api_url", { required: true });

  // Optional: API authentication token. If provided, sent as "Bearer <token>" header.
  // Falls back to empty string (no auth) if not provided.
  const token = core.getInput("token") || "";

  // Required: glob patterns for which markdown files to scan for diagram blocks.
  // Split from multi-line string into array: "README.md\ndocs/*.md" → ["README.md", "docs/*.md"]
  const paths = splitLines(core.getInput("paths"));

  // Optional: controls what happens after uploading diagrams to the API.
  // "managed_blocks" (default) = replace ```mermaid blocks with image + metadata.
  // "check_only" = upload diagrams but don't modify any files.
  const rewriteMode = core.getInput("rewrite_mode") || "managed_blocks";

  // Optional: whether to auto-commit and push the rewritten files.
  // Defaults to "false". Only "true" (string) enables it.
  const commitChanges = (core.getInput("commit_changes") || "false") === "true";

  // Optional: custom git commit message for the auto-commit.
  // Only used when commitChanges is true.
  const commitMessage = core.getInput("commit_message") || "chore: update Syntroper diagrams";

  return { apiUrl, token, paths, rewriteMode, commitChanges, commitMessage };
}

module.exports = { getInputs };

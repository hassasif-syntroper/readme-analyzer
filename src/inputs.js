/**
 * inputs.js — Reads and validates GitHub Action inputs.
 *
 * Inputs are defined in action.yml and provided by users in their workflow YAML.
 * This module parses them into a clean object used by index.js.
 *
 * Inputs:
 *   - api_url:        Syntroper API endpoint URL (required)
 *   - token:          Syntroper API token (optional, for auth)
 *   - paths:          Newline-separated glob patterns for markdown files to scan
 *   - rewrite_mode:   "managed_blocks" (replace diagrams) or "check_only" (upload only)
 *   - commit_changes: Whether to git commit/push modified files
 *   - commit_message: Custom commit message
 */
const core = require("@actions/core");

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function getInputs() {
  const apiUrl = core.getInput("api_url", { required: true });
  const token = core.getInput("token") || "";
  const paths = splitLines(core.getInput("paths"));
  const rewriteMode = core.getInput("rewrite_mode") || "managed_blocks";
  const commitChanges = (core.getInput("commit_changes") || "false") === "true";
  const commitMessage = core.getInput("commit_message") || "chore: update Syntroper diagrams";

  return { apiUrl, token, paths, rewriteMode, commitChanges, commitMessage };
}

module.exports = { getInputs };

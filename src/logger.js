/**
 * logger.js — Thin logging wrappers over @actions/core.
 *
 * Centralizes all log calls so we can control formatting in one place.
 * In GitHub Actions, these appear in the workflow run log output panel.
 *
 * Why wrap @actions/core instead of using it directly?
 *   - Single place to change log format (e.g. add timestamps, prefixes)
 *   - Easier to swap out for testing (mock this module, not @actions/core)
 *   - Keeps other modules decoupled from the GitHub Actions SDK
 *
 * Used by: index.js, syntroper-api.js, git.js
 */
const core = require("@actions/core");  // GitHub Actions toolkit for logging

/**
 * info() — Log an informational message.
 * Shows as a normal line in the GitHub Actions workflow log.
 * @param {string} message - The message to log
 */
function info(message) {
  core.info(message);  // Writes to stdout in the Actions runner
}

/**
 * warning() — Log a warning message.
 * Shows as a yellow warning annotation in the GitHub Actions UI.
 * @param {string} message - The warning message to log
 */
function warning(message) {
  core.warning(message);  // Creates a warning annotation in the Actions UI
}

module.exports = { info, warning };

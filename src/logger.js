/**
 * logger.js — Thin logging wrappers over @actions/core.
 *
 * Centralizes log calls so we can control formatting in one place.
 * In GitHub Actions, these appear in the workflow run log output.
 */
const core = require("@actions/core");

function info(message) {
  core.info(message);
}

function warning(message) {
  core.warning(message);
}

module.exports = { info, warning };

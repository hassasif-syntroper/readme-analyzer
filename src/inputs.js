const core = require("@actions/core");

function splitLines(value) {
  return value
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function getInputs() {
  const token = core.getInput("token", { required: true });
  const paths = splitLines(core.getInput("paths"));
  const rewriteMode = core.getInput("rewrite_mode") || "managed_blocks";
  const commitChanges = (core.getInput("commit_changes") || "false") === "true";
  const commitMessage = core.getInput("commit_message") || "chore: update Syntroper diagrams";

  return { token, paths, rewriteMode, commitChanges, commitMessage };
}

module.exports = { getInputs };

/**
 * git.js — Optional git commit/push helper.
 *
 * When the action input commit_changes=true, this module commits the
 * rewritten markdown files and pushes them back to the repository.
 *
 * Uses the standard github-actions[bot] user identity so commits
 * are attributed to the bot, not a human user.
 *
 * This is opt-in — many users prefer to have the action only modify
 * files in the working directory and handle committing themselves
 * (e.g. via a separate step or a PR-based workflow).
 */
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const execFileAsync = promisify(execFile);
const { info } = require("./logger");

async function maybeCommitChanges(message) {
  info("Configuring git user for commit…");
  await execFileAsync("git", ["config", "user.name", "github-actions[bot]"]);
  await execFileAsync("git", [
    "config",
    "user.email",
    "41898282+github-actions[bot]@users.noreply.github.com"
  ]);
  await execFileAsync("git", ["add", "."]);
  try {
    await execFileAsync("git", ["commit", "-m", message]);
    await execFileAsync("git", ["push"]);
    info("Committed and pushed diagram changes.");
  } catch {
    info("Nothing to commit.");
  }
}

module.exports = { maybeCommitChanges };

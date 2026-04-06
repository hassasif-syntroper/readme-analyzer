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

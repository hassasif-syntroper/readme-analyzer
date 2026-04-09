/**
 * git.js — Optional git commit/push helper.
 *
 * When the action input commit_changes=true, this module commits the
 * rewritten markdown files and pushes them back to the repository.
 *
 * HOW IT WORKS:
 *   1. Configure git user identity as github-actions[bot]
 *   2. Stage all changed files (git add .)
 *   3. Commit with the provided message
 *   4. Push to the remote (origin)
 *
 * WHY github-actions[bot]?
 *   - Commits are attributed to the GitHub Actions bot, not a human user
 *   - The bot ID (41898282) is GitHub's official bot user ID
 *   - This is the standard pattern used by most GitHub Actions that commit changes
 *
 * IMPORTANT: This is opt-in via the commit_changes input.
 *   - Many users prefer to handle committing themselves (e.g. via a separate
 *     workflow step or a PR-based workflow)
 *   - The action only calls this function if commitChanges === true AND
 *     at least one file was actually modified
 *
 * PERMISSIONS: The workflow must have "contents: write" permission for push to work.
 *   Example workflow YAML:
 *     permissions:
 *       contents: write
 *
 * Used by: index.js (called at the end of run() if files were changed and commit is enabled)
 */
const { execFile } = require("node:child_process");  // Node.js child process (for running shell commands)
const { promisify } = require("node:util");           // Convert callback-based functions to promise-based
const execFileAsync = promisify(execFile);             // Promise-based version of execFile
const { info } = require("./logger");                  // Logging utility

/**
 * maybeCommitChanges() — Commit and push all modified files.
 *
 * Called "maybe" because the try/catch around commit handles the case
 * where there are no actual changes to commit (git commit would fail).
 *
 * @param {string} message - Commit message (e.g. "chore: update Syntroper diagrams")
 */
async function maybeCommitChanges(message) {
  // ── Step 1: Configure git identity ──────────────────────────────────
  // GitHub Actions runners start with no git user configured.
  // We must set user.name and user.email before committing.
  info("Configuring git user for commit…");
  await execFileAsync("git", ["config", "user.name", "github-actions[bot]"]);  // Bot username
  await execFileAsync("git", [
    "config",
    "user.email",
    "41898282+github-actions[bot]@users.noreply.github.com"  // Official GitHub bot email
  ]);

  // ── Step 2: Stage all changes ───────────────────────────────────────
  // "git add ." stages ALL modified files in the working directory.
  // This includes the rewritten markdown files (README.md, docs/*.md, etc.)
  await execFileAsync("git", ["add", "."]);

  // ── Step 3: Commit and push ─────────────────────────────────────────
  try {
    await execFileAsync("git", ["commit", "-m", message]);  // Create a commit with the given message
    await execFileAsync("git", ["push"]);                    // Push to the remote repository
    info("Committed and pushed diagram changes.");
  } catch {
    // If there are no staged changes, "git commit" exits with a non-zero code.
    // This is normal — it means the rewritten content was identical to what was
    // already on disk (e.g. the diagrams were already up to date).
    info("Nothing to commit.");
  }
}

module.exports = { maybeCommitChanges };

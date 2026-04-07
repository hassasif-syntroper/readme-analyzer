# Syntroper GitHub Diagram Action

A GitHub Action that detects diagram code blocks in your markdown files, sends them to the Syntroper API for rendering, and replaces them with hosted image links and interactive metadata.

## How It Works

```
Push commit with diagrams in markdown
        │
        ▼
GitHub triggers this action
        │
        ▼
1. SCAN ─── Find markdown files, extract fenced diagram blocks
        │
        ▼
2. CANONICALIZE ─── Normalize whitespace to produce stable identity
        │
        ▼
3. HASH ─── Generate canonicalHash + renderHash (SHA-256)
        │
        ▼
4. UPLOAD ─── POST diagram source to Syntroper API
        │        → API renders diagram server-side
        │        ← API returns { diagramId, imageUrl, interactiveUrl }
        │
        ▼
5. REWRITE ─── Replace ```engine blocks with image + metadata markers
        │
        ▼
6. COMMIT (optional) ─── Push changes back to the repo
```

The action does **not** render diagrams itself. It sends the diagram source and engine type to the Syntroper API, which handles all rendering server-side and returns an image URL. That URL is what gets embedded in the markdown.

## Supported Diagram Types

| Fence tag | Engine | Description |
|-----------|--------|-------------|
| `mermaid` | mermaid | Flowcharts, sequence diagrams, etc. |
| `plantuml`, `puml` | plantuml | UML diagrams |
| `ditaa` | ditaa | ASCII art to diagram |
| `ascii` | ascii | Generic ASCII art |

All types go through the same Syntroper API — no client-side rendering logic per engine.

To add a new diagram type, add the fence tag to `FENCE_TAG_MAP` in `src/constants.js`. The API handles the rest.

## Quick Start

Add this workflow to your repository at `.github/workflows/syntroper-diagrams.yml`:

```yaml
name: Syntroper Diagrams

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: write

jobs:
  diagrams:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hassasif-syntroper/readme-analyzer@main
        with:
          token: ${{ secrets.SYNTROPER_TOKEN }}
          paths: |
            README.md
            docs/**/*.md
          rewrite_mode: managed_blocks
          commit_changes: "true"
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `token` | Yes | — | Syntroper API token |
| `paths` | No | `README.md\ndocs/**/*.md` | Newline-separated glob patterns to scan |
| `rewrite_mode` | No | `managed_blocks` | `managed_blocks` or `check_only` |
| `commit_changes` | No | `false` | Whether to commit generated changes |
| `commit_message` | No | `chore: update Syntroper diagrams` | Commit message when `commit_changes=true` |

## Outputs

| Output | Description |
|--------|-------------|
| `changed` | `true` if any files were modified |
| `diagrams_found` | Number of diagram blocks detected |

## Rewrite Modes

- **`managed_blocks`** — Replaces fenced code blocks with a managed block containing a static image link, interactive URL, and metadata markers
- **`check_only`** — Detects and uploads diagrams without modifying any files

## What The Rewritten Markdown Looks Like

Before (in your source):

````md
```mermaid
graph TD
  A --> B
```
````

After (rewritten by the action):

```md
<!-- syntroper:start -->
[![Diagram](https://cdn.syntroper.com/d/abc123.svg)](https://syntroper.com/d/diag_456)

Open interactive version on Syntroper.
Use the Syntroper browser extension for inline interactive mode.
<!-- syntroper:diagram canonical=abc... render=def... id=diag_456 engine=mermaid -->
<!-- syntroper:end -->
```

The `<!-- syntroper:diagram ... -->` comment contains metadata for the browser extension and future re-runs.

## How Identity & Hashing Works

The action uses a three-level identity model:

| Hash | What it hashes | Purpose |
|------|---------------|---------|
| **rawSourceHash** | Canonicalized source text | Exact source tracking |
| **canonicalHash** | Engine + canonical source | Primary diagram ID, deduplication |
| **renderHash** | Engine + canonicalHash + render config | Asset cache key |

**Conservative canonicalization** normalizes only safe formatting differences:
- CRLF → LF
- Trailing whitespace per line
- Multiple blank lines → single blank line
- Leading/trailing blank lines trimmed

This means:
- Whitespace-only edits don't create duplicate diagram entries
- Same diagram in multiple repos gets the same canonicalHash
- Renderer config changes (theme, version) only invalidate render assets

We intentionally do **not** normalize indentation, reorder statements, strip comments, or modify content inside quoted strings — those could change diagram semantics.

## Project Structure

```
├── action.yml              ← Action metadata (inputs, outputs, runtime)
├── package.json            ← Dependencies and build scripts
├── src/
│   ├── index.js            ← Main orchestrator — wires all modules together
│   ├── inputs.js           ← Reads/validates action inputs from workflow YAML
│   ├── scan.js             ← Globs markdown files, extracts diagram blocks via regex
│   ├── canonicalize.js     ← Normalizes diagram source for stable hashing
│   ├── hashes.js           ← Generates rawSourceHash, canonicalHash, renderHash
│   ├── syntroper-api.js    ← POSTs diagram data to Syntroper API, gets back URLs
│   ├── markdown-rewrite.js ← Replaces code blocks with managed image blocks
│   ├── git.js              ← Optional git commit/push helper
│   ├── logger.js           ← Logging wrappers over @actions/core
│   └── constants.js        ← Engine names, fence tag map, config
├── dist/
│   └── index.js            ← Bundled entrypoint (generated by ncc, committed)
├── test/
│   ├── canonicalize.test.js
│   ├── scan.test.js
│   └── markdown-rewrite.test.js
├── test-fixtures/           ← Sample markdown for local testing
├── test-local.js            ← Run locally: node test-local.js
├── examples/
│   ├── syntroper-diagrams.yml  ← Copy-paste workflow for users
│   └── .syntroper.yml          ← Optional config file (future)
└── .github/workflows/
    ├── ci.yml               ← Tests + build on every push/PR
    └── release.yml          ← Build on tag push
```

## Local Development

```bash
npm install          # Install dependencies
npm test             # Run all tests (node:test runner)
npm run build        # Bundle src/ into dist/index.js via ncc
node test-local.js   # Run end-to-end on test-fixtures/sample.md
```

## Setup

1. Sign up at [syntroper.com](https://syntroper.com) and get an API token
2. Add the token as a repository secret named `SYNTROPER_TOKEN`
3. Add the workflow file shown above to your repo
4. Push a commit containing any supported diagram type
5. The action scans, uploads to Syntroper, and rewrites your markdown

## License

MIT

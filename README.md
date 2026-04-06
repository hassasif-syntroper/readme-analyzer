# Syntroper GitHub Diagram Action

A GitHub Action that renders Mermaid and PlantUML diagram blocks in your markdown files to Syntroper-hosted interactive diagrams.

## Features

- Scans markdown files for fenced `mermaid`, `plantuml`, and `puml` code blocks
- Conservative canonicalization for stable diagram identity across formatting changes
- Three-level hashing: raw source, canonical, and render identity
- Replaces diagram blocks with static image + interactive link
- Optional auto-commit of changes

## Quick Start

Add this workflow to your repository at `.github/workflows/syntroper-diagrams.yml`:

```yaml
name: Syntroper Diagrams

on:
  push:
    branches: [main]
  pull_request:

jobs:
  diagrams:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: syntroper/github-diagram-action@v1
        with:
          token: ${{ secrets.SYNTROPER_TOKEN }}
          paths: |
            README.md
            docs/**/*.md
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

- **`managed_blocks`** — Replaces fenced code blocks with a managed block containing a static image link and interactive URL
- **`check_only`** — Detects and uploads diagrams without modifying any files

## How Identity Works

The action uses a three-level identity model to avoid duplicate work:

1. **Raw source hash** — exact bytes of the diagram block (for provenance)
2. **Canonical hash** — normalized source after removing formatting-only differences (for deduplication)
3. **Render hash** — canonical hash + rendering config (for asset caching)

Conservative canonicalization normalizes:
- Line endings (CRLF → LF)
- Trailing whitespace
- Repeated blank lines
- Leading/trailing blank lines

This means whitespace-only edits to your diagrams won't create duplicate diagram entries.

## Setup

1. Sign up at [syntroper.com](https://syntroper.com) and get an API token
2. Add the token as a repository secret named `SYNTROPER_TOKEN`
3. Add the workflow file shown above
4. Push a commit containing a Mermaid or PlantUML diagram

## License

MIT

# Syntroper Browser Extension

Replaces static Syntroper diagram images on GitHub with interactive, zoomable embeds.

## How it works

1. When you visit a GitHub repo with Syntroper-managed diagrams, the extension detects `<!-- syntroper:start -->` / `<!-- syntroper:end -->` blocks in the rendered README.
2. It parses the metadata comment (`<!-- syntroper:diagram id=... engine=... -->`) to get the diagram ID.
3. It replaces the static PNG image with an interactive iframe from `https://dev-api.syntroper.ai/embed/{id}`.
4. On GitHub SPA navigation (Turbo), it re-scans automatically.

## Install (development)

### Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder

### Firefox
1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/manifest.json`

## Files

- **manifest.json** — Manifest V3 config (permissions, content script registration)
- **content.js** — Content script that detects and replaces managed blocks
- **content.css** — Styles for the interactive embed container
- **icons/** — Extension icons (16, 48, 128px)

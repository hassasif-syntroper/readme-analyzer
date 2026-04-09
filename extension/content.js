/**
 * content.js — Syntroper Browser Extension Content Script
 *
 * This script runs on GitHub pages and detects Syntroper managed blocks
 * in README files. It replaces the static diagram image with an interactive
 * iframe embed from Syntroper.
 *
 * HOW IT WORKS:
 *   1. Scan the page for HTML comments: <!-- syntroper:start --> ... <!-- syntroper:end -->
 *   2. Parse metadata from <!-- syntroper:diagram canonical=... id=... engine=... -->
 *   3. Replace the static image + text with an interactive iframe
 *   4. Re-scan on GitHub SPA navigation (turbo:load, pjax events)
 *
 * MANAGED BLOCK FORMAT (in the rendered HTML):
 *   GitHub renders the markdown managed block as:
 *     - The <!-- syntroper:start --> and <!-- syntroper:end --> become HTML comment nodes
 *     - The image becomes an <a><img></a> element
 *     - The text lines become <p> elements
 *     - The <!-- syntroper:diagram ... --> becomes an HTML comment node
 *
 *   We walk the DOM between start/end comments, extract the diagram ID,
 *   and replace everything with an iframe.
 *
 * EMBED URL:
 *   https://dev-api.syntroper.ai/embed/{diagram_id}
 */

(function () {
  "use strict";

  // ── Configuration ───────────────────────────────────────────────────
  const EMBED_BASE_URL = "https://dev-api.syntroper.ai";
  const PROCESSED_ATTR = "data-syntroper-processed";

  /**
   * parseMetadataComment() — Extract metadata from a syntroper:diagram comment.
   *
   * Input:  "syntroper:diagram canonical=abc123 render=def456 id=uuid-here engine=mermaid"
   * Output: { canonical: "abc123", render: "def456", id: "uuid-here", engine: "mermaid" }
   *
   * @param {string} text - The comment text content
   * @returns {Object|null} Parsed metadata or null if not a syntroper comment
   */
  function parseMetadataComment(text) {
    const trimmed = text.trim();
    if (!trimmed.startsWith("syntroper:diagram")) return null;

    const metadata = {};
    // Match key=value pairs (value is everything up to the next space+key= or end of string)
    const regex = /(\w+)=([\S]+)/g;
    let match;
    while ((match = regex.exec(trimmed)) !== null) {
      metadata[match[1]] = match[2];
    }
    return metadata;
  }

  /**
   * findManagedBlocks() — Scan the DOM for syntroper managed blocks.
   *
   * Walks through all comment nodes in the document looking for
   * <!-- syntroper:start --> markers. For each one found, collects all
   * sibling nodes until <!-- syntroper:end --> and extracts metadata.
   *
   * @returns {Array<{ startComment: Comment, endComment: Comment, innerNodes: Node[], metadata: Object }>}
   */
  function findManagedBlocks() {
    const blocks = [];

    // TreeWalker is the most efficient way to find comment nodes in the DOM.
    // NodeFilter.SHOW_COMMENT = only visit comment nodes (skip elements, text, etc.)
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT,
      null
    );

    let node;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue.trim();

      // Look for <!-- syntroper:start -->
      if (text !== "syntroper:start") continue;

      const startComment = node;
      const innerNodes = [];
      let metadata = null;
      let endComment = null;

      // Walk forward through siblings to find the end comment and metadata
      let sibling = startComment.nextSibling;
      while (sibling) {
        if (sibling.nodeType === Node.COMMENT_NODE) {
          const sibText = sibling.nodeValue.trim();

          // Found metadata comment: <!-- syntroper:diagram canonical=... id=... -->
          if (sibText.startsWith("syntroper:diagram")) {
            metadata = parseMetadataComment(sibText);
            innerNodes.push(sibling);
          }
          // Found end comment: <!-- syntroper:end -->
          else if (sibText === "syntroper:end") {
            endComment = sibling;
            break;
          } else {
            innerNodes.push(sibling);
          }
        } else {
          innerNodes.push(sibling);
        }
        sibling = sibling.nextSibling;
      }

      // Only process if we found both metadata and end marker
      if (metadata && metadata.id && endComment) {
        blocks.push({ startComment, endComment, innerNodes, metadata });
      }
    }

    return blocks;
  }

  /**
   * createInteractiveEmbed() — Build the interactive iframe container.
   *
   * Creates a div with:
   *   - A loading indicator
   *   - An iframe pointing to the Syntroper embed URL
   *   - A Syntroper badge (visible on hover)
   *
   * @param {Object} metadata - Parsed metadata { id, engine, canonical, render }
   * @returns {HTMLElement} The container div element
   */
  function createInteractiveEmbed(metadata) {
    const container = document.createElement("div");
    container.className = "syntroper-interactive";
    container.setAttribute("data-diagram-id", metadata.id);
    container.setAttribute("data-engine", metadata.engine || "");

    // Loading indicator
    const loading = document.createElement("div");
    loading.className = "syntroper-loading";
    loading.textContent = "Loading interactive diagram…";
    container.appendChild(loading);

    // Badge
    const badge = document.createElement("div");
    badge.className = "syntroper-badge";
    badge.textContent = "Syntroper";
    container.appendChild(badge);

    // Iframe
    const iframe = document.createElement("iframe");
    iframe.src = `${EMBED_BASE_URL}/embed/${metadata.id}`;
    iframe.title = `Interactive ${metadata.engine || "diagram"} diagram`;
    iframe.loading = "lazy";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    iframe.addEventListener("load", function () {
      container.classList.add("syntroper-loaded");
    });
    container.appendChild(iframe);

    return container;
  }

  /**
   * processManagedBlocks() — Main function. Find and replace all managed blocks.
   *
   * For each managed block found:
   *   1. Skip if already processed (avoid double-processing on re-scans)
   *   2. Create an interactive iframe embed
   *   3. Remove the original inner nodes (image, text, metadata comment)
   *   4. Insert the iframe container between start and end comments
   */
  function processManagedBlocks() {
    const blocks = findManagedBlocks();

    for (const block of blocks) {
      // Skip already-processed blocks
      if (block.startComment[PROCESSED_ATTR]) continue;
      block.startComment[PROCESSED_ATTR] = true;

      // Create the interactive embed
      const embed = createInteractiveEmbed(block.metadata);

      // Remove all original inner nodes (image link, text paragraphs, metadata comment)
      for (const node of block.innerNodes) {
        node.parentNode?.removeChild(node);
      }

      // Insert the iframe container right before the end comment
      block.endComment.parentNode.insertBefore(embed, block.endComment);
    }

    if (blocks.length > 0) {
      console.log(`[Syntroper] Replaced ${blocks.length} diagram(s) with interactive embeds.`);
    }
  }

  // ── Initial scan ────────────────────────────────────────────────────
  // Run once when the page loads
  processManagedBlocks();

  // ── GitHub SPA navigation handling ──────────────────────────────────
  // GitHub uses Turbo (formerly Turbolinks) for client-side navigation.
  // When the user clicks a link, the page content changes without a full
  // page reload, so our content script doesn't re-run. We listen for
  // Turbo's navigation events and re-scan the page.

  // Turbo (modern GitHub)
  document.addEventListener("turbo:load", function () {
    processManagedBlocks();
  });

  // Also observe DOM mutations for dynamically loaded content
  // (e.g. README tab loaded lazily, file preview, PR description)
  const observer = new MutationObserver(function (mutations) {
    // Only re-scan if new nodes were added (not just attribute changes)
    let hasNewNodes = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        hasNewNodes = true;
        break;
      }
    }
    if (hasNewNodes) {
      processManagedBlocks();
    }
  });

  // Observe the main content area (not the entire body, for performance)
  const target = document.querySelector("#js-repo-pjax-container") ||
                 document.querySelector("[data-turbo-body]") ||
                 document.querySelector("main") ||
                 document.body;

  observer.observe(target, {
    childList: true,
    subtree: true
  });

})();

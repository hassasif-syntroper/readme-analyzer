/**
 * content.js — Syntroper Browser Extension Content Script
 *
 * This script runs on GitHub pages and detects Syntroper managed blocks
 * in README files. It replaces the static diagram image with an interactive
 * iframe embed from Syntroper.
 *
 * WHY URL-BASED DETECTION:
 *   GitHub's markdown renderer STRIPS HTML comments from rendered output.
 *   So <!-- syntroper:start --> and <!-- syntroper:diagram ... --> do NOT
 *   exist in the DOM. Instead, we detect diagrams by their image URL pattern:
 *     https://snt-dev-media.s3.ap-southeast-2.amazonaws.com/external-embeds/{UUID}.png
 *   The UUID in the URL IS the diagram ID.
 *
 * HOW IT WORKS:
 *   1. Find all <img> elements whose src matches the Syntroper S3 URL pattern
 *   2. Extract the diagram UUID from the URL
 *   3. Find the parent <a> link and nearby "Syntroper" text paragraphs
 *   4. Replace the image block with an interactive iframe
 *   5. Re-scan on GitHub SPA navigation (turbo:load + MutationObserver)
 *
 * EMBED URL:
 *   https://dev-api.syntroper.ai/embed/{diagram_id}
 */

(function () {
  "use strict";

  // ── Guard against double-injection ─────────────────────────────────
  // The background service worker may inject this script into already-open
  // tabs on install/update, AND the manifest content_scripts entry will
  // also inject it on new page loads. This flag prevents running twice.
  if (window.__syntroperLoaded) return;
  window.__syntroperLoaded = true;

  // ── Configuration ───────────────────────────────────────────────────
  const EMBED_BASE_URL = "https://dev-api.syntroper.ai";
  const PROCESSED_ATTR = "data-syntroper-processed";

  // Regex to match Syntroper S3 embed image URLs and extract the UUID
  // Matches: https://snt-dev-media.s3.ap-southeast-2.amazonaws.com/external-embeds/{UUID}.png
  const SYNTROPER_IMG_RE = /snt-dev-media\.s3\.ap-southeast-2\.amazonaws\.com\/external-embeds\/([0-9a-f\-]{36})\.png/;

  /**
   * findSyntroperImages() — Scan the DOM for Syntroper diagram images.
   *
   * Looks for <img> elements inside the README/markdown body whose src
   * matches the Syntroper S3 URL pattern. For each match, collects:
   *   - The diagram UUID (from the URL)
   *   - The <a> parent wrapping the image
   *   - Nearby text nodes/paragraphs mentioning "Syntroper" (to remove)
   *
   * @returns {Array<{ diagramId: string, anchor: HTMLElement, nodesToRemove: Node[] }>}
   */
  function findSyntroperImages() {
    const results = [];

    // Search inside GitHub's markdown-rendered body
    const containers = document.querySelectorAll(
      ".markdown-body, .readme-content, article, .Box-body"
    );
    console.log("[Syntroper DEBUG] Found containers:", containers.length);
    if (containers.length === 0) return results;

    for (const container of containers) {
      const images = container.querySelectorAll("img");
      console.log("[Syntroper DEBUG] Found images in container:", images.length);

      for (const img of images) {
        // Skip already-processed images
        if (img.getAttribute(PROCESSED_ATTR)) continue;

        // GitHub proxies external images through camo.githubusercontent.com
        // The original URL is preserved in data-canonical-src attribute.
        // Also check the parent <a> href which may contain the original URL.
        const src = img.getAttribute("src") || "";
        const canonicalSrc = img.getAttribute("data-canonical-src") || "";
        const parentHref = img.closest("a")?.getAttribute("href") || "";

        console.log("[Syntroper DEBUG] img src:", src.substring(0, 80));
        console.log("[Syntroper DEBUG] img data-canonical-src:", canonicalSrc.substring(0, 80));
        console.log("[Syntroper DEBUG] parent href:", parentHref.substring(0, 80));

        const match = SYNTROPER_IMG_RE.exec(canonicalSrc)
                   || SYNTROPER_IMG_RE.exec(src)
                   || SYNTROPER_IMG_RE.exec(parentHref);
        if (!match) continue;

        const diagramId = match[1];
        img.setAttribute(PROCESSED_ATTR, "true");

        // The image is typically wrapped in <a href="..."><img></a>
        const anchor = img.closest("a") || img;

        // Collect the anchor/image and nearby Syntroper text paragraphs
        // GitHub renders the managed block roughly as:
        //   <p><a><img></a></p>
        //   <p>Open interactive version on Syntroper.\n
        //      Use the Syntroper browser extension...</p>
        const wrapper = anchor.closest("p") || anchor;
        const nodesToRemove = [wrapper];

        // Look at following siblings for "Syntroper" text paragraphs
        let next = wrapper.nextElementSibling;
        while (next) {
          const text = next.textContent || "";
          if (text.includes("Syntroper") || text.includes("interactive")) {
            nodesToRemove.push(next);
            next = next.nextElementSibling;
          } else {
            break;
          }
        }

        results.push({ diagramId, anchor: wrapper, nodesToRemove });
      }
    }

    return results;
  }

  /**
   * createInteractiveEmbed() — Build the interactive iframe container.
   *
   * Creates a div with:
   *   - A loading indicator (shown until iframe loads)
   *   - An iframe pointing to the Syntroper embed URL
   *   - A Syntroper badge (visible on hover)
   *
   * @param {string} diagramId - The diagram UUID
   * @returns {HTMLElement} The container div element
   */
  function createInteractiveEmbed(diagramId) {
    const container = document.createElement("div");
    container.className = "syntroper-interactive";
    container.setAttribute("data-diagram-id", diagramId);

    // Loading indicator
    const loading = document.createElement("div");
    loading.className = "syntroper-loading";
    loading.textContent = "Loading interactive diagram…";
    container.appendChild(loading);

    // Badge (appears on hover)
    const badge = document.createElement("div");
    badge.className = "syntroper-badge";
    badge.textContent = "Syntroper";
    container.appendChild(badge);

    // Iframe — the actual interactive embed
    const iframe = document.createElement("iframe");
    iframe.src = `${EMBED_BASE_URL}/embed/${diagramId}`;
    iframe.title = "Interactive Syntroper diagram";
    iframe.loading = "lazy";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups");
    iframe.addEventListener("load", function () {
      container.classList.add("syntroper-loaded");
    });
    container.appendChild(iframe);

    return container;
  }

  /**
   * processDiagrams() — Main function. Find and replace all Syntroper images.
   *
   * For each Syntroper image found:
   *   1. Create an interactive iframe embed
   *   2. Insert it before the original image/text block
   *   3. Remove the original nodes (image, link, text paragraphs)
   */
  function processDiagrams() {
    const diagrams = findSyntroperImages();

    for (const { diagramId, anchor, nodesToRemove } of diagrams) {
      // Create the interactive embed
      const embed = createInteractiveEmbed(diagramId);

      // Insert the iframe before the first node to remove
      const firstNode = nodesToRemove[0];
      firstNode.parentNode.insertBefore(embed, firstNode);

      // Remove all original nodes (image wrapper + text paragraphs)
      for (const node of nodesToRemove) {
        node.parentNode?.removeChild(node);
      }
    }

    if (diagrams.length > 0) {
      console.log(`[Syntroper] Replaced ${diagrams.length} diagram(s) with interactive embeds.`);
    }
  }

  // ── Staggered scans ─────────────────────────────────────────────────
  // GitHub loads README content asynchronously after SPA navigation.
  // We schedule multiple scans at different delays to catch late-loading content.
  const pendingTimers = new Set();
  function scheduleScan(delayMs) {
    const id = setTimeout(function () {
      pendingTimers.delete(id);
      processDiagrams();
    }, delayMs || 300);
    pendingTimers.add(id);
  }

  // ── Initial scan ────────────────────────────────────────────────────
  processDiagrams();
  // Staggered re-scans in case README loads after initial paint
  scheduleScan(500);
  scheduleScan(1500);
  scheduleScan(3000);

  // ── GitHub SPA navigation handling ──────────────────────────────────
  // GitHub uses Turbo (formerly Turbolinks) for client-side navigation.
  // Content changes without a full page reload.

  // Turbo events (modern GitHub uses multiple)
  ["turbo:load", "turbo:render", "turbo:frame-load"].forEach(function (evt) {
    document.addEventListener(evt, function () {
      console.log("[Syntroper] Turbo event:", evt);
      scheduleScan(200);
      scheduleScan(1000); // second pass for lazy-loaded README
    });
  });

  // URL change detection via polling (catches all navigation types)
  let lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      console.log("[Syntroper] URL changed:", lastUrl, "→", location.href);
      lastUrl = location.href;
      scheduleScan(500);
      scheduleScan(1500);
      scheduleScan(3000);
    }
  }, 500);

  // MutationObserver on document.body — catches ALL dynamic content loading
  // (README tab, file preview, PR description, etc.)
  const observer = new MutationObserver(function (mutations) {
    let hasNewImages = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        // Check if the added node or its children contain images
        if (node.tagName === "IMG" || node.querySelector?.("img")) {
          hasNewImages = true;
          break;
        }
        // Also trigger if a markdown-body container was added
        if (node.classList?.contains("markdown-body") || node.querySelector?.(".markdown-body")) {
          hasNewImages = true;
          break;
        }
      }
      if (hasNewImages) break;
    }
    if (hasNewImages) {
      console.log("[Syntroper] New images/markdown detected in DOM");
      scheduleScan(100);
    }
  });

  // Observe the entire body to catch all dynamic changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

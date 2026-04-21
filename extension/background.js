/**
 * background.js — Syntroper Extension Service Worker
 *
 * When the extension is installed, updated, or enabled, content scripts
 * only auto-inject into NEW page loads. Any GitHub tabs that are already
 * open won't have the content script. This service worker fixes that by
 * programmatically injecting content.js + content.css into all open
 * GitHub tabs on install/update.
 */

chrome.runtime.onInstalled.addListener(async function (details) {
  console.log("[Syntroper BG] Extension installed/updated:", details.reason);

  // Find all open GitHub tabs
  const tabs = await chrome.tabs.query({ url: "https://github.com/*" });
  console.log("[Syntroper BG] Found", tabs.length, "open GitHub tab(s)");

  for (const tab of tabs) {
    try {
      // Inject the CSS first
      await chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"]
      });

      // Then inject the content script
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      console.log("[Syntroper BG] Injected into tab:", tab.id, tab.url);
    } catch (err) {
      // Tab might be a special page (e.g. github.com/settings) that blocks injection
      console.warn("[Syntroper BG] Could not inject into tab:", tab.id, err.message);
    }
  }
});

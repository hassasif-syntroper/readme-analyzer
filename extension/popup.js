/**
 * popup.js — Queries the active tab to count how many Syntroper
 * diagrams were replaced on the current page.
 */
(function () {
  const countEl = document.getElementById("count");

  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (!tabs[0]?.id) {
      countEl.textContent = "N/A";
      return;
    }

    chrome.scripting.executeScript(
      {
        target: { tabId: tabs[0].id },
        func: function () {
          return document.querySelectorAll(".syntroper-interactive").length;
        }
      },
      function (results) {
        if (chrome.runtime.lastError || !results || !results[0]) {
          countEl.textContent = "0";
        } else {
          const n = results[0].result || 0;
          countEl.textContent = n;
        }
      }
    );
  });
})();

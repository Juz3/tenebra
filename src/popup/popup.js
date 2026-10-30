/**
 * Tenebra popup - current-site 3-way toggle + global default switch +
 * an optional debug panel for development (shows the content script's
 * heuristic/state for the active tab).
 */
(function () {
  "use strict";

  const runtime = typeof browser !== "undefined" ? browser : chrome;
  const isNative = typeof browser !== "undefined";
  const { SITE_MODE } = self.TenebraStorage;

  const els = {
    host: document.getElementById("site-host"),
    always: document.getElementById("mode-always"),
    default: document.getElementById("mode-default"),
    never: document.getElementById("mode-never"),
    globalToggle: document.getElementById("global-toggle"),
    debugToggle: document.getElementById("debug-toggle"),
    debugInfo: document.getElementById("debug-info"),
  };

  const modeButtons = {
    [SITE_MODE.ALWAYS]: els.always,
    [SITE_MODE.DEFAULT]: els.default,
    [SITE_MODE.NEVER]: els.never,
  };

  let currentHostname = "";
  let currentTab = null;

  function setPressedMode(mode) {
    for (const [key, btn] of Object.entries(modeButtons)) {
      btn.setAttribute("aria-pressed", String(key === mode));
    }
  }

  async function getActiveTab() {
    const [tab] = await runtime.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tab;
  }

  /**
   * Cross-browser tabs.sendMessage: promise-based natively in Firefox,
   * callback-based in Chrome. Resolves to `null` (rather than rejecting)
   * when there's no content script to respond - e.g. a browser-internal
   * page, or a page that hasn't finished loading the content script yet -
   * since that's an expected, non-error outcome for the debug panel.
   */
  function requestDebugInfo(tabId) {
    const message = { type: "tenebra:get-debug-info" };
    if (isNative) {
      return runtime.tabs.sendMessage(tabId, message).catch(() => null);
    }
    return new Promise((resolve) => {
      runtime.tabs.sendMessage(tabId, message, (response) => {
        void runtime.runtime.lastError; // acknowledge to avoid an unchecked-error warning
        resolve(response || null);
      });
    });
  }

  function renderDebugInfo(info) {
    if (!info) {
      els.debugInfo.textContent =
        "No response from this page (browser-internal page, or the content script hasn't loaded here).";
      return;
    }
    els.debugInfo.textContent = [
      `hostname: ${info.hostname}`,
      `siteMode: ${info.siteMode}`,
      `globalDefault: ${info.globalDefault}`,
      `resolvedEnabled: ${info.resolvedEnabled}`,
      `pageLooksAlreadyDark: ${info.pageLooksAlreadyDark}`,
      `fallbackStylesheetActive: ${info.fallbackStylesheetActive}`,
      `siteOverrideApplied: ${info.siteOverrideApplied}`,
    ].join("\n");
  }

  /**
   * The content script updates its debugState only after it has finished
   * reacting to the storage write we just made (storage.onChanged fires
   * asynchronously, then refresh() awaits a few storage reads). Querying
   * debug info in the very same tick would race that and show stale
   * data, so give it a brief moment before re-querying.
   */
  function refreshDebugPanelSoon() {
    return new Promise((resolve) => {
      setTimeout(() => resolve(refreshDebugPanel()), 200);
    });
  }

  async function refreshDebugPanel() {
    const enabled = els.debugToggle.checked;
    els.debugInfo.hidden = !enabled;
    if (!enabled) return;
    if (!currentTab || !currentTab.id) {
      els.debugInfo.textContent = "No active tab.";
      return;
    }
    renderDebugInfo(await requestDebugInfo(currentTab.id));
  }

  async function init() {
    currentTab = await getActiveTab();
    if (currentTab && currentTab.url) {
      try {
        currentHostname = new URL(currentTab.url).hostname;
      } catch {
        currentHostname = "";
      }
    }

    els.host.textContent = currentHostname || "this page";

    const [siteMode, globalDefault, debugMode] = await Promise.all([
      currentHostname
        ? self.TenebraStorage.getSiteMode(currentHostname)
        : SITE_MODE.DEFAULT,
      self.TenebraStorage.getGlobalDefault(),
      self.TenebraStorage.getDebugMode(),
    ]);

    setPressedMode(siteMode);
    els.globalToggle.checked = globalDefault;
    els.debugToggle.checked = debugMode;

    if (!currentHostname) {
      els.always.disabled = true;
      els.never.disabled = true;
      els.default.disabled = true;
    }

    await refreshDebugPanel();
  }

  for (const [mode, btn] of Object.entries(modeButtons)) {
    btn.addEventListener("click", async () => {
      if (!currentHostname) return;
      await self.TenebraStorage.setSiteMode(currentHostname, mode);
      setPressedMode(mode);
      await refreshDebugPanelSoon();
    });
  }

  els.globalToggle.addEventListener("change", async () => {
    await self.TenebraStorage.setGlobalDefault(els.globalToggle.checked);
    await refreshDebugPanelSoon();
  });

  els.debugToggle.addEventListener("change", async () => {
    await self.TenebraStorage.setDebugMode(els.debugToggle.checked);
    await refreshDebugPanel();
  });

  init();
})();


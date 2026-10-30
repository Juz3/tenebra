/**
 * Tenebra background script (event page in Firefox, service worker in
 * Chrome - same source, per Section 6 of PLAN.md).
 *
 * Responsibilities: keep the toolbar icon's state in sync with the
 * current tab's effective dark-mode status. No polling, no timers -
 * purely event-driven off tab/storage events.
 */
// Chrome MV3 service workers load extra scripts via importScripts; Firefox
// (background.scripts is an array in manifest.firefox.json) already loads
// shared/storage.js before this file, so importScripts doesn't exist there.
if (typeof importScripts === "function") {
  importScripts("../shared/storage.js");
}

const runtime = typeof browser !== "undefined" ? browser : chrome;

async function updateActionState(tabId, hostname) {
  const enabled = await self.TenebraStorage.resolveDarkModeEnabled(hostname);
  const title = enabled
    ? "Tenebra - Dark mode on for this site"
    : "Tenebra - Dark mode off for this site";
  if (runtime.action && runtime.action.setTitle) {
    runtime.action.setTitle({ tabId, title });
  }
}

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

runtime.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) return;
  const hostname = hostnameFromUrl(tab.url);
  if (!hostname) return;
  updateActionState(tabId, hostname);
});

runtime.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await runtime.tabs.get(tabId);
  if (!tab || !tab.url) return;
  const hostname = hostnameFromUrl(tab.url);
  if (!hostname) return;
  updateActionState(tabId, hostname);
});

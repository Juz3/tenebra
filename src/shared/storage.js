/**
 * Tenebra - shared storage & cross-browser API shim.
 *
 * Firefox exposes a promise-based `browser.*` API natively. Chrome (MV3)
 * exposes a callback-based `chrome.*` API. This tiny shim normalizes just
 * the storage calls we need, so the rest of the codebase can use
 * `TenebraStorage` without caring which browser it's running in - no
 * dependency on the full `webextension-polyfill` package.
 *
 * Loaded as a plain script (not a module) in both content scripts and the
 * background/popup/options pages, so everything hangs off `self`/`window`.
 */
(function (root) {
  "use strict";

  const runtime =
    typeof browser !== "undefined"
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : undefined;
  const isNative = typeof browser !== "undefined";

  /**
   * @param {string[]} keys
   * @returns {Promise<object>}
   */
  function get(keys) {
    if (isNative) {
      return runtime.storage.local.get(keys);
    }
    return new Promise((resolve, reject) => {
      runtime.storage.local.get(keys, (result) => {
        const err = runtime.runtime.lastError;
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * @param {object} items
   * @returns {Promise<void>}
   */
  function set(items) {
    if (isNative) {
      return runtime.storage.local.set(items);
    }
    return new Promise((resolve, reject) => {
      runtime.storage.local.set(items, () => {
        const err = runtime.runtime.lastError;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * @param {string|string[]} keys
   * @returns {Promise<void>}
   */
  function remove(keys) {
    if (isNative) {
      return runtime.storage.local.remove(keys);
    }
    return new Promise((resolve, reject) => {
      runtime.storage.local.remove(keys, () => {
        const err = runtime.runtime.lastError;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  function onChanged(listener) {
    runtime.storage.onChanged.addListener(listener);
  }

  const GLOBAL_KEY = "tenebra_global_default";
  const SITE_PREFIX = "tenebra_site_";
  const DEBUG_MODE_KEY = "tenebra_debug_mode";

  /** Per-site override values. */
  const SITE_MODE = Object.freeze({
    ALWAYS: "always",
    NEVER: "never",
    DEFAULT: "default",
  });

  function siteKey(hostname) {
    return SITE_PREFIX + hostname;
  }

  /**
   * @returns {Promise<boolean>} whether dark mode is globally enabled by default
   */
  async function getGlobalDefault() {
    const result = await get([GLOBAL_KEY]);
    return typeof result[GLOBAL_KEY] === "boolean" ? result[GLOBAL_KEY] : true;
  }

  /**
   * @param {boolean} enabled
   */
  function setGlobalDefault(enabled) {
    return set({ [GLOBAL_KEY]: enabled });
  }

  /**
   * @param {string} hostname
   * @returns {Promise<string>} one of SITE_MODE values
   */
  async function getSiteMode(hostname) {
    const key = siteKey(hostname);
    const result = await get([key]);
    return result[key] || SITE_MODE.DEFAULT;
  }

  /**
   * @param {string} hostname
   * @param {string} mode one of SITE_MODE values
   */
  function setSiteMode(hostname, mode) {
    if (mode === SITE_MODE.DEFAULT) {
      return remove(siteKey(hostname));
    }
    return set({ [siteKey(hostname)]: mode });
  }

  /**
   * Resolves whether dark mode should be active for a given hostname,
   * combining the per-site override with the global default.
   * @param {string} hostname
   */
  async function resolveDarkModeEnabled(hostname) {
    const [siteMode, globalDefault] = await Promise.all([
      getSiteMode(hostname),
      getGlobalDefault(),
    ]);
    if (siteMode === SITE_MODE.ALWAYS) return true;
    if (siteMode === SITE_MODE.NEVER) return false;
    return globalDefault;
  }

  /**
   * @returns {Promise<object>} map of hostname -> mode, for all stored overrides
   */
  async function getAllSiteModes() {
    const all = await get(null);
    const result = {};
    for (const key of Object.keys(all || {})) {
      if (key.startsWith(SITE_PREFIX)) {
        result[key.slice(SITE_PREFIX.length)] = all[key];
      }
    }
    return result;
  }

  /**
   * Developer/debug mode: when enabled, the popup shows the effective
   * heuristic state (already-dark detection, resolved mode, etc.) for
   * the current site. Off by default; not a telemetry toggle - purely
   * local UI state.
   * @returns {Promise<boolean>}
   */
  async function getDebugMode() {
    const result = await get([DEBUG_MODE_KEY]);
    return Boolean(result[DEBUG_MODE_KEY]);
  }

  /**
   * @param {boolean} enabled
   */
  function setDebugMode(enabled) {
    return set({ [DEBUG_MODE_KEY]: Boolean(enabled) });
  }

  root.TenebraStorage = {
    SITE_MODE,
    getGlobalDefault,
    setGlobalDefault,
    getSiteMode,
    setSiteMode,
    resolveDarkModeEnabled,
    getDebugMode,
    setDebugMode,
    getAllSiteModes,
    onChanged,
    GLOBAL_KEY,
    SITE_PREFIX,
    DEBUG_MODE_KEY,
  };
})(typeof self !== "undefined" ? self : this);

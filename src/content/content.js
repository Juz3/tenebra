/**
 * Tenebra content script - applies/removes dark styling for the current
 * page based on stored per-site/global preferences.
 *
 * Strategy:
 * 1. Always set `color-scheme: dark` via a tiny inline style so native
 *    form controls/scrollbars and any `prefers-color-scheme`-aware site
 *    styling adapt immediately, before paint.
 * 2. Only enable the general fallback stylesheet (see dark-theme.css) if
 *    a cheap heuristic suggests the page is actually light - avoids
 *    double-darkening sites that already ship a dark theme.
 * 3. Layer in any per-site CSS patch from site-overrides.js.
 * 4. React to storage changes (options/popup toggles) without a reload.
 * 5. Respond to debug-info requests from the popup (see PLAN.md's debug
 *    toggle) so developers can inspect the heuristic's decision live.
 */
(function () {
  "use strict";

  const STYLE_ID = "tenebra-color-scheme-hint";
  const LINK_ID = "tenebra-dark-theme";
  const SITE_OVERRIDE_STYLE_ID = "tenebra-site-overrides";
  const BG_IMAGE_CLASS = "tenebra-bg-image-el";
  // Bounds the one-time background-image scan so a single very large page
  // can't cause a noticeable jank spike (see tagBackgroundImageElements).
  const MAX_BG_SCAN_ELEMENTS = 4000;

  // Cached across refresh() calls so that, once our own dark-theme.css is
  // enabled, its own html background override doesn't feed back into
  // pageLooksAlreadyDark() and make the page look "already dark" on a
  // later re-check (e.g. toggling dark mode off then on again without a
  // navigation). Reset per page load only.
  let cachedPageLooksLight = null;

  // Latest snapshot of applied state, exposed to the popup's debug panel
  // via runtime messaging (see the onMessage listener below).
  const debugState = {
    hostname: location.hostname,
    siteMode: null,
    globalDefault: null,
    resolvedEnabled: null,
    pageLooksAlreadyDark: null,
    fallbackStylesheetActive: false,
    siteOverrideApplied: false,
  };

  function ensureColorSchemeHint() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = ":root{color-scheme:dark;}";
    (document.head || document.documentElement).appendChild(style);
  }

  function removeColorSchemeHint() {
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  function ensureStylesheetLink() {
    let link = document.getElementById(LINK_ID);
    if (link) return link;
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    link.href =
      (typeof browser !== "undefined" ? browser : chrome).runtime.getURL(
        "content/dark-theme.css"
      );
    (document.head || document.documentElement).appendChild(link);
    return link;
  }

  /**
   * Fully removes the fallback stylesheet <link> rather than merely
   * setting `.disabled = true`. Chrome has been observed to not reliably
   * re-run style invalidation for every matched element when a
   * stylesheet using a near-universal selector (":not(#id)", matching
   * virtually every element) is disabled via the `.disabled` flag - the
   * page stays visually styled until something else forces a recalc
   * (e.g. a manual reload). Firefox does not have this issue.
   * Removing/re-inserting the element instead is unambiguous in both
   * engines: the browser always fully drops a removed stylesheet's
   * rules.
   */
  function removeStylesheetLink() {
    const link = document.getElementById(LINK_ID);
    if (link) link.remove();
  }

  function applySiteOverrideCss(active) {
    let style = document.getElementById(SITE_OVERRIDE_STYLE_ID);
    if (!active) {
      if (style) style.remove();
      debugState.siteOverrideApplied = false;
      return;
    }
    const css = self.TenebraSiteOverrides.getSiteOverrideCss(
      location.hostname
    );
    debugState.siteOverrideApplied = Boolean(css);
    if (!css) {
      if (style) style.remove();
      return;
    }
    if (!style) {
      style = document.createElement("style");
      style.id = SITE_OVERRIDE_STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    style.textContent = css;
  }

  // Bounds for the readable-dark-text sample (see pageHasReadableDarkText):
  // stop after inspecting this many candidate text nodes (keeps the
  // heuristic O(1)-ish regardless of page size) and this is how many
  // ancestor levels we'll walk looking for a non-transparent background
  // before giving up on a given text node.
  const MAX_CONTRAST_SAMPLE_NODES = 300;
  const CONTRAST_SAMPLE_TARGET = 40;
  const MAX_BG_WALK_DEPTH = 8;
  const READABLE_FRACTION_THRESHOLD = 0.7;

  /**
   * Walks up from `el` until it finds an ancestor with a non-transparent
   * computed background-color, or gives up after MAX_BG_WALK_DEPTH steps
   * (falling back to <html>'s background). Needed because most text's
   * *direct* parent is background: transparent, and the visible
   * background actually comes from a container several levels up.
   */
  function getEffectiveBackgroundColor(el) {
    let node = el;
    for (let i = 0; i < MAX_BG_WALK_DEPTH && node; i++) {
      const bg = getComputedStyle(node).backgroundColor;
      const parsed = self.TenebraHeuristics.parseRgb(bg);
      if (parsed && parsed.a >= self.TenebraHeuristics.MIN_OPAQUE_ALPHA) {
        return bg;
      }
      node = node.parentElement;
    }
    return getComputedStyle(document.documentElement).backgroundColor;
  }

  /**
   * When the page's own background already looks dark, this decides
   * whether its *text* is actually readable against that background -
   * some sites have a dark section/hero without ever adjusting component
   * text colors for it, leaving near-invisible dark-gray-on-near-black
   * text. Samples a bounded number of real text
   * nodes' color vs. effective background contrast; if most are
   * comfortably readable, trusts the site's own dark theme. If a
   * meaningful share aren't, treats the page as not properly dark so the
   * fallback stylesheet still applies (which paints a uniform readable
   * dark background + light text over the whole page).
   */
  function pageHasReadableDarkText() {
    if (!document.body) return true;
    const { hasReadableContrast } = self.TenebraHeuristics;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );
    let visited = 0;
    let sampled = 0;
    let readable = 0;
    let node = walker.nextNode();
    while (node && visited < MAX_CONTRAST_SAMPLE_NODES && sampled < CONTRAST_SAMPLE_TARGET) {
      visited++;
      const text = node.nodeValue;
      const parent = node.parentElement;
      node = walker.nextNode();
      if (!text || !text.trim() || !parent) continue;
      const style = getComputedStyle(parent);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const fg = style.color;
      const bg = getEffectiveBackgroundColor(parent);
      sampled++;
      if (hasReadableContrast(bg, fg)) readable++;
    }
    if (sampled === 0) return true; // no real text found - nothing to contradict the dark-bg signal
    return readable / sampled >= READABLE_FRACTION_THRESHOLD;
  }

  /**
   * Cheap, local, no-ML heuristic: sample the computed background color of
   * <html> and <body>. If neither is dark, the page is a normal light
   * site and needs the full fallback stylesheet. If the background *is*
   * dark, that alone isn't enough proof the site did a good job - some
   * sites have a dark hero/section background without ever adjusting
   * their component text colors for it, leaving genuinely unreadable
   * dark-gray-on-near-black text. So when the
   * background looks dark, we additionally sample real text nodes'
   * contrast against their effective background (see
   * pageHasReadableDarkText) before deciding to trust the site's own
   * theme. Result is cached per page load (see `cachedPageLooksLight`).
   */
  function pageLooksAlreadyDark() {
    if (cachedPageLooksLight !== null) return !cachedPageLooksLight;
    const { isDarkColor } = self.TenebraHeuristics;
    const candidates = [document.documentElement, document.body].filter(
      Boolean
    );
    let bgLooksDark = false;
    for (const el of candidates) {
      const bg = getComputedStyle(el).backgroundColor;
      if (isDarkColor(bg)) {
        bgLooksDark = true;
        break;
      }
    }
    const alreadyDark = bgLooksDark && pageHasReadableDarkText();
    cachedPageLooksLight = !alreadyDark;
    return alreadyDark;
  }

  /**
   * The generic stylesheet paints a solid dark background on (almost)
   * every element so nested containers/modals stay opaque. Elements that
   * show an image via the CSS `background-image` property (hero banners,
   * icon sprites) would otherwise have that image hidden under the solid
   * fill, and aren't reachable via a plain <img>/<video> tag selector.
   * This one-time, bounded scan tags those elements with a class that
   * dark-theme.css excludes from the solid background. Deliberately a
   * single pass (not a live MutationObserver) to keep the "fast, no
   * polling" principle; lazily-inserted background images (e.g. behind a
   * "load more") may not get tagged until next navigation. Run via
   * requestIdleCallback so it never competes with initial paint/scroll.
   */
  function tagBackgroundImageElements() {
    if (!document.body) return;
    const all = document.body.querySelectorAll("*");
    const limit = Math.min(all.length, MAX_BG_SCAN_ELEMENTS);
    for (let i = 0; i < limit; i++) {
      const el = all[i];
      if (el.classList.contains(BG_IMAGE_CLASS)) continue;
      const bgImage = getComputedStyle(el).backgroundImage;
      if (bgImage && bgImage !== "none") {
        el.classList.add(BG_IMAGE_CLASS);
      }
    }
  }

  function untagBackgroundImageElements() {
    document
      .querySelectorAll("." + BG_IMAGE_CLASS)
      .forEach((el) => el.classList.remove(BG_IMAGE_CLASS));
  }

  function scheduleBackgroundImageTagging() {
    const run = () => tagBackgroundImageElements();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(run, { timeout: 2000 });
    } else {
      setTimeout(run, 0);
    }
  }

  function applyFallbackStylesheet() {
    const alreadyDark = pageLooksAlreadyDark();
    debugState.pageLooksAlreadyDark = alreadyDark;
    if (alreadyDark) {
      removeStylesheetLink();
    } else {
      ensureStylesheetLink();
    }
    applySiteOverrideCss(!alreadyDark);
    if (alreadyDark) {
      untagBackgroundImageElements();
    } else {
      scheduleBackgroundImageTagging();
    }
    debugState.fallbackStylesheetActive = !alreadyDark;
  }

  function applyState(enabled) {
    if (!enabled) {
      removeColorSchemeHint();
      removeStylesheetLink();
      applySiteOverrideCss(false);
      untagBackgroundImageElements();
      debugState.fallbackStylesheetActive = false;
      return;
    }
    ensureColorSchemeHint();
    // The light/dark heuristic needs the page's own CSS to have applied,
    // which isn't reliable yet at document_start - defer it.
    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        () => applyFallbackStylesheet(),
        { once: true }
      );
    } else {
      applyFallbackStylesheet();
    }
  }

  async function refresh() {
    const [siteMode, globalDefault, enabled] = await Promise.all([
      self.TenebraStorage.getSiteMode(location.hostname),
      self.TenebraStorage.getGlobalDefault(),
      self.TenebraStorage.resolveDarkModeEnabled(location.hostname),
    ]);

    debugState.siteMode = siteMode;
    debugState.globalDefault = globalDefault;
    debugState.resolvedEnabled = enabled;

    applyState(enabled);
  }

  refresh();

  self.TenebraStorage.onChanged((changes, area) => {
    if (area !== "local") return;
    refresh();
  });

  const runtime = typeof browser !== "undefined" ? browser : chrome;
  runtime.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== "tenebra:get-debug-info") return;
    // Re-evaluate the already-dark heuristic fresh (cheap) so the debug
    // panel reflects current DOM state, not just what was cached at
    // apply-time.
    sendResponse({ ...debugState, hostname: location.hostname });
  });
})();



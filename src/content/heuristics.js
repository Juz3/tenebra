/**
 * Tenebra content-script heuristics - pure functions, split out from
 * content.js so they're unit-testable under Node (see tests/heuristics.test.js)
 * without needing a real DOM.
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.TenebraHeuristics = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /**
   * @param {string} cssColor e.g. "rgb(18, 18, 18)" or "rgba(18,18,18,0.5)"
   * @returns {{r:number,g:number,b:number,a:number}|null}
   */
  function parseRgb(cssColor) {
    const match =
      /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(cssColor || "");
    if (!match) return null;
    const [r, g, b] = match.slice(1, 4).map(Number);
    const a = match[4] === undefined ? 1 : Number(match[4]);
    return { r, g, b, a };
  }

  // Below this alpha, a color is considered "nothing actually painted
  // here" rather than a real (if faint) color - most commonly
  // getComputedStyle's initial value "rgba(0, 0, 0, 0)" on elements that
  // never had a background-color rule at all. Treating that as opaque
  // black (luminance 0, "dark") was a real bug: it made ordinary light
  // pages that simply never set a background - the norm, not the
  // exception - get misread as already having a dark theme.
  const MIN_OPAQUE_ALPHA = 0.05;

  /**
   * Determines whether a CSS `rgb()`/`rgba()` color string is "clearly
   * dark" using perceived luminance. Used to detect pages that already
   * ship their own dark theme, so Tenebra's fallback stylesheet can be
   * skipped rather than double-darkening them. A fully/near-transparent
   * color carries no such signal and is treated as not dark (see
   * MIN_OPAQUE_ALPHA).
   * @param {string} cssColor e.g. "rgb(18, 18, 18)"
   * @returns {boolean}
   */
  function isDarkColor(cssColor) {
    const parsed = parseRgb(cssColor);
    if (!parsed || parsed.a < MIN_OPAQUE_ALPHA) return false;
    const { r, g, b } = parsed;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 64;
  }

  /**
   * WCAG relative luminance (0 = black, 1 = white).
   * @param {{r:number,g:number,b:number}} rgb
   */
  function relativeLuminance({ r, g, b }) {
    const toLinear = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  }

  /**
   * WCAG contrast ratio between two CSS colors, 1 (no contrast) to 21
   * (black on white). Returns null if either color can't be parsed (e.g.
   * fully/partly transparent - callers should walk up to a real
   * background before calling this).
   * @param {string} cssColorA
   * @param {string} cssColorB
   */
  function contrastRatio(cssColorA, cssColorB) {
    const a = parseRgb(cssColorA);
    const b = parseRgb(cssColorB);
    // A fully/near-transparent color (e.g. getComputedStyle's initial
    // "rgba(0, 0, 0, 0)" on an element that never had a background rule)
    // parses fine but its r/g/b are meaningless - nothing is actually
    // painted that color, so don't let it masquerade as opaque black.
    if (!a || !b || a.a < MIN_OPAQUE_ALPHA || b.a < MIN_OPAQUE_ALPHA) {
      return null;
    }
    const lA = relativeLuminance(a);
    const lB = relativeLuminance(b);
    const lighter = Math.max(lA, lB);
    const darker = Math.min(lA, lB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * @param {string} bgCssColor
   * @param {string} fgCssColor
   * @param {number} [minRatio] defaults to 2.5 - deliberately below the
   *   WCAG AA body-text minimum (4.5) because this is a "does this text
   *   read at all" check, not an accessibility audit; sites we'd rather
   *   not touch (properly designed dark themes) comfortably clear 2.5,
   *   while the failure mode we're detecting (near-invisible dark-gray-
   *   on-near-black component text) sits well under it.
   * @returns {boolean}
   */
  function hasReadableContrast(bgCssColor, fgCssColor, minRatio) {
    const ratio = contrastRatio(bgCssColor, fgCssColor);
    if (ratio === null) return true; // can't tell - don't flag as unreadable
    return ratio >= (minRatio || 2.5);
  }

  return {
    isDarkColor,
    parseRgb,
    relativeLuminance,
    contrastRatio,
    hasReadableContrast,
    MIN_OPAQUE_ALPHA,
  };
});

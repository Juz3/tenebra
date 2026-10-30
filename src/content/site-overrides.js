/**
 * Tenebra per-site CSS overrides.
 *
 * The generic dark stylesheet (dark-theme.css) is intentionally general -
 * it wins over the vast majority of sites' own CSS via a specificity
 * trick, without any per-site logic. A small number of sites may still
 * need a manual patch (e.g. a page using an ID selector for a critical
 * surface, or a fixed overlay that needs an explicit background). Add
 * entries here as needed rather than growing the generic rule; each
 * entry is plain CSS text injected as an additional <style> tag after
 * the generic stylesheet.
 *
 * Hostnames are matched as an exact match or a suffix match on the
 * "www."-stripped hostname, so an entry for "example.com" also matches
 * "www.example.com" and "sub.example.com".
 */
(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory();
  } else {
    root.TenebraSiteOverrides = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SITE_OVERRIDES = {
    // "example.com": `
    //   #some-fixed-header { background-color: #16171a !important; }
    // `,
  };

  function normalizeHostname(hostname) {
    return (hostname || "").replace(/^www\./, "");
  }

  /**
   * @param {string} normalizedHostname already www.-stripped
   * @param {string} pattern a key from SITE_OVERRIDES, e.g. "example.com"
   * @returns {boolean}
   */
  function hostMatchesPattern(normalizedHostname, pattern) {
    return (
      normalizedHostname === pattern ||
      normalizedHostname.endsWith("." + pattern)
    );
  }

  /**
   * @param {string} hostname
   * @returns {string} extra CSS text for this hostname, or "" if none
   */
  function getSiteOverrideCss(hostname) {
    const normalized = normalizeHostname(hostname);
    if (!normalized) return "";
    for (const [pattern, css] of Object.entries(SITE_OVERRIDES)) {
      if (hostMatchesPattern(normalized, pattern)) {
        return css;
      }
    }
    return "";
  }

  return { getSiteOverrideCss, normalizeHostname, hostMatchesPattern };
});

# Tenebra - Project Plan

_A modern, minimal, fast dark-mode browser extension._
_Primary target: Firefox. Secondary target: Chrome, plus Chromium-based
Edge, Brave, and Opera. Unified codebase. Zero telemetry, zero third-party
calls._

## 1. Naming & branding

- **Name: Tenebra** (from Latin *tenebrae*, "shadows/darkness"). Short,
  brand-able, not tied to any browser name, not "night mode."
- **Discoverability strategy** (since the brand name doesn't literally say
  "dark mode"): both stores index listing text, not just the title.
  - Store title: `Tenebra - Dark Mode for Every Site`
  - Summary/description explicitly and naturally repeats "dark mode,"
    "night mode," "dark theme," "reduce eye strain," etc.
  - AMO category: **Appearance**; Chrome category: **Accessibility/Productivity**.
  - GitHub repo topics: `dark-mode`, `firefox-extension`, `chrome-extension`,
    `browser-extension`, `privacy`.
- Tagline: *"Dark mode, done fast and quiet."*
- Visual identity: a simple monochrome crescent/shade glyph (no gradients,
  no busy iconography) reflecting the "minimal & fast" positioning. Icon
  design is a later milestone (Section 7).

## 2. Background

Tenebra supersedes Nightfoxify, an older Firefox dark mode extension by the
author. Design choices that follow from that history:

- Zero dependencies, zero network calls, zero telemetry, and a tiny footprint
  are preserved as core selling points.
- **Manifest V3** (MV2 is being sunset).
- **Per-site state** (on / off / auto), remembered per hostname, instead of a
  global-only toggle.
- **Single unified codebase** for Firefox and Chrome, with browser differences
  isolated to a small manifest-merge step.

## 3. Core design principles

1. **No telemetry, no analytics, no remote requests, no third-party
   scripts/CDNs, ever.** Everything ships in the extension package.
2. **Minimal permissions.** Only what's needed: `storage` (per-site/global
   prefs) and content-script host access for applying dark styling. No
   `tabs`, no `bookmarks`, no broad "read your browsing history" style
   permissions.
3. **Fast.** No heavy DOM mutation observers by default, no polling loops,
   CSS-first approach (inject a stylesheet, not per-element JS rewrites).
   Style injection should be near-instant and not cause visible flash where
   avoidable (`document_start` + `color-scheme` hinting).
4. **Respect the page.** Prefer letting sites that already support
   `prefers-color-scheme: dark` do their own thing; only forcibly repaint
   sites that don't. Avoid breaking images, video, and canvas content.
5. **One codebase, multiple targets.** Shared logic/UI in `/src`; a build
   step produces `/dist/firefox` and `/dist/chrome` with browser-appropriate
   manifest fields (background service worker vs. background scripts,
   `browser_specific_settings`, etc.). Chromium-based browsers (Edge, Brave,
   Opera) consume the same `/dist/chrome` package unmodified - they support
   the standard `chrome.*` MV3 APIs and Chrome Web Store manifest format,
   so no separate build target is needed for them (see Section 4a).
6. **Boring, auditable code.** Plain JS/CSS/HTML, no framework, no
   transpilation required to read the source - easy for store reviewers
   and contributors to audit line by line (reinforces the privacy claim).

## 4. Browser support matrix

| Browser              | Engine    | Package source     | Store                        |
|----------------------|-----------|---------------------|-------------------------------|
| Firefox              | Gecko     | `dist/firefox`       | addons.mozilla.org (AMO)     |
| Chrome               | Chromium  | `dist/chrome`        | Chrome Web Store             |
| Edge                 | Chromium  | `dist/chrome` (as-is)| Edge Add-ons (optional, same package) |
| Brave                | Chromium  | `dist/chrome` (as-is)| Chrome Web Store (Brave installs from it directly) |
| Opera                | Chromium  | `dist/chrome` (as-is)| Opera Add-ons (optional, same package, may need repackaging step later) |

- Only **two build outputs** are needed (`firefox`, `chrome`) since all
  Chromium-based browsers implement the same `chrome.*` MV3 extension APIs
  and manifest schema. No Edge/Brave/Opera-specific code branches expected.
- Submitting to the Edge Add-ons store and Opera Add-ons store is a
  packaging/listing step (Section 7, milestone 12), not additional
  engineering - same `dist/chrome` zip, separate store submission forms.
- If a Chromium-family quirk ever requires divergence (rare), it will be
  handled the same way as Firefox: an isolated manifest override, not a
  fork of the shared `src/` logic.

## 5. Feature set

### v1 (MVP - modernized, per-site aware)
- Global toggle: dark mode on/off, toolbar button + popup.
- Per-site override: "Always," "Never," "Use global default" - stored in
  `storage.local`, keyed by hostname.
- Smart dark styling:
  - Set `color-scheme: dark` so native form controls/scrollbars and any
    `prefers-color-scheme`-aware site styling adapt automatically.
  - Fallback CSS overrides (background/text/link colors) applied only when
    heuristics suggest the page is light (cheap check via
    `getComputedStyle` on `<html>`/`<body>`, no network, no ML).
  - Skip already-dark pages to avoid double-darkening.
- Popup UI: current-site status + 3-way toggle + link to options.
- Options page: list of per-site overrides with remove/reset, global
  default toggle, "about/privacy" note reiterating no data collection.
- Icons: 16/32/48/96/128 px, SVG source.

### v1.1+ (nice-to-have, still zero-dependency)
- Optional brightness/contrast adjustment slider (local-only, no presets
  fetched remotely).
- Keyboard shortcut to toggle current site.
- Import/export of per-site settings as local JSON (manual, user-initiated
  - not sync, to avoid needing any account/telemetry infra unless the user
  explicitly opts into browser-native `storage.sync`).
- Optional `storage.sync` support for cross-device site prefs (opt-in only,
  uses the browser's own sync - no custom backend).

### Explicitly out of scope
- No cloud accounts, no update-ping telemetry, no crash reporting SDKs, no
  ads, no "Pro" tier / paywall, no bundled unrelated features (VPN, ad
  blocking, etc.) - scope creep that was flagged as a risk to
  avoid repeating.

## 6. Technical architecture

```
tenebra/
├── src/
│   ├── manifest.base.json      # shared MV3 manifest fields
│   ├── manifest.firefox.json   # Firefox-only overrides (gecko settings, background.scripts)
│   ├── manifest.chrome.json    # Chrome-only overrides (background.service_worker)
│   ├── background/
│   │   └── background.js       # toggle logic, icon state, storage reads/writes
│   ├── content/
│   │   ├── content.js          # injects <style>, applies heuristic, listens for storage changes
│   │   └── dark-theme.css      # base dark stylesheet (template, values injected/kept static)
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   ├── options.js
│   │   └── options.css
│   ├── shared/
│   │   └── storage.js          # thin wrapper over browser.storage/chrome.storage w/ promise shim
│   └── icons/                  # source SVG + exported PNGs
├── build/
│   └── build.js                 # Node script: merges manifest.base + per-browser overrides,
│                                 # copies src → dist/<browser>, no bundler needed
├── dist/                        # generated, gitignored (firefox/, chrome/)
├── tests/                       # small unit tests for heuristic + storage logic
├── .github/workflows/ci.yml     # lint + test + build on push/PR
├── package.json                 # dev-only deps: eslint, prettier, web-ext, a test runner
├── PRIVACY.md                   # explicit no-telemetry / no-network statement
├── CHANGELOG.md
├── LICENSE                      # MIT
└── README.md
```

- **Cross-browser API shim:** a tiny `browserApi` wrapper (`src/shared/storage.js`)
  so the same code calls `browser.*` (Firefox, promise-based natively) or
  `chrome.*` (Chrome, callback-based) - small polyfill, not the large
  `webextension-polyfill` dependency, unless we decide that's worth the
  ~4 KB.
- **Manifest strategy:** MV3 for both browsers.
  - Firefox MV3: `background.scripts` (event page) + `browser_specific_settings.gecko`.
  - Chrome MV3: `background.service_worker`.
  - `content_scripts` shared (`matches: ["http://*/*", "https://*/*"]`,
    excluding `file://`).
- **Build step is intentionally simple:** no Webpack/Rollup/Vite needed for
  a project this small - a ~50-line Node script that copies files and
  merges JSON is enough, keeps "minimal and fast" true for contributors
  too.
- **Packaging:** `web-ext build` for the Firefox `.xpi`/zip, a plain `zip`
  step for the Chrome package, wired into `npm run package`.

## 7. Milestones

1. ✅ Review prior extension and define scope (done).
2. ✅ Decide branding/name (Tenebra).
3. ✅ **Initialize repo & scaffolding**: folder structure, package.json,
   base manifest split, LICENSE, README, PRIVACY.md, .gitignore.
4. ✅ **Core MVP implementation**: background + content script + smart dark
   CSS + per-site storage model. (See Section 10 for the several rounds
   of real-world debugging this went through after the initial pass.)
5. ✅ **Popup + options UI** (including a debug panel behind a toggle, for
   development - shows the content script's live heuristic/state).
6. ✅ **Icon set** (simple monochrome glyph, multiple sizes) - SVG source
   plus generated 16/32/48/96/128px PNGs (`npm run generate-icons`).
7. ✅ **Build/package tooling** (`build.js`, `web-ext`, npm scripts).
8. ✅ **CI** (GitHub Actions: lint, test, build artifacts on PR) - workflow
   exists at `.github/workflows/ci.yml`; its full step sequence (install,
   lint, test, generate-icons, build, web-ext lint, package Chrome,
   package Firefox) passes locally end-to-end. Confirm it is green on
   GitHub Actions (see milestone 11).
9. **Manual test pass** across a handful of representative sites (a plain
   content site, a site with native dark mode, a media-heavy site, an
   already-dark site) in Firefox, Chrome, and at least one Chromium-based
   browser (Edge, Brave, or Opera) to confirm the shared `dist/chrome`
   package behaves consistently across the Chromium family. **In
   progress**: Firefox and Chrome have been manually tested and iterated
   on extensively (see Section 10); Edge/Brave/Opera and the wider site
   matrix (media-heavy, LinkedIn re-test) are still pending.
10. ✅ **Pre-publish local development phase** - MVP built out on a
    local-only git repo before any public exposure.
11. ✅ **Transition to public GitHub repo** - history squashed to a single
    commit and merged to `main` (see Section 8). Remaining publish steps:
    - Tag `v0.1.0`.
    - Confirm CI is green on GitHub Actions (first real run).
    - Replace the placeholder Firefox gecko ID (`tenebra@example.invalid`)
      with the real add-on ID before AMO submission.
12. **Store listings**: AMO, Chrome Web Store, and (optionally) Edge
    Add-ons / Opera Add-ons submission copy, screenshots, privacy
    disclosures (all stores require an explicit data-use declaration -
    "no data collected" across the board).

## 8. Release process

Development started in a local-only git repository so the MVP, build
tooling, and icon/UI polish could reach a solid state before anything was
public. The pre-publish cleanup is done: dev-only cruft and secrets/PII
scan (no tracked machine-specific paths or tokens), `.gitignore` coverage
(`dist/`, `node_modules/`, `web-ext-artifacts/`), public hygiene files
(`LICENSE` (MIT), `README.md`, `PRIVACY.md`, `CONTRIBUTING.md`,
`CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`), and branding
consistency. History was squashed to a single initial commit and merged to
`main`.

Going forward, feature work happens directly on the public repo via PRs.
Repo topics: `dark-mode`, `firefox-extension`, `chrome-extension`,
`browser-extension`, `privacy`. Optionally announce (r/firefox, r/chrome,
Show HN) once a store listing is live - real installability matters more
than a bare repo for adoption.

## 9. Open questions for later

- Whether `storage.sync` opt-in ships in v1 or v1.1.

## 10. Implementation status & lessons learned

The MVP (Sections 5-7, milestones 1-8 above) is implemented and working in
both Firefox and Chrome after several rounds of real-device debugging.

**Built:** manifest split (base/firefox/chrome), background script, content
script, popup with per-site 3-way toggle (Always/Never/Default) + global
default, options page, `storage.js` shim, `build.js`, unit tests, ESLint
config, clean `web-ext lint`, and a dev-only popup debug panel showing the
content script's live state (`siteMode`, `globalDefault`,
`resolvedEnabled`, `pageLooksAlreadyDark`, `fallbackStylesheetActive`,
`siteOverrideApplied`).

**Current CSS approach:** a plain, unlayered stylesheet (`dark-theme.css`)
using an ID-specificity trick
(`:not(#tenebra-nonexistent-id):not(#tenebra-nonexistent-id)`) plus
`!important`, so a near-universal selector outranks a site's own
class-based `!important` rules.

**Lessons learned:**
- Don't use CSS Cascade Layers (`@layer`): layer registration order is not
  reliably controllable from a content script at `document_start`; it
  fixed nothing in Firefox and regressed Chrome.
- Don't use full-page `filter: invert()`: inconsistent between
  Chrome/Firefox and breaks sites like LinkedIn.
- To disable the stylesheet, remove the `<link>` element and re-add it to
  enable; toggling `.disabled` doesn't reliably re-invalidate styles in
  Chrome (Firefox does).
- Query content-script state shortly after a storage write, not
  immediately - propagation and the content script's re-apply are async.
- Don't call `importScripts` in the background script: it is
  service-worker-only and invalid in Firefox's background page model.
- Chrome 152 blocks `--load-extension`, so Chrome testing is manual
  (load unpacked from `dist/chrome`).
- Colors with alpha below 0.05 mean "no color", not opaque black:
  `getComputedStyle`'s default `rgba(0, 0, 0, 0)` was misread as black and
  made ordinary light pages look dark. `isDarkColor`, `contrastRatio` and
  the ancestor walk in `getEffectiveBackgroundColor` all handle this.
- The "already looks dark" check must verify readable text contrast
  (WCAG-style sampling of real text nodes in `heuristics.js`), not only
  the `<html>`/`<body>` background; a dark page can still carry
  dark-on-dark component text.
- Confirm the diagnosis with DevTools or the debug panel before fixing;
  this would have avoided the `@layer` detour.

## 11. Ideas / things to consider

### 11.1 "Already looks dark" heuristic (decided: keep)

`pageLooksAlreadyDark`/`pageHasReadableDarkText` (`content.js`) plus the
color/contrast math in `heuristics.js` avoid double-darkening sites that
ship a good dark theme. It cost several bug-fix rounds (Section 10), and
it requires deferring the fallback stylesheet until `DOMContentLoaded`
(needs real text and layout), which is the cause of the FOUC window in
11.2. Decision: keep it - it preserves native dark themes and works on
every site tested. Revisit only if the wider manual test matrix
(milestone 9) surfaces an unfixable-in-place failure mode; removing it
would let the stylesheet attach synchronously at `document_start` and
solve most of FOUC. Untested edge cases: `currentColor`, CSS custom
properties, shadow DOM, iframes, canvas-rendered text.

### 11.2 Flash of unstyled content (FOUC) shield at page load

Because the fallback stylesheet is only attached after `DOMContentLoaded`
(see 11.1), there is a real window on non-native-dark pages where the
page paints in its natural (usually light) colors before flipping dark.
A proposed mitigation ("shield" pattern): at `document_start`, before
`document.body` exists, inject a temporary `<style>` on
`document.documentElement` forcing a dark background immediately; once
the real heuristic/decision logic finishes, either remove the shield
(native dark theme detected) or let the real fallback stylesheet take
over (light page).

**Reasons to add it:**
- Directly addresses a real, user-visible flash on any page that isn't
  already dark.
- `document.documentElement` does exist at `document_start`, so the
  shield itself is cheap and immediate to inject.

**Reasons not to add it (as currently scoped, while the heuristic stays):**
- The shield's necessary lifetime isn't "a millisecond" as long as the
  heuristic requires `DOMContentLoaded` (or later, for content that
  mounts via JS in SPAs) to run - on a slow or heavy page this could be a
  multi-second window, not a brief instant.
- A background-only shield with no text-color rule risks a
  black-screen-with-invisible-default-text look for that whole window,
  arguably a worse perceived experience than a brief light flash.
- Only covers `<html>` until `<body>` streams in; if the page's own CSS
  sets a `<body>` background (very common), the shield is immediately
  covered anyway, so it only really helps the very first paint, not the
  whole loading window the pattern is meant to cover.
- Adds a third state-machine phase (shield → decision → final) with its
  own new edge cases (script error or slow `<head>` leaving the shield up
  indefinitely, SPA route changes not re-triggering `document_start`,
  etc.) - new complexity layered on top of a subsystem that has already
  caused repeated bugs.
- If the heuristic (11.1) is removed instead, the fallback stylesheet can
  attach synchronously at `document_start` with no deferral at all,
  which resolves the FOUC window almost entirely without needing a
  shield mechanism at all.

**Status:** deferred, not decided - kept here as an idea for later, not
implemented now (the heuristic is kept per 11.1, and a FOUC shield was
explicitly not implemented). Revisit if FOUC turns out to be a real user-facing complaint once
the wider manual test matrix (milestone 9) is complete; the coupling to
11.1 above still holds if that heuristic decision is ever revisited.

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
   exists at `.github/workflows/ci.yml` and its full step sequence
   (install, lint, test, generate-icons, build, web-ext lint, package
   Chrome, package Firefox) has been verified to pass locally end-to-end
   (2026-09-29). Not yet actually exercised on GitHub Actions itself,
   since there is still no remote/public repo to push to (Section 8,
   Phase 1) - that will be the first real CI run, at Phase 3.
9. **Manual test pass** across a handful of representative sites (a plain
   content site, a site with native dark mode, a media-heavy site, an
   already-dark site) in Firefox, Chrome, and at least one Chromium-based
   browser (Edge, Brave, or Opera) to confirm the shared `dist/chrome`
   package behaves consistently across the Chromium family. **In
   progress**: Firefox and Chrome have been manually tested and iterated
   on extensively (see Section 10); Edge/Brave/Opera and the wider site
   matrix (media-heavy, LinkedIn re-test) are still pending.
10. **Pre-publish local development phase** - build out the MVP fully
    on the local-only git repo (Section 8) before any public exposure.
11. **Transition to public GitHub repo** with cleanup pass (Section 8).
    **In progress** (2026-09-29): pre-publish cleanup checklist underway
    - see Section 8's updated status markers.
12. **Store listings**: AMO, Chrome Web Store, and (optionally) Edge
    Add-ons / Opera Add-ons submission copy, screenshots, privacy
    disclosures (all stores require an explicit data-use declaration -
    "no data collected" across the board).

## 8. Local-first development, then transition to a public GitHub repo

**Phase 1 - Local only (now).** All work happens in this local git
repository (`darkModeExt2026`, not yet pushed anywhere). This lets the MVP,
build tooling, and icon/UI polish get to a solid, working state privately,
without half-finished code, placeholder copy, or embarrassing early commits
being visible to the public before the project is ready.

**Phase 2 - Pre-publish cleanup.** Before creating/pushing to the public
GitHub repo, do a deliberate cleanup pass so the public history starts
clean and professional:
- ⏳ **Decide on history strategy**: either squash the local history into a
  single well-written initial commit ("Initial release of Tenebra vX.Y"),
  or curate/rebase into a small number of clean, logically-grouped commits.
  Default recommendation: squash to one clean initial commit - simplest,
  avoids exposing exploratory/messy intermediate commits. **Not yet
  decided** - needs an explicit call before Phase 3 (the actual push),
  since it's a destructive/irreversible-feeling operation on local
  history worth confirming deliberately rather than deciding inline.
- ✅ **Remove dev-only cruft**: scratch notes, temp files reviewed - none
  found tracked in git (temporary automation/debug files created during
  the Chrome extension-loading investigation were cleaned up as part of
  that work, never committed). `PLAN.md` reviewed and kept as-is (factual/transparent, not overly informal).
- ✅ **Secrets/PII scan** (2026-09-29): grepped all tracked files for
  machine-specific absolute paths (e.g. `E:\GitReposSSD`,
  `C:\Users\...`) and common secret/API-key/token patterns - no matches.
- ✅ **Verify `.gitignore` coverage** (2026-09-29): confirmed `dist/`,
  `node_modules/`, `web-ext-artifacts/` are gitignored and `git status`
  stays clean after a full `npm ci` + build + package cycle - nothing
  generated is tracked.
- ✅ **Add public-facing project hygiene files**: `LICENSE`, `README.md`,
  `PRIVACY.md` already existed; added `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1), `SECURITY.md`
  (private reporting via GitHub Security Advisories), and
  `CHANGELOG.md` (2026-09-29).
- ✅ **Finalize the open-source license**: MIT confirmed and already in
  place (`LICENSE`).
- ✅ **Confirm branding consistency**: package name, manifest `name` fields,
  README title, icon, and store-copy language should already be finalized
  and consistent by this point.
- **Tag a version** (e.g. `v0.1.0`) at the clean commit that becomes the
  public starting point.

**Phase 3 - Publish.**
- Create the new public GitHub repository (e.g. `tenebra` or
  `tenebra-extension` if the plain name is taken - check availability
  before publishing).
- Push the cleaned-up history/tag.
- Set repo topics (`dark-mode`, `firefox-extension`, `chrome-extension`,
  `browser-extension`, `privacy`), a short description, and enable Issues
  for community feedback.
- Add the GitHub Actions CI workflow (Section 6/7) so it runs publicly on
  PRs from day one, signaling active maintenance to prospective
  contributors/users.
- Optionally announce on relevant communities (r/firefox, r/chrome,
  Hacker News "Show HN," etc.) once the listing is live on at least one
  store - real installability matters more than a bare repo for adoption.

**Ongoing after publish**: continue normal feature work directly on the
public repo via PRs; the "local-only" phase does not repeat for future
features - it was specifically to give v1 a clean, presentable starting
point.

## 9. Open questions for later (not blocking repo init)

- Minimum browser versions to support (affects whether we can rely on
  newer CSS like `color-scheme` unconditionally - broadly supported, so
  likely fine).
- Whether `storage.sync` opt-in ships in v1 or v1.1.
- Exact GitHub repo name (`tenebra` vs. `tenebra-extension`) - decide at
  Phase 3, pending availability check.
- Squash-to-one-commit vs. curated multi-commit history for the public
  initial push - leaning squash, final call at Phase 2.

## 10. Current implementation status (progress log)

The MVP (Sections 5–7, milestones 1–7 above) is implemented and working in
both Firefox and Chrome, after several rounds of real-device debugging.
Summary of what's been built and fixed, in order:

- **Scaffolding & MVP**: manifest split (base/firefox/chrome), background
  script, content script, popup with per-site 3-way toggle (Always/Never/
  Default) + global default toggle, options page, `storage.js` shim,
  `build.js`, unit tests, ESLint config, `web-ext lint` clean.
- **Firefox `importScripts` crash**: fixed an MV3 service-worker-only API
  call that isn't valid in Firefox's background page model.
- **Dark-mode CSS strategy**: went through two earlier approaches before
  landing on the current one:
  - *Full-page `filter: invert()`* - tried first, reverted: behaved
    inconsistently between Chrome/Firefox and broke sites like LinkedIn.
  - *CSS Cascade Layers (`@layer`)* - tried to explain a Firefox-only
    dark-gray-text bug, reverted: didn't fix Firefox and
    regressed a case that had been working in Chrome. Layer registration
    order turned out not to be reliably controllable from a content
    script at `document_start`.
  - **Current approach**: a plain, unlayered stylesheet
    (`dark-theme.css`) using an ID-specificity trick
    (`:not(#tenebra-nonexistent-id):not(#tenebra-nonexistent-id)`) so a
    near-universal selector still outranks a site's own class-based
    `!important` rules, combined with `!important`, so it is hardened
    against high-specificity site CSS.
- **Debug panel**: added a toggle in the popup (dev-only) that shows the
  content script's live state (`siteMode`, `globalDefault`,
  `resolvedEnabled`, `pageLooksAlreadyDark`, `fallbackStylesheetActive`,
  `siteOverrideApplied`) for the active tab - this became the key
  diagnostic tool for every bug below, replacing guesswork with direct
  evidence.
- **Chrome mode-toggle not updating without a refresh**: root-caused to
  Chrome not reliably re-invalidating styles when a near-universal-selector
  `<link>` stylesheet is toggled via `.disabled`, while Firefox does. Fixed
  by fully removing/re-adding the `<link>` element instead of disabling it.
- **Debug panel stale on toggle**: fixed by re-querying content-script
  state shortly after a storage write instead of immediately (storage
  change propagation + the content script's own re-apply is async).
- **dark-gray-on-dark text (two rounds)**:
  1. First root cause: the "already looks dark" heuristic
     (`pageLooksAlreadyDark`) only checked `<html>`/`<body>` background
     color - if it was dark, we skipped our fallback stylesheet entirely,
     even though the site's own component text colors were never tuned
     for that dark background (an inline styled-components `<h2>` at
     `rgb(42,43,45)` on a near-black background). Fixed by adding a
     WCAG-style contrast-ratio check (`heuristics.js`) that samples real
     text nodes and only trusts the page's own dark theme if most sampled
     text is actually readable against its effective background;
     otherwise the fallback still applies.
  2. Second root cause (contrast fix alone didn't work): `isDarkColor`
     and `contrastRatio` ignored the alpha channel, so
     `getComputedStyle`'s common initial value `rgba(0, 0, 0, 0)` (any
     element with no explicit `background-color` rule - the norm on
     plain light sites) was misread as **opaque black**, wrongly
     confirming a "dark" background on ordinary light pages. Fixed by
     treating near-zero-alpha colors as "no signal" rather than black,
     in both `isDarkColor` and `contrastRatio`, plus the ancestor-walk in
     `getEffectiveBackgroundColor`. Confirmed by the user to have fixed
     other previously-misclassified light sites, without
     apparent regressions on genuinely dark-themed sites tested so far.
- **Net result**: the current heuristic (`pageLooksAlreadyDark` +
  `pageHasReadableDarkText` in `content.js`, plus the color/contrast math
  in `heuristics.js`) is now working correctly on every site tested to
  date, but getting there took three separate bug-fix rounds across two
  sessions - see Section 11 for the resulting open question about whether
  to keep it.

## 11. Ideas / things to consider

Open design questions raised during implementation, deliberately not yet
decided - recorded here so the reasoning isn't lost, to revisit later.

### 11.1 Keep vs. remove the "already looks dark" heuristic

The heuristic (`pageLooksAlreadyDark`/`pageHasReadableDarkText` in
`content.js`) exists to avoid double-darkening sites that already ship a
good dark theme - something Nightfoxify never attempted (it always applied its override
unconditionally, sometimes replacing a site's own dark theme with a worse
generic one).

**Reasons to keep it:**
- It does what it's meant to do: verified working on other
  sites after the alpha-channel fix, without observed regressions so far.
- Preserves a genuinely nicer outcome on well-designed dark sites (their
  own theme, not our generic override) - a real user-visible quality
  difference.
- The specificity-trick CSS underneath it is solid and low-risk on its
  own; the heuristic is a separate, optional layer on top of it.

**Reasons to remove it (revert to an always-apply model):**
- It has been the direct or indirect cause of **every** major bug fixed
  so far this session (the `@layer` detour, the Chrome regression it
  caused, and the two-round contrast/alpha bug) - a
  disproportionate amount of debugging time for one feature.
- It structurally *requires* deferring the fallback stylesheet until
  `DOMContentLoaded` (needs real text + layout to sample), which is the
  direct cause of the FOUC (flash of unstyled content) discussion in
  11.2 below - removing the heuristic would let the fallback stylesheet
  attach synchronously at `document_start` instead, solving most of FOUC
  as a side effect rather than needing a separate mitigation.
- Every new signal added to the heuristic (background color, then text
  contrast, then alpha-awareness) has needed its own edge-case fixes;
  it's plausible more remain (untested: pages using `currentColor`,
  CSS custom properties resolved differently across engines, shadow DOM
  content, iframes, canvas-rendered text, etc.).
- Simpler code (~150+ fewer lines across `content.js`/`heuristics.js`)
  is easier to reason about and maintain, which matters for a project
  explicitly positioned as "minimal and fast."

**Status:** ✅ **Decided (2026-09-29): keep the heuristic.** It is
working correctly on every site tested so far (including the
site that drove the most recent fix round), and preserving native dark
themes is considered worth the added complexity. Not being revisited
unless the wider manual test matrix (milestone 9) surfaces a new,
unfixable-in-place failure mode.

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
implemented now (2026-09-29: the user opted to keep the heuristic as-is
per 11.1, and explicitly chose not to implement a FOUC shield at this
time). Revisit if FOUC turns out to be a real user-facing complaint once
the wider manual test matrix (milestone 9) is complete; the coupling to
11.1 above still holds if that heuristic decision is ever revisited.

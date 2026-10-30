# Changelog

All notable changes to this project are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

Pre-release development. Nothing has been published to AMO or the
Chrome Web Store yet - see [PLAN.md](./PLAN.md) for the full roadmap and
current status.

### Added
- Manifest V3 extension scaffold for Firefox and Chrome from a single
  shared source tree (`src/`), with a small Node build script
  (`build/build.js`) merging per-browser manifest overrides.
- Global dark-mode toggle plus a per-site override (Always / Never /
  Auto), stored in `storage.local`.
- General-purpose dark-mode stylesheet (`src/content/dark-theme.css`)
  using an ID-specificity trick so it reliably outranks a site's own
  `!important` CSS, without needing per-site selector tuning.
- "Already looks dark" heuristic (`pageLooksAlreadyDark` in
  `src/content/content.js`) that skips the fallback stylesheet on pages
  that already ship a readable dark theme, backed by a WCAG-style
  contrast-ratio check (`src/content/heuristics.js`) so a merely
  dark-background/low-contrast-text page isn't mistaken for "already
  dark."
- Per-site CSS override registry (`src/content/site-overrides.js`) for
  the rare site that needs a manual patch beyond the generic stylesheet.
- Popup UI with the per-site 3-way toggle, global default switch, and a
  developer-only debug panel showing the content script's live heuristic
  state.
- Options page listing per-site overrides with remove/reset.
- Unit tests (Node's built-in test runner) for the heuristics and
  storage modules.
- `web-ext lint` validation and Chrome/Firefox packaging scripts.
- GitHub Actions CI workflow (lint, test, build, package) - not yet
  exercised against a public remote.
- Project documentation: `README.md`, `PLAN.md`,
  `PRIVACY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`,
  this changelog, and an analysis of the prior Nightfoxify extension
  this project modernizes.

### Fixed
- A Firefox-specific background script crash (`importScripts` is not
  valid in Firefox's MV3 background script model).
- Chrome not re-applying/un-applying dark mode without a manual page
  refresh, caused by toggling a `<link>` stylesheet's `.disabled` flag
  rather than removing/re-adding the element.
- Dark-gray-on-dark-background text on pages with a dark background but
  low-contrast component text, traced to two
  separate bugs: the original heuristic only checking background color
  (not text readability), and `isDarkColor`/`contrastRatio` mis-treating
  fully transparent colors (`rgba(0, 0, 0, 0)`, the common
  no-background-set case) as opaque black.
- 11 transitive dependency vulnerabilities via a `web-ext` devDependency
  upgrade (8.x → 10.x); no runtime/shipped-extension impact, since
  `web-ext` is a local build/lint tool only.

<!-- Compare link intentionally omitted until the public GitHub repo
     exists (exact org/repo name is still an open question - see
     PLAN.md Section 9) - add e.g.
     [Unreleased]: https://github.com/<owner>/<repo>/compare/v0.1.0...HEAD
     once a version is tagged and pushed. -->

# Contributing to Tenebra

Thanks for your interest in contributing! Tenebra is intentionally small
and dependency-light - see [PLAN.md](./PLAN.md) for the full design
principles and roadmap before proposing larger changes.

## Getting started

```sh
npm install              # install dev-only tooling (eslint, web-ext, archiver)
npm run generate-icons   # (re)generate icon PNGs from src/icons/icon.svg
npm run build            # build dist/firefox and dist/chrome
npm run lint             # eslint over src/build/tests
npm test                 # unit tests (heuristics + storage logic)
npm run lint:ext         # web-ext manifest/lint validation for the Firefox build
```

Load `dist/firefox` via `about:debugging` → "This Firefox" → "Load
Temporary Add-on" (select `manifest.json` inside `dist/firefox`), or
`dist/chrome` via `chrome://extensions` → "Load unpacked" (Developer
mode enabled).

## Before opening a pull request

- Run `npm run lint`, `npm test`, `npm run build`, and `npm run lint:ext`
  - all must pass cleanly (0 errors, 0 warnings) before requesting review.
- Add or update unit tests in `tests/` for any change to
  `src/content/heuristics.js` or `src/shared/storage.js` - these are
  pure-function modules specifically designed to be tested without a
  real browser/DOM.
- If your change affects the dark-mode heuristic or CSS strategy, please
  describe **which real sites you manually tested it against** (Firefox
  and Chrome, at minimum) in the PR description. This project has been
  bitten several times by heuristic changes that looked correct in
  isolation but broke on real sites - see PLAN.md Section 10 for the
  history. Automated tests alone are not sufficient sign-off for this
  category of change.
- Keep the zero-dependency, zero-network, zero-telemetry constraints
  (see [PRIVACY.md](./PRIVACY.md)) - this is a hard design line, not a
  style preference. PRs that add analytics, remote config, or a runtime
  dependency will not be accepted.

## Reporting bugs

Please include:
- The site URL (or a minimal reproduction if the site is private/behind
  a login) where the issue occurs.
- Browser + version.
- Whether the popup's debug panel (enable the "Debug" toggle) shows
  anything unexpected (`pageLooksAlreadyDark`, `fallbackStylesheetActive`,
  etc.) - this is the fastest way to help diagnose dark-mode-specific
  issues.

## Reporting security issues

Please see [SECURITY.md](./SECURITY.md) instead of a public issue.

## Code style

- Plain ES2020+ JavaScript, no framework/bundler - the whole point of
  this project is staying small enough to not need one.
- ESLint config (`eslint.config.js`) is the source of truth for style;
  run `npm run lint` rather than hand-formatting to match.

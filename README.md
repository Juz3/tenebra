# Tenebra

_A modern, minimal, fast dark-mode browser extension._

Dark mode, done fast and quiet. Per-site control (Always / Never / Auto),
zero telemetry, zero network calls, zero third-party code - everything
ships in the extension package.

Supports **Firefox** and Chromium-based browsers (**Chrome, Edge, Brave,
Opera**) from a single shared codebase.

## Status

Early development (pre-release). See [PLAN.md](./PLAN.md) for the full
project plan, design principles, and milestone tracking.

## How it works

- Sets `color-scheme: dark` so native form controls/scrollbars and any
  `prefers-color-scheme`-aware site styling adapt automatically.
- Applies a conservative fallback stylesheet only when a page looks like
  it doesn't already have its own dark theme, avoiding double-darkening.
- Per-site override (Always / Never / Auto) is remembered by hostname, on
  top of a global default you control from the popup or options page.

## Development

Requires Node.js (see CI config for the version tested against).

```sh
npm install          # install dev-only tooling (eslint, web-ext, archiver)
npm run generate-icons  # (re)generate placeholder icon PNGs from src/icons/icon.svg
npm run build         # build dist/firefox and dist/chrome
npm run lint          # eslint over src/build/tests
npm test              # unit tests (heuristics + storage logic)
npm run lint:ext      # web-ext manifest/lint validation for the Firefox build
npm run package:firefox  # produce a signed-ready .zip via web-ext
npm run package:chrome   # produce a plain .zip for the Chrome Web Store
```

### Project layout

```
src/        shared source for both browsers
  manifest.base.json / manifest.firefox.json / manifest.chrome.json
  background/   popup/   options/   content/   shared/   icons/
build/      build.js (manifest merge + copy), zip-chrome.js, generate-icons.js
dist/       generated output (gitignored) - dist/firefox, dist/chrome
tests/      unit tests (Node's built-in test runner)
```

Only two build outputs are produced (`dist/firefox`, `dist/chrome`); all
Chromium-based browsers install the `dist/chrome` package unmodified.

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: nothing is collected, ever.

## License

[MIT](./LICENSE)

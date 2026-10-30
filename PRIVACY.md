# Privacy

Tenebra collects **no data**, makes **no network requests**, and includes
**no analytics, telemetry, or third-party code**.

- All preferences (global default, per-site overrides) are stored using
  the browser's own local extension storage (`storage.local`) and never
  leave your device.
- Tenebra does not communicate with any server, first-party or
  third-party, at any time.
- No usage statistics, crash reports, or update pings are collected or
  sent.
- No account, sign-in, or cloud sync is required or offered by default.

This is a permanent design constraint, not a policy that may change
without notice - see `PLAN.md` for the project's core design principles.

If a future version adds an *optional* feature (e.g. `storage.sync` for
cross-device preference sync), it will use the browser's own built-in
sync mechanism, will be strictly opt-in, and this document will be
updated to describe exactly what that entails before it ships.

## Extension detection

Tenebra exposes its dark-theme stylesheet to web pages (required to apply dark mode), so a page could in principle detect that Tenebra is installed. This reveals nothing beyond installation. Mitigations: Firefox uses a random per-profile extension UUID, and the Chrome build uses `use_dynamic_url` so the resource URL changes per session instead of using the fixed extension ID.

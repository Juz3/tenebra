# Security Policy

Tenebra is a zero-network, zero-telemetry browser extension (see
[PRIVACY.md](./PRIVACY.md)) - the realistic attack surface is small, but
we still take reports seriously.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

Instead, open a [GitHub Security Advisory](../../security/advisories/new)
for this repository ("Report a vulnerability" under the Security tab).
This creates a private report visible only to maintainers until a fix is
ready.

If you're unable to use GitHub Security Advisories for any reason, open a
regular issue asking a maintainer to contact you privately, without
including vulnerability details in the issue itself.

Please include:
- A description of the issue and its potential impact.
- Steps to reproduce (a minimal test page/site is ideal, given this is a
  content-script-based extension).
- The browser(s) and version(s) affected, if known.

## Scope

In scope:
- The extension code in `src/` (content script, background script,
  popup, options) and the build/packaging tooling in `build/`.
- Anything that could let a malicious web page escalate beyond what a
  normal content script should be able to do, exfiltrate data, or
  otherwise violate the zero-network/zero-telemetry design constraint.

Out of scope:
- Vulnerabilities in third-party developer tooling (e.g. `web-ext`,
  `eslint`) that isn't shipped as part of the built extension package -
  please report those upstream instead. We do keep dependencies patched
  via `npm audit`, but a transitive dev-tool CVE affecting only the local
  build process (not the shipped extension) is lower priority here.

## Response

This is a small, community-maintained project without a dedicated
security team or paid bug bounty program. We'll do our best to
acknowledge reports promptly and issue a fix in a timely manner, but
please set expectations accordingly.

---
name: PostgreSQL TLS policy across driver upgrades
description: SSL mode names can change meaning between pg versions; keep certificate and hostname verification explicit.
---

Do not assume `sslmode=require` has a stable certificate-verification policy across PostgreSQL driver upgrades. For AWS database connections, use explicit `verify-full` and trust the appropriate CA rather than disabling certificate verification.

**Why:** The pg 8 runtime warns that `prefer`, `require`, and `verify-ca` currently behave like `verify-full`, but will adopt different libpq semantics in the next major version. Relying on an alias can silently weaken verification after an upgrade.

**How to apply:** Review TLS mode semantics when upgrading the PostgreSQL driver. Resolve certificate-chain failures by supplying trusted CA roots; do not use a no-verification mode or globally disable TLS checks.

Security checks on PostgreSQL URLs must agree with the consuming driver's interpretation, not only WHATWG URL parsing.

**Why:** The driver tolerates and normalizes malformed percent escapes rather than reliably rejecting them. Normalization of raw spaces and malformed escapes can change encoded TLS parameter names, so a URL recognized as verified by one parser can become plaintext in the driver.

**How to apply:** When changing connection validation or upgrading the driver, pair accepted URL cases with the real driver's effective TLS configuration. Include combinations of encoded parameter names, malformed escapes, and whitespace. Do not rely on constructing a pg client to reject malformed URLs.
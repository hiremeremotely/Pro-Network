---
name: Pinned DNS with Node requests
description: Runtime behavior to account for when securing server-side fetches of user-submitted URLs.
---

When making an outbound Node HTTP(S) request with a custom DNS lookup callback that pins a vetted public IP, handle both the single-address callback shape and the `options.all` shape, which expects an array of `{address, family}` results.

**Why:** Node's connection family selection may invoke the callback with `all: true` even when the request did not ask for it explicitly. Returning the single-address shape in that case causes `Invalid IP address: undefined` on ordinary sites. Security still depends on vetting resolved addresses and pinning the chosen address for each request, including redirects.

**How to apply:** For future URL-preview or extraction features, test a real public site with the pinned lookup in addition to unit-testing address validation; do not replace pinning with a separate DNS check followed by an ordinary fetch.
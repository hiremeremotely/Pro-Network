---
name: Professional hub trust boundary
description: Product rules for external profile sources, privacy, and HMR-mediated introductions.
---

LinkedIn, Behance, personal sites, CVs, GitHub, and email-derived work should consolidate into one professional hub, but integrations must distinguish linked proof from content the app can legitimately import or sync. Do not imply unrestricted LinkedIn or Behance scraping.

**Why:** Provider access is restricted, and the business model depends on HMR remaining the trusted intermediary rather than exposing professionals directly to businesses.

**How to apply:** Keep candidate discovery anonymized. Route business interest through HMR, then ask the professional for explicit field-level release consent. HMR-managed handling remains anonymous and may share only non-identifying skills. Direct messaging requires explicit identity release; once accepted, identity remains visible in that conversation even after the separate profile-field release expires or is revoked. Declines must preserve anonymity.

Treat professional-supplied external URLs as private source evidence, not public hub destinations. Source destinations may be shared with a company only after an active direct introduction explicitly releases both identity and source links; an existing "public" link preference alone is insufficient. Work summaries require professional review before publication, and new imports should start private.

**Why:** A GitHub, LinkedIn, or portfolio link can reveal identity on the destination site and bypass HMR's mediated introduction even when the in-app profile appears anonymous.

**How to apply:** Check API payloads, file access, media URLs, metadata, and rendered anchors together; hiding a button does not protect a URL still present in a response. Prefer sanctioned imports (such as GitHub's public API), user uploads, and manual reviewed summaries over unrestricted external-profile scraping.
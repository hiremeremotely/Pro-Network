# Hire Me Remotely — Browser Extension

Automatically logs job applications to your HMR Job Tracker while you apply on LinkedIn, Indeed, Glassdoor, and Wellfound.

## Supported Sites

| Site | Detection method |
|---|---|
| LinkedIn | "Easy Apply" flow completion dialog |
| Indeed | Application confirmation page / URL |
| Glassdoor | Application submission confirmation |
| Wellfound | Application confirmation page |
| Generic fallback | Pages with `/apply/` or `/applied` URLs + confirmation text |

## How it works

1. **Session sync** — A content script on the HMR app reads `localStorage["app_user_session"]` and stores the auth token in the extension's local storage.
2. **Detection** — Per-site content scripts watch for application confirmation events using MutationObserver.
3. **Logging** — On detection, the background service worker calls `POST /api/external-applications` with `source: "extension"`.
4. **Confirmation** — A small indigo toast appears on the job site: *"Logged to Hire Me Remotely ✓"*, auto-dismissing after 3 seconds.
5. **HMR badge** — An "HMR" badge appears near Apply buttons on supported sites to confirm the extension is active.

## Install (Chrome — Developer Mode)

```bash
# Build the extension
pnpm --filter @workspace/hmr-extension run build

# Then in Chrome:
# 1. Open chrome://extensions
# 2. Enable "Developer mode" (top-right toggle)
# 3. Click "Load unpacked"
# 4. Select the artifacts/hmr-extension/dist/ folder
```

## Install (Firefox)

```bash
# Build the Firefox variant
pnpm --filter @workspace/hmr-extension run build:firefox

# Then in Firefox:
# 1. Open about:debugging
# 2. Click "This Firefox"
# 3. Click "Load Temporary Add-on..."
# 4. Select artifacts/hmr-extension/dist/manifest.json
```

## Package as ZIP (for distribution)

```bash
# Chrome
pnpm --filter @workspace/hmr-extension run package
# → hmr-extension.zip

# Firefox
pnpm --filter @workspace/hmr-extension run package:firefox
# → hmr-extension-firefox.zip
```

## Authentication

After installing:
1. Open the HMR app in any tab — the extension detects your session automatically.
2. Click the HMR extension icon to confirm you're signed in.
3. If not signed in, click "Sign in to Hire Me Remotely" in the popup.

The extension reads the same `localStorage` session your browser already has. No extra login needed.

## Extension Popup

The popup shows:
- Your name and avatar
- Applications tracked this week
- 5 most recent applications (title, company, platform, status, time ago)
- "Open Job Tracker →" button

## Architecture

```
src/
  background.ts          Service worker: receives detections, calls API, caches recent apps
  content/
    hmr-session.ts       Runs on HMR origin, syncs localStorage session → chrome.storage
    linkedin.ts          LinkedIn Easy Apply detector
    indeed.ts            Indeed confirmation page detector
    glassdoor.ts         Glassdoor submission detector
    wellfound.ts         Wellfound confirmation detector
    generic.ts           Generic /apply/ URL + confirmation text fallback
    toast.ts             Shared toast + badge injection (bundled into each content script)
  popup/
    index.html           Popup shell
    index.tsx            React popup component
build.mjs                esbuild pipeline (Chrome + Firefox builds)
manifest.json            Manifest V3
dist/                    Build output (load this folder as unpacked extension)
```

## Out of scope (MVP)

- Safari extension
- Chrome Web Store / Firefox Add-ons publication
- PWA integration
- Importing past application history (handled by email integration)
- Editing applications from within the popup

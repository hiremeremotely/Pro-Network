// HMR Extension — Background Service Worker (Manifest V3)

interface AppSession {
  id: number;
  name: string;
  email: string;
  accountType: string;
  headline: string;
  avatarUrl?: string | null;
  authToken?: string;
}

interface StoredData {
  session?: AppSession;
  apiBaseUrl?: string;
  recentApps?: StoredApp[];
}

interface StoredApp {
  id: number;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string | null;
  createdAt: string;
}

interface ApplicationMessage {
  type: "APPLICATION_DETECTED";
  jobTitle: string;
  companyName: string;
  platform: string;
  jobUrl?: string;
}

interface SessionSyncMessage {
  type: "SESSION_SYNC";
  session: AppSession;
  apiBaseUrl: string;
}

interface CheckAuthMessage {
  type: "CHECK_AUTH";
}

interface RefreshSessionMessage {
  type: "REFRESH_SESSION";
}

type IncomingMessage =
  | ApplicationMessage
  | SessionSyncMessage
  | CheckAuthMessage
  | RefreshSessionMessage;

// Origins that host the HMR app — used to find a live tab to extract the session from
const HMR_ORIGINS = [
  "*://hiremeremotely.com/*",
  "*://*.hiremeremotely.com/*",
  "*://*.replit.dev/*",
  "*://localhost/*",
  "*://127.0.0.1/*",
];

const HMR_URL_PATTERNS = [
  /^https?:\/\/hiremeremotely\.com(\/.*)?$/,
  /^https?:\/\/[^/]+\.hiremeremotely\.com(\/.*)?$/,
  /^https?:\/\/[^/]+\.replit\.dev(\/.*)?$/,
  /^https?:\/\/localhost(:\d+)?(\/.*)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?(\/.*)?$/,
];

function isHmrUrl(url: string): boolean {
  return HMR_URL_PATTERNS.some((re) => re.test(url));
}

/**
 * Find an open tab running the HMR app and use chrome.scripting.executeScript
 * to read localStorage["app_user_session"] directly from that tab.
 * Returns the parsed session + apiBaseUrl, or null if no HMR tab is found or
 * no session is stored there.
 */
async function readSessionFromHmrTab(): Promise<{
  session: AppSession;
  apiBaseUrl: string;
} | null> {
  // Query all tabs — chrome.tabs.query with url patterns requires host permissions
  const tabs = await chrome.tabs.query({});
  const hmrTab = tabs.find((t) => t.url && isHmrUrl(t.url) && t.id !== undefined);
  if (!hmrTab?.id) return null;

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: hmrTab.id },
      func: () => {
        // Runs in the page context — reads localStorage directly
        const raw = localStorage.getItem("app_user_session");
        const origin = location.origin;
        return { raw, origin };
      },
    });

    const result = results?.[0]?.result as { raw: string | null; origin: string } | undefined;
    if (!result?.raw) return null;

    const parsed = JSON.parse(result.raw) as AppSession;
    if (!parsed?.authToken) return null;

    // Derive the API base URL from the tab's origin (same origin as the app)
    const apiBaseUrl = result.origin;
    return { session: parsed, apiBaseUrl };
  } catch {
    // Tab may have navigated away, scripting blocked, or permission denied
    return null;
  }
}

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener(
  (message: IncomingMessage, _sender, sendResponse: (r: unknown) => void) => {
    if (message.type === "SESSION_SYNC") {
      chrome.storage.local.set({
        session: message.session,
        apiBaseUrl: message.apiBaseUrl,
      });
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === "CHECK_AUTH") {
      chrome.storage.local.get(["session", "apiBaseUrl"]).then((data) => {
        const stored = data as StoredData;
        sendResponse({
          authenticated: !!stored.session?.authToken,
          session: stored.session ?? null,
        });
      });
      return true; // async
    }

    if (message.type === "REFRESH_SESSION") {
      // Actively pull session from any open HMR tab, update storage, return result
      readSessionFromHmrTab().then(async (fresh) => {
        if (fresh) {
          await chrome.storage.local.set({
            session: fresh.session,
            apiBaseUrl: fresh.apiBaseUrl,
          });
          sendResponse({ ok: true, session: fresh.session, apiBaseUrl: fresh.apiBaseUrl });
        } else {
          // Fall back to whatever was cached
          const data = (await chrome.storage.local.get(["session", "apiBaseUrl"])) as StoredData;
          sendResponse({
            ok: false,
            session: data.session ?? null,
            apiBaseUrl: data.apiBaseUrl ?? null,
          });
        }
      });
      return true; // async
    }

    if (message.type === "APPLICATION_DETECTED") {
      handleApplicationDetected(message).then(sendResponse);
      return true; // async
    }

    return false;
  },
);

async function handleApplicationDetected(
  msg: ApplicationMessage,
): Promise<{ success: boolean; error?: string }> {
  const data = (await chrome.storage.local.get([
    "session",
    "apiBaseUrl",
    "recentApps",
  ])) as StoredData;
  const session = data.session;
  const apiBaseUrl = data.apiBaseUrl;

  if (!session?.authToken) {
    return { success: false, error: "Not authenticated" };
  }
  if (!apiBaseUrl) {
    return { success: false, error: "No API URL configured" };
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`${apiBaseUrl}/api/external-applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.authToken}`,
      },
      body: JSON.stringify({
        jobTitle: msg.jobTitle,
        companyName: msg.companyName,
        platform: msg.platform,
        jobUrl: msg.jobUrl ?? null,
        status: "applied",
        appliedDate: today,
        source: "extension",
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (err as { error?: string }).error ?? `HTTP ${res.status}`,
      };
    }

    const newApp = (await res.json()) as StoredApp;

    // Cache recent apps (keep last 10)
    const existing = data.recentApps ?? [];
    const updated = [
      {
        id: newApp.id,
        jobTitle: newApp.jobTitle,
        companyName: newApp.companyName,
        platform: newApp.platform,
        status: newApp.status,
        appliedDate: newApp.appliedDate,
        createdAt: newApp.createdAt ?? new Date().toISOString(),
      },
      ...existing,
    ].slice(0, 10);
    await chrome.storage.local.set({ recentApps: updated });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// On install, attempt an immediate session read from any open HMR tab
chrome.runtime.onInstalled.addListener(() => {
  readSessionFromHmrTab().then((fresh) => {
    if (fresh) {
      chrome.storage.local.set({
        session: fresh.session,
        apiBaseUrl: fresh.apiBaseUrl,
      });
    }
  });
});

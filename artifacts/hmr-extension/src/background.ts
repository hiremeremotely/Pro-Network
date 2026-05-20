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

type IncomingMessage = ApplicationMessage | SessionSyncMessage | CheckAuthMessage;

// Handle messages from content scripts
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

    if (message.type === "APPLICATION_DETECTED") {
      handleApplicationDetected(message).then(sendResponse);
      return true; // async
    }

    return false;
  },
);

async function handleApplicationDetected(msg: ApplicationMessage): Promise<{ success: boolean; error?: string }> {
  const data = (await chrome.storage.local.get(["session", "apiBaseUrl", "recentApps"])) as StoredData;
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
      return { success: false, error: (err as { error?: string }).error ?? `HTTP ${res.status}` };
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
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

// On install, set up initial state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["session"]).then((data) => {
    const stored = data as StoredData;
    if (!stored.session) {
      // No session found — will show sign-in prompt in popup
    }
  });
});

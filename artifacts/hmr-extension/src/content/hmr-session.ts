// Runs on the HMR app origin — syncs session to extension storage

(function () {
  const SESSION_KEY = "app_user_session";

  function syncSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (!session?.authToken) return;

      chrome.runtime.sendMessage({
        type: "SESSION_SYNC",
        session,
        apiBaseUrl: window.location.origin,
      });
    } catch {
      // Ignore errors (extension context may be invalidated on navigation)
    }
  }

  // Sync on page load
  syncSession();

  // Also sync after login by watching localStorage changes
  const origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key: string, value: string) {
    origSetItem(key, value);
    if (key === SESSION_KEY) {
      setTimeout(syncSession, 100);
    }
  };

  // Re-sync on visibility change (user returns to HMR tab)
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      syncSession();
    }
  });
})();

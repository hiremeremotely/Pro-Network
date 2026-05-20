import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

// ---- Types ----
interface AppSession {
  id: number;
  name: string;
  email: string;
  accountType: string;
  headline: string;
  avatarUrl?: string | null;
  authToken?: string;
}

interface RecentApp {
  id: number;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string | null;
  createdAt: string;
}

interface StoredData {
  session?: AppSession;
  apiBaseUrl?: string;
  recentApps?: RecentApp[];
}

// ---- Helpers ----
const INDIGO = "#4f46e5";
const INDIGO_DARK = "#4338ca";
const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0a66c2",
  indeed: "#003a9b",
  glassdoor: "#0caa41",
  wellfound: "#000",
  hiremeremotely: INDIGO,
  other: "#6b7280",
};

function platformLabel(p: string): string {
  const map: Record<string, string> = {
    linkedin: "LinkedIn",
    indeed: "Indeed",
    glassdoor: "Glassdoor",
    wellfound: "Wellfound",
    hiremeremotely: "HMR",
    email: "Email",
    extension: "Ext",
    manual: "Manual",
  };
  return map[p] ?? p.charAt(0).toUpperCase() + p.slice(1);
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    applied: "#6b7280",
    screening: "#f59e0b",
    interview: "#3b82f6",
    offer: "#10b981",
    accepted: "#059669",
    rejected: "#ef4444",
    withdrawn: "#9ca3af",
    saved: "#a78bfa",
  };
  return map[s] ?? "#6b7280";
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function thisWeekCount(apps: RecentApp[]): number {
  const weekAgo = Date.now() - 7 * 86400000;
  return apps.filter((a) => new Date(a.createdAt).getTime() > weekAgo).length;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ---- Components ----
function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect width="22" height="22" rx="6" fill={INDIGO} />
      <text x="11" y="16" textAnchor="middle" fontSize="10" fontWeight="bold" fill="white" fontFamily="system-ui">
        HR
      </text>
    </svg>
  );
}

function Avatar({ session }: { session: AppSession }) {
  const [imgError, setImgError] = useState(false);

  if (session.avatarUrl && !imgError) {
    return (
      <img
        src={session.avatarUrl}
        alt={session.name}
        onError={() => setImgError(true)}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
          border: "2px solid #e5e7eb",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: INDIGO,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {initials(session.name)}
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 6px",
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 700,
        color: "#fff",
        backgroundColor: PLATFORM_COLORS[platform] ?? PLATFORM_COLORS.other,
        letterSpacing: "0.02em",
        flexShrink: 0,
      }}
    >
      {platformLabel(platform)}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: statusColor(status),
        flexShrink: 0,
      }}
    />
  );
}

function AppRow({ app }: { app: RecentApp }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "8px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 12,
            color: "#111827",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {app.jobTitle}
        </div>
        <div style={{ fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
          <StatusDot status={app.status} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {app.companyName}
          </span>
          <span style={{ color: "#d1d5db" }}>·</span>
          <span style={{ flexShrink: 0 }}>{timeAgo(app.createdAt)}</span>
        </div>
      </div>
      <PlatformBadge platform={app.platform} />
    </div>
  );
}

function SignedIn({
  session,
  recentApps,
  weekCount,
  apiBaseUrl,
  onRefresh,
  loading,
}: {
  session: AppSession;
  recentApps: RecentApp[];
  weekCount: number;
  apiBaseUrl: string;
  onRefresh: () => void;
  loading: boolean;
}) {
  function openTracker() {
    chrome.tabs.create({ url: `${apiBaseUrl}/job-tracker` });
  }

  return (
    <div style={{ padding: "12px 14px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Logo />
        <span style={{ fontWeight: 700, fontSize: 13, color: "#111827", flex: 1 }}>Hire Me Remotely</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Refresh"
          style={{
            background: "none",
            border: "none",
            cursor: loading ? "default" : "pointer",
            color: "#9ca3af",
            fontSize: 14,
            padding: "2px 4px",
            lineHeight: 1,
            opacity: loading ? 0.4 : 1,
          }}
        >
          ↻
        </button>
      </div>

      {/* User info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          background: "#f9fafb",
          borderRadius: 10,
          marginBottom: 12,
        }}
      >
        <Avatar session={session} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{session.name}</div>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {session.headline || session.email}
          </div>
        </div>
      </div>

      {/* This week stat */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 12px",
          background: weekCount > 0 ? "#eef2ff" : "#f9fafb",
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: weekCount > 0 ? INDIGO : "#9ca3af" }}>{weekCount}</span>
        <span style={{ fontSize: 12, color: weekCount > 0 ? "#4338ca" : "#9ca3af" }}>
          application{weekCount !== 1 ? "s" : ""} tracked this week
        </span>
      </div>

      {/* Recent applications */}
      {recentApps.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
            Recent
          </div>
          {recentApps.slice(0, 5).map((app) => (
            <AppRow key={app.id} app={app} />
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 12,
            padding: "16px 0",
            marginBottom: 12,
          }}
        >
          No applications tracked yet.
          <br />
          Apply to jobs on LinkedIn, Indeed, or Glassdoor.
        </div>
      )}

      {/* Open tracker button */}
      <button
        onClick={openTracker}
        style={{
          width: "100%",
          padding: "9px 0",
          background: INDIGO,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = INDIGO_DARK)}
        onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = INDIGO)}
      >
        Open Job Tracker →
      </button>
    </div>
  );
}

function SignedOut({ apiBaseUrl }: { apiBaseUrl?: string }) {
  function openSignIn() {
    const url = apiBaseUrl ? `${apiBaseUrl}/login` : "https://hiremeremotely.com/login";
    chrome.tabs.create({ url });
  }

  return (
    <div
      style={{
        padding: "28px 20px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        textAlign: "center",
      }}
    >
      <Logo />
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 4 }}>Hire Me Remotely</div>
        <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
          Sign in to automatically track job applications as you apply across the web.
        </div>
      </div>
      <button
        onClick={openSignIn}
        style={{
          padding: "9px 24px",
          background: INDIGO,
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
        }}
        onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.background = INDIGO_DARK)}
        onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.background = INDIGO)}
      >
        Sign in to Hire Me Remotely
      </button>
      {!apiBaseUrl && (
        <p style={{ fontSize: 11, color: "#9ca3af", lineHeight: 1.5 }}>
          Open the Hire Me Remotely app in a tab first to connect the extension.
        </p>
      )}
    </div>
  );
}

// ---- Root app ----
function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AppSession | null>(null);
  const [apiBaseUrl, setApiBaseUrl] = useState<string | undefined>();
  const [recentApps, setRecentApps] = useState<RecentApp[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    const data = (await chrome.storage.local.get(["session", "apiBaseUrl", "recentApps"])) as StoredData;
    setSession(data.session ?? null);
    setApiBaseUrl(data.apiBaseUrl);
    setRecentApps(data.recentApps ?? []);
    return data;
  }

  async function fetchRecentFromApi(storedSession: AppSession, base: string) {
    if (!storedSession.authToken) return;
    try {
      const res = await fetch(`${base}/api/external-applications?limit=10`, {
        headers: { Authorization: `Bearer ${storedSession.authToken}` },
      });
      if (!res.ok) return;
      const json = await res.json() as { applications: RecentApp[] };
      const apps: RecentApp[] = (json.applications ?? []).map((a) => ({
        ...a,
        createdAt: a.createdAt ?? new Date().toISOString(),
      }));
      setRecentApps(apps);
      await chrome.storage.local.set({ recentApps: apps.slice(0, 10) });
    } catch {
      // Network error — use cached data
    }
  }

  useEffect(() => {
    loadData().then(async (data) => {
      setLoading(false);
      if (data.session?.authToken && data.apiBaseUrl) {
        await fetchRecentFromApi(data.session, data.apiBaseUrl);
      }
    });
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    const data = await loadData();
    if (data.session?.authToken && data.apiBaseUrl) {
      await fetchRecentFromApi(data.session, data.apiBaseUrl);
    }
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
        Loading…
      </div>
    );
  }

  if (!session?.authToken) {
    return <SignedOut apiBaseUrl={apiBaseUrl} />;
  }

  const weekCount = thisWeekCount(recentApps);

  return (
    <SignedIn
      session={session}
      recentApps={recentApps}
      weekCount={weekCount}
      apiBaseUrl={apiBaseUrl ?? ""}
      onRefresh={handleRefresh}
      loading={refreshing}
    />
  );
}

const root = document.getElementById("root")!;
createRoot(root).render(<App />);

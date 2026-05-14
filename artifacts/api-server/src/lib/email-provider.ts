export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "DEMO_GOOGLE_CLIENT_ID";
export const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "DEMO_MICROSOFT_CLIENT_ID";
export const IS_DEMO =
  GOOGLE_CLIENT_ID === "DEMO_GOOGLE_CLIENT_ID" ||
  MICROSOFT_CLIENT_ID === "DEMO_MICROSOFT_CLIENT_ID";

// ── Token bundle ───────────────────────────────────────────────────────────────

export interface TokenBundle {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
}

export const DEMO_TOKEN_BUNDLE = JSON.stringify({
  access_token: "demo_access_token",
  expires_at: 9_999_999_999_999,
} satisfies TokenBundle);

export async function exchangeOAuthCode(
  provider: string,
  code: string,
  redirectUri: string,
): Promise<string> {
  const tokenUrl =
    provider === "gmail"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: provider === "gmail" ? GOOGLE_CLIENT_ID : MICROSOFT_CLIENT_ID,
    client_secret:
      provider === "gmail"
        ? (process.env.GOOGLE_CLIENT_SECRET ?? "")
        : (process.env.MICROSOFT_CLIENT_SECRET ?? ""),
  });
  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!r.ok || data.error) throw new Error(`Token exchange failed: ${data.error ?? r.status}`);
  return JSON.stringify({
    access_token: data.access_token ?? "",
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  } satisfies TokenBundle);
}

async function refreshAccessToken(
  provider: string,
  refreshToken: string,
  currentAccessToken: string,
): Promise<TokenBundle> {
  const tokenUrl =
    provider === "gmail"
      ? "https://oauth2.googleapis.com/token"
      : "https://login.microsoftonline.com/common/oauth2/v2.0/token";
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: provider === "gmail" ? GOOGLE_CLIENT_ID : MICROSOFT_CLIENT_ID,
    client_secret:
      provider === "gmail"
        ? (process.env.GOOGLE_CLIENT_SECRET ?? "")
        : (process.env.MICROSOFT_CLIENT_SECRET ?? ""),
  });
  const r = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const data = (await r.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!r.ok || data.error) throw new Error(`Token refresh failed: ${data.error ?? r.status}`);
  return {
    access_token: data.access_token ?? currentAccessToken,
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

export async function getValidAccessToken(
  provider: string,
  storedBundle: string,
): Promise<string> {
  let bundle: TokenBundle;
  try {
    bundle = JSON.parse(storedBundle) as TokenBundle;
  } catch {
    return storedBundle;
  }
  if (!bundle.refresh_token || Date.now() < bundle.expires_at - 60_000) {
    return bundle.access_token;
  }
  const refreshed = await refreshAccessToken(provider, bundle.refresh_token, bundle.access_token);
  return refreshed.access_token;
}

// ── Provider inbox fetch ───────────────────────────────────────────────────────

export interface InboxEmail {
  messageId: string;
  from: string;
  subject: string;
  receivedDate: string;
  snippet?: string;
}

interface GmailHeader {
  name: string;
  value: string;
}
interface GmailMessage {
  id: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: GmailHeader[] };
}
interface OutlookEmailAddress {
  address?: string;
}
interface OutlookMessage {
  id: string;
  subject?: string;
  receivedDateTime?: string;
  bodyPreview?: string;
  from?: { emailAddress?: OutlookEmailAddress };
}

export async function fetchGmailInbox(accessToken: string): Promise<InboxEmail[]> {
  const q = encodeURIComponent(
    "subject:(application OR interview OR offer OR rejected OR status) newer_than:90d",
  );
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!listRes.ok) throw new Error(`Gmail list error: ${listRes.status}`);
  const { messages = [] } = (await listRes.json()) as { messages?: Array<{ id: string }> };

  const emails: InboxEmail[] = [];
  for (const { id } of messages.slice(0, 50)) {
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}` +
        `?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!r.ok) continue;
    const msg = (await r.json()) as GmailMessage;
    const get = (name: string) =>
      msg.payload?.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
    emails.push({
      messageId: msg.id,
      from: get("from"),
      subject: get("subject"),
      receivedDate: new Date(parseInt(msg.internalDate ?? "0")).toISOString().split("T")[0],
      snippet: msg.snippet,
    });
  }
  return emails;
}

export async function fetchOutlookInbox(accessToken: string): Promise<InboxEmail[]> {
  const filter = encodeURIComponent(
    "contains(subject,'application') or contains(subject,'interview') or contains(subject,'offer')",
  );
  const r = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages` +
      `?$filter=${filter}&$select=id,subject,from,receivedDateTime,bodyPreview` +
      `&$top=50&$orderby=receivedDateTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!r.ok) throw new Error(`Outlook fetch error: ${r.status}`);
  const { value = [] } = (await r.json()) as { value?: OutlookMessage[] };
  return value.map((m) => ({
    messageId: m.id,
    from: m.from?.emailAddress?.address ?? "",
    subject: m.subject ?? "",
    receivedDate: (m.receivedDateTime ?? "").split("T")[0],
    snippet: m.bodyPreview,
  }));
}

// ── Email parser ───────────────────────────────────────────────────────────────

export const KNOWN_SENDER_DOMAINS = new Set([
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "angel.co",
  "wellfound.com",
  "greenhouse.io",
  "lever.co",
  "workday.com",
  "ashbyhq.com",
  "recruitee.com",
]);

export const DOMAIN_TO_PLATFORM: Record<string, string> = {
  "linkedin.com": "linkedin",
  "indeed.com": "indeed",
  "glassdoor.com": "glassdoor",
  "angel.co": "wellfound",
  "wellfound.com": "wellfound",
  "greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "workday.com": "workday",
  "ashbyhq.com": "ashby",
  "recruitee.com": "recruitee",
};

export function senderToPlatform(from: string): string {
  const domain = from.replace(/.*@/, "").toLowerCase().trim();
  return DOMAIN_TO_PLATFORM[domain] ?? "other";
}

export function isPromotionalEmail(subject: string, from: string): boolean {
  const subj = subject.toLowerCase();
  const frm = from.toLowerCase();
  if (/newsletter|unsubscribe|open position|job alert|new job|promotional/.test(subj)) return true;
  if (/marketing\.|newsletter\.|@campaigns\./.test(frm)) return true;
  return false;
}

export function parseStatusFromSubject(subject: string): string {
  const s = subject.toLowerCase();
  if (/\b(offer|we.?d like to offer|congratulations.*offer|pleased to offer)\b/.test(s))
    return "offer";
  if (
    /\b(interview|invited to interview|schedule.*interview|please.*schedule|phone screen|technical screen)\b/.test(
      s,
    )
  )
    return "interview";
  if (
    /\b(shortlisted|moved forward|under review|reviewing your|screening|assessment)\b/.test(s)
  )
    return "screening";
  if (
    /\b(regret|not moving forward|unfortunately|not.*selected|we won.?t|no longer|unsuccessful)\b/.test(
      s,
    )
  )
    return "rejected";
  return "applied";
}

export function extractCompanyFromSubject(subject: string): string | null {
  const m = subject.match(/\bat\s+((?:[A-Z][A-Za-z0-9&.]+)(?:\s+[A-Z][A-Za-z0-9&.]+)*)/);
  return m ? m[1].trim() : null;
}

export function extractJobTitleFromSubject(subject: string): string | null {
  const m = subject.match(
    /(?:application\s+(?:to|for|received[:\s]+)|invitation[:\s]+|for\s+the)\s+((?:[A-Z][A-Za-z0-9&+./-]+)(?:\s+[A-Z][A-Za-z0-9&+./-]+)*)\s+at\b/i,
  );
  return m ? m[1].trim() : null;
}

export interface ParsedEmailApp {
  emailMessageId: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string;
  source: "email";
}

export function parseInboxEmails(emails: InboxEmail[]): ParsedEmailApp[] {
  return emails
    .filter((e) => KNOWN_SENDER_DOMAINS.has(e.from.replace(/.*@/, "").toLowerCase().trim()))
    .filter((e) => !isPromotionalEmail(e.subject, e.from))
    .map((e) => ({
      emailMessageId: e.messageId,
      jobTitle: extractJobTitleFromSubject(e.subject) ?? "Software Engineer",
      companyName: extractCompanyFromSubject(e.subject) ?? "Unknown Company",
      platform: senderToPlatform(e.from),
      status: parseStatusFromSubject(e.subject),
      appliedDate: e.receivedDate,
      source: "email" as const,
    }));
}

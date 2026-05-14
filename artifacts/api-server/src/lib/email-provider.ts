export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "DEMO_GOOGLE_CLIENT_ID";
export const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID ?? "DEMO_MICROSOFT_CLIENT_ID";
export const IS_DEMO =
  GOOGLE_CLIENT_ID === "DEMO_GOOGLE_CLIENT_ID" ||
  MICROSOFT_CLIENT_ID === "DEMO_MICROSOFT_CLIENT_ID";

export interface InboxEmail {
  messageId: string;
  from: string;
  subject: string;
  receivedDate: string;
  snippet?: string;
}

interface GmailHeader { name: string; value: string; }
interface GmailMessage {
  id: string; internalDate?: string; snippet?: string;
  payload?: { headers?: GmailHeader[] };
}
interface OutlookEmailAddress { address?: string; }
interface OutlookMessage {
  id: string; subject?: string; receivedDateTime?: string; bodyPreview?: string;
  from?: { emailAddress?: OutlookEmailAddress };
}

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
    refresh_token?: string; access_token?: string; error?: string;
  };
  if (!r.ok || data.error) throw new Error(`Token exchange failed: ${data.error ?? r.status}`);
  return data.refresh_token ?? data.access_token ?? "";
}

export async function fetchGmailInbox(accessToken: string): Promise<InboxEmail[]> {
  const q = encodeURIComponent(
    "subject:(application OR interview OR offer OR rejected OR status) newer_than:90d",
  );
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=50`;
  const listRes = await fetch(listUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
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
      snippet: msg.snippet ?? "",
    });
  }
  return emails;
}

export async function fetchOutlookInbox(accessToken: string): Promise<InboxEmail[]> {
  const filter = encodeURIComponent(
    "contains(subject,'application') or contains(subject,'interview') or contains(subject,'offer')",
  );
  const url =
    `https://graph.microsoft.com/v1.0/me/messages` +
    `?$filter=${filter}&$select=id,subject,from,receivedDateTime,bodyPreview` +
    `&$top=50&$orderby=receivedDateTime desc`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!r.ok) throw new Error(`Outlook fetch error: ${r.status}`);
  const { value = [] } = (await r.json()) as { value?: OutlookMessage[] };
  return value.map((m) => ({
    messageId: m.id,
    from: m.from?.emailAddress?.address ?? "",
    subject: m.subject ?? "",
    receivedDate: (m.receivedDateTime ?? "").split("T")[0],
    snippet: m.bodyPreview ?? "",
  }));
}

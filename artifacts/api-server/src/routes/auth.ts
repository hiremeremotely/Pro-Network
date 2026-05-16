import { Router, type IRouter } from "express";
import { createHash, createHmac } from "crypto";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";
import { IS_DEMO, DEMO_TOKEN_BUNDLE } from "../lib/email-provider";
import { encryptToken } from "../lib/crypto";

const router: IRouter = Router();

const GMAIL_DOMAINS = ["@gmail.com", "@googlemail.com"];
const OUTLOOK_DOMAINS = ["@outlook.com", "@hotmail.com", "@live.com", "@msn.com"];

async function autoConnectEmailByDomain(profileId: number, email: string): Promise<void> {
  if (!IS_DEMO) return;
  const lower = email.toLowerCase();
  const updates: Record<string, unknown> = {};
  if (GMAIL_DOMAINS.some((d) => lower.endsWith(d))) {
    updates.gmailConnected = true;
    updates.gmailToken = encryptToken(DEMO_TOKEN_BUNDLE);
  }
  if (OUTLOOK_DOMAINS.some((d) => lower.endsWith(d))) {
    updates.outlookConnected = true;
    updates.outlookToken = encryptToken(DEMO_TOKEN_BUNDLE);
  }
  if (Object.keys(updates).length > 0) {
    await db.update(profilesTable).set(updates).where(eq(profilesTable.id, profileId));
  }
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "hmr_salt_2026").digest("hex");
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required but not set");
  return secret;
}

export function generateAuthToken(profileId: number): string {
  const hmac = createHmac("sha256", getSessionSecret()).update(String(profileId)).digest("hex");
  return `${profileId}:${hmac}`;
}

export function validateAuthToken(token: string): number | null {
  const colonIdx = token.lastIndexOf(":");
  if (colonIdx < 0) return null;
  const profileIdStr = token.slice(0, colonIdx);
  const providedHmac = token.slice(colonIdx + 1);
  const profileId = parseInt(profileIdStr, 10);
  if (isNaN(profileId) || profileId <= 0) return null;
  let secret: string;
  try { secret = getSessionSecret(); } catch { return null; }
  const expectedHmac = createHmac("sha256", secret).update(String(profileId)).digest("hex");
  if (providedHmac !== expectedHmac) return null;
  return profileId;
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, accountType = "individual", headline = "", location = "", industry = "", interests = [] } = req.body as {
    name?: string; email?: string; password?: string;
    accountType?: string; headline?: string; location?: string;
    industry?: string; interests?: string[];
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email and password are required." });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const existing = await db.select({ id: profilesTable.id }).from(profilesTable).where(eq(profilesTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const [profile] = await db.insert(profilesTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
    accountType: accountType as "individual" | "company",
    headline: headline || (accountType === "company" ? "Company on Hire Me Remotely" : "Professional on Hire Me Remotely"),
    location: location || undefined,
    industry: industry || undefined,
    interests: Array.isArray(interests) ? interests : [],
    openToWork: false,
  }).returning();

  await autoConnectEmailByDomain(profile.id, email);
  const { passwordHash: _pw, ...safe } = profile;
  res.status(201).json({ profile: safe, authToken: generateAuthToken(profile.id) });
});

router.get("/auth/check-email", async (req, res): Promise<void> => {
  const { email } = req.query as { email?: string };
  if (!email) { res.status(400).json({ error: "email is required." }); return; }
  const [profile] = await db
    .select({ accountType: profilesTable.accountType })
    .from(profilesTable)
    .where(eq(profilesTable.email, email));
  if (!profile) { res.json({ exists: false }); return; }
  res.json({ exists: true, accountType: profile.accountType });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.email, email));

  if (!profile || !profile.passwordHash) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (profile.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  await autoConnectEmailByDomain(profile.id, profile.email);
  const { passwordHash: _pw, ...safe } = profile;
  res.json({ profile: safe, authToken: generateAuthToken(profile.id) });
});

export default router;

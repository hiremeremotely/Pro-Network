import { Router, type IRouter } from "express";
import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { eq, sql } from "drizzle-orm";
import { clerkClient, getAuth } from "@clerk/express";
import { db, profilesTable } from "@workspace/db";
import { IS_DEMO, DEMO_TOKEN_BUNDLE } from "../lib/email-provider";
import { encryptToken } from "../lib/crypto";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const GMAIL_DOMAINS = ["@gmail.com", "@googlemail.com"];
const OUTLOOK_DOMAINS = ["@outlook.com", "@hotmail.com", "@live.com", "@msn.com"];

const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.es", "hotmail.it",
  "outlook.com", "outlook.co.uk", "outlook.fr", "outlook.de",
  "live.com", "live.co.uk", "live.fr",
  "msn.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "aol.com",
  "zoho.com",
  "yandex.com", "yandex.ru",
  "mail.com", "email.com",
  "inbox.com",
  "gmx.com", "gmx.net", "gmx.de",
  "web.de",
  "qq.com", "163.com", "126.com",
]);

function isConsumerDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  return CONSUMER_DOMAINS.has(domain);
}

export async function autoConnectEmailByDomain(profileId: number, email: string): Promise<void> {
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
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

function verifyPassword(password: string, stored: string): { valid: boolean; needsRehash: boolean } {
  // Keep existing accounts usable while progressively moving them away from the
  // legacy SHA-256 scheme. New credentials are always scrypt hashes.
  if (stored.startsWith("scrypt$")) {
    try {
      const [, n, r, p, saltText, digestText] = stored.split("$");
      const digest = Buffer.from(digestText, "base64url");
      const actual = scryptSync(password, Buffer.from(saltText, "base64url"), digest.length, {
        N: Number(n), r: Number(r), p: Number(p),
      });
      return { valid: actual.length === digest.length && timingSafeEqual(actual, digest), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  const legacy = createHash("sha256").update(password + "hmr_salt_2026").digest("hex");
  return { valid: stored.length === legacy.length && timingSafeEqual(Buffer.from(stored), Buffer.from(legacy)), needsRehash: true };
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET environment variable is required but not set");
  return secret;
}

export function generateAuthToken(profileId: number): string {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const nonce = randomBytes(32).toString("base64url");
  const payload = `${profileId}:${expiresAt}:${nonce}`;
  const hmac = createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
  return `${payload}:${hmac}`;
}

export function validateAuthToken(token: string): number | null {
  const parts = token.split(":");
  if (parts.length !== 4) return null;
  const [profileIdStr, expiresText, nonce, providedHmac] = parts;
  const profileId = parseInt(profileIdStr, 10);
  const expiresAt = Number(expiresText);
  if (isNaN(profileId) || profileId <= 0 || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() || !nonce) return null;
  let secret: string;
  try { secret = getSessionSecret(); } catch { return null; }
  const payload = `${profileId}:${expiresAt}:${nonce}`;
  const expectedHmac = createHmac("sha256", secret).update(payload).digest("base64url");
  if (providedHmac.length !== expectedHmac.length ||
      !timingSafeEqual(Buffer.from(providedHmac), Buffer.from(expectedHmac))) return null;
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

  if (accountType === "company" && isConsumerDomain(email)) {
    res.status(400).json({ error: "Business email required", message: "Company accounts require a business email address." });
    return;
  }

  const existing = await db.select({ id: profilesTable.id }).from(profilesTable).where(eq(profilesTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

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
    emailVerified: false,
    emailVerificationToken: tokenHash,
    emailVerificationTokenExpiry: expiry,
  }).returning();

  await autoConnectEmailByDomain(profile.id, email);
  const { passwordHash: _pw, emailVerificationToken: _evt, emailVerificationTokenExpiry: _evx, resetToken: _rt, resetTokenExpiry: _rtx, gmailToken: _gt, outlookToken: _ot, ...safe } = profile;
  const demoToken = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true" ? { verificationToken: rawToken } : {};
  res.status(201).json({ profile: safe, ...demoToken });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body as { token?: string };
  if (!token) { res.status(400).json({ error: "Token is required." }); return; }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.emailVerificationToken, tokenHash));

  if (!profile) { res.status(400).json({ error: "Invalid or expired verification link." }); return; }
  if (!profile.emailVerificationTokenExpiry || profile.emailVerificationTokenExpiry < new Date()) {
    res.status(400).json({ error: "This verification link has expired. Please request a new one." }); return;
  }

  await db.update(profilesTable)
    .set({ emailVerified: true, emailVerificationToken: null, emailVerificationTokenExpiry: null })
    .where(eq(profilesTable.id, profile.id));

  const { passwordHash: _pw, emailVerificationToken: _evt, emailVerificationTokenExpiry: _evx, resetToken: _rt, resetTokenExpiry: _rtx, gmailToken: _gt, outlookToken: _ot, ...safe } = profile;
  res.json({ profile: { ...safe, emailVerified: true }, authToken: generateAuthToken(profile.id), message: "Email verified successfully." });
});

router.post("/auth/resend-verification", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email is required." }); return; }

  const [profile] = await db
    .select({ id: profilesTable.id, email: profilesTable.email, emailVerified: profilesTable.emailVerified })
    .from(profilesTable)
    .where(eq(profilesTable.email, email));

  if (!profile) {
    res.json({ message: "If that email is registered and unverified, a new link has been sent." });
    return;
  }
  if (profile.emailVerified) {
    // Keep the response indistinguishable from the unknown-email path.
    res.json({ message: "If that email is registered and unverified, a new link has been sent." });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.update(profilesTable)
    .set({ emailVerificationToken: tokenHash, emailVerificationTokenExpiry: expiry })
    .where(eq(profilesTable.id, profile.id));

  const demoToken = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true" ? { verificationToken: rawToken } : {};
  res.json({ ...demoToken, message: "If that email is registered and unverified, a new link has been sent." });
});

router.post("/auth/token", async (req, res): Promise<void> => {
  if (!IS_DEMO) { res.status(403).json({ error: "Only available in demo mode" }); return; }
  const profileId = parseInt(req.body?.profileId, 10);
  if (!profileId || profileId <= 0) { res.status(400).json({ error: "profileId required" }); return; }
  const [profile] = await db.select({ id: profilesTable.id, emailVerified: profilesTable.emailVerified }).from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  if (!profile.emailVerified) { res.status(403).json({ error: "unverified", message: "Please verify your email address before signing in." }); return; }
  res.json({ authToken: generateAuthToken(profile.id) });
});

router.get("/auth/check-email", async (req, res): Promise<void> => {
  const { email } = req.query as { email?: string };
  if (!email) { res.status(400).json({ error: "email is required." }); return; }
  const [profile] = await db
    .select({ accountType: profilesTable.accountType })
    .from(profilesTable)
    .where(eq(profilesTable.email, email));
  // This endpoint is intentionally non-disclosing; callers must not be able to
  // probe whether an address is registered.
  void profile;
  res.json({ exists: false });
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

  const passwordCheck = verifyPassword(password, profile.passwordHash);
  if (!passwordCheck.valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (!profile.emailVerified) {
    res.status(403).json({ error: "unverified", message: "Please verify your email address before signing in." });
    return;
  }

  if (passwordCheck.needsRehash) {
    await db.update(profilesTable).set({ passwordHash: hashPassword(password) }).where(eq(profilesTable.id, profile.id));
  }
  if (profile.email) await autoConnectEmailByDomain(profile.id, profile.email);
  req.session.profileId = profile.id;
  const { passwordHash: _pw, emailVerificationToken: _evt, emailVerificationTokenExpiry: _evx, resetToken: _rt, resetTokenExpiry: _rtx, gmailToken: _gt, outlookToken: _ot, ...safe } = profile;
  res.json({ profile: safe, authToken: generateAuthToken(profile.id) });
});

// Bridge a verified Clerk identity into the existing local profile/session
// system. Identity and email are read exclusively from Clerk's server APIs.
router.post("/auth/clerk-bridge", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Clerk authentication required." });
    return;
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primary = clerkUser.emailAddresses.find(
    (address) => address.id === clerkUser.primaryEmailAddressId,
  );
  if (!primary || primary.verification?.status !== "verified") {
    res.status(403).json({ error: "A verified primary email is required." });
    return;
  }

  const email = primary.emailAddress.trim().toLowerCase();
  let [profile] = await db
    .select()
    .from(profilesTable)
    .where(sql`lower(${profilesTable.email}) = ${email}`)
    .limit(1);

  if (!profile) {
    const name = clerkUser.fullName?.trim() || clerkUser.firstName?.trim() || email.split("@")[0];
    [profile] = await db.insert(profilesTable).values({
      name,
      email,
      accountType: "individual",
      headline: "Professional on Hire Me Remotely",
      emailVerified: true,
      openToWork: false,
      interests: [],
      customLinks: [],
    }).returning();
  }

  req.session.profileId = profile.id;
  const { passwordHash: _pw, emailVerificationToken: _evt, emailVerificationTokenExpiry: _evx, resetToken: _rt, resetTokenExpiry: _rtx, gmailToken: _gt, outlookToken: _ot, ...safe } = profile;
  res.json({ profile: safe, authToken: generateAuthToken(profile.id) });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const profileId = req.session.profileId;
  if (!profileId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, profileId));
  if (!profile) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session expired" });
    return;
  }
  const { passwordHash: _pw, emailVerificationToken: _evt, emailVerificationTokenExpiry: _evx, resetToken: _rt, resetTokenExpiry: _rtx, gmailToken: _gt, outlookToken: _ot, ...safe } = profile;
  res.json({ profile: safe, authToken: generateAuthToken(profile.id) });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) logger.warn({ err }, "Failed to destroy session on logout");
    res.clearCookie("hmr.sid");
    res.json({ ok: true });
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email is required." }); return; }

  const [profile] = await db
    .select({ id: profilesTable.id, email: profilesTable.email })
    .from(profilesTable)
    .where(eq(profilesTable.email, email));

  if (!profile) {
    // Don't reveal whether the email exists
    res.json({ message: "If that email is registered, a reset link has been sent." });
    return;
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.update(profilesTable)
    .set({ resetToken: tokenHash, resetTokenExpiry: expiry })
    .where(eq(profilesTable.id, profile.id));

  const demoToken = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true" ? { resetToken: rawToken } : {};
  res.json({ ...demoToken, message: "If that email is registered, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) { res.status(400).json({ error: "Token and password are required." }); return; }
  if (password.length < 6) { res.status(400).json({ error: "Password must be at least 6 characters." }); return; }

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [profile] = await db
    .select({ id: profilesTable.id, resetToken: profilesTable.resetToken, resetTokenExpiry: profilesTable.resetTokenExpiry })
    .from(profilesTable)
    .where(eq(profilesTable.resetToken, tokenHash));

  if (!profile) { res.status(400).json({ error: "Invalid or expired reset link." }); return; }
  if (!profile.resetTokenExpiry || profile.resetTokenExpiry < new Date()) {
    res.status(400).json({ error: "This reset link has expired. Please request a new one." }); return;
  }

  await db.update(profilesTable)
    .set({ passwordHash: hashPassword(password), resetToken: null, resetTokenExpiry: null })
    .where(eq(profilesTable.id, profile.id));

  res.json({ message: "Password updated successfully." });
});

export default router;

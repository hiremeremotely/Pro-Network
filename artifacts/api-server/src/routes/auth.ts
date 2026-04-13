import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, profilesTable } from "@workspace/db";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "hmr_salt_2026").digest("hex");
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

  const { passwordHash: _pw, ...safe } = profile;
  res.status(201).json({ profile: safe });
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

  const { passwordHash: _pw, ...safe } = profile;
  res.json({ profile: safe });
});

export default router;

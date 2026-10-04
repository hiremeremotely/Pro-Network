import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derived = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): { valid: boolean; needsRehash: boolean } {
  if (stored.startsWith("scrypt$")) {
    try {
      const parts = stored.split("$");
      const [, n, r, p, saltText, digestText] = parts;
      if (parts.length !== 6 || n !== "16384" || r !== "8" || p !== "1") {
        return { valid: false, needsRehash: false };
      }
      const salt = Buffer.from(saltText, "base64url");
      const digest = Buffer.from(digestText, "base64url");
      if (salt.length !== 16 || digest.length !== 64) return { valid: false, needsRehash: false };
      const actual = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
      return { valid: timingSafeEqual(actual, digest), needsRehash: false };
    } catch {
      return { valid: false, needsRehash: false };
    }
  }
  // Preserve existing password accounts; upgrade their hashes after sign-in.
  const legacy = createHash("sha256").update(password + "hmr_salt_2026").digest("hex");
  return {
    valid: /^[a-f0-9]{64}$/.test(stored) && timingSafeEqual(Buffer.from(stored), Buffer.from(legacy)),
    needsRehash: true,
  };
}
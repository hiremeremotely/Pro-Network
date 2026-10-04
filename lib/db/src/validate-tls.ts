/**
 * Validate the effective environment without parsing it through pg (which may
 * read certificate files or include untrusted input in errors). Errors contain
 * setting names only, never URLs, values, or parser error causes.
 */
export function validateProductionDatabaseTls(
  env: Record<string, string | undefined> = process.env,
): void {
  if (env.NODE_ENV !== "production") return;

  const fail = (message: string): never => {
    throw new Error(`Production database TLS configuration rejected: ${message}`);
  };

  if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    fail("NODE_TLS_REJECT_UNAUTHORIZED must not disable TLS verification.");
  }
  if (env.PGSSLMODE !== undefined && env.PGSSLMODE !== "verify-full") {
    fail("PGSSLMODE must be verify-full when set.");
  }

  // pg-connection-string re-encodes the entire URL when it finds raw spaces or
  // malformed percent escapes. That can turn an encoded sslmode name into an
  // unrecognized key even though WHATWG URL recognizes it. Reject ambiguous
  // forms rather than validating a different URL from the one pg will use.
  const connectionString = env.DATABASE_URL ?? "";
  if (/[\u0000-\u0020\u007f]|%(?![a-f0-9]{2})/i.test(connectionString)) {
    fail("DATABASE_URL must use valid percent encoding and no raw whitespace or control characters.");
  }

  let url!: URL;
  try {
    url = new URL(connectionString);
  } catch {
    fail("DATABASE_URL must be a valid PostgreSQL URL.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname
      || /^%2f/i.test(url.hostname)) {
    fail("DATABASE_URL must specify a PostgreSQL TCP endpoint.");
  }

  const params = url.searchParams;
  // Check every occurrence, including duplicates and encoded parameter names.
  // Reject differently cased names rather than relying on pg ignoring them.
  for (const [key, value] of params) {
    switch (key.toLowerCase()) {
      case "sslmode":
        if (key !== "sslmode" || value !== "verify-full") {
          fail("DATABASE_URL sslmode must be verify-full when set.");
        }
        break;
      case "ssl":
        if (key !== "ssl" || !["true", "1"].includes(value)) {
          fail("DATABASE_URL ssl must not disable TLS verification.");
        }
        break;
      case "rejectunauthorized":
      case "sslrejectunauthorized":
        if (value !== "true" && value !== "1") {
          fail("DATABASE_URL must not disable certificate verification.");
        }
        break;
      case "checkserveridentity":
        return fail("DATABASE_URL must not override hostname verification.");
      case "host":
        if (!value || value.startsWith("/") || key !== "host") {
          fail("DATABASE_URL must specify a PostgreSQL TCP endpoint.");
        }
        break;
    }
  }

  if (!params.has("sslmode") && env.PGSSLMODE !== "verify-full") {
    fail("Set DATABASE_URL sslmode=verify-full or PGSSLMODE=verify-full explicitly.");
  }
}
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./middlewares/require-auth";

// ── Allowed CORS origins ──────────────────────────────────────────────────────
// Production domains come from REPLIT_DOMAINS (comma-separated, no protocol).
// The Replit dev-preview domain comes from REPLIT_DEV_DOMAIN.
// We always allow localhost variants for local development.
function buildAllowedOrigins(): string[] {
  const origins: string[] = [];
  const isProd = process.env.NODE_ENV === "production";

  // Production domains from REPLIT_DOMAINS (comma-separated, no protocol)
  const replitDomains = process.env.REPLIT_DOMAINS ?? "";
  for (const domain of replitDomains.split(",").map(d => d.trim()).filter(Boolean)) {
    origins.push(`https://${domain}`);
  }

  // Development-only: Replit dev-preview domain and localhost variants
  if (!isProd) {
    const devDomain = process.env.REPLIT_DEV_DOMAIN ?? "";
    if (devDomain) {
      origins.push(`https://${devDomain}`);
    }

    origins.push("http://localhost");
    origins.push("http://127.0.0.1");
    for (const port of [3000, 4000, 5000, 5173, 8080]) {
      origins.push(`http://localhost:${port}`);
      origins.push(`http://127.0.0.1:${port}`);
    }
  }

  return [...new Set(origins)];
}

const allowedOrigins = buildAllowedOrigins();
logger.info({ allowedOrigins }, "CORS allowed origins");

// ── Rate limiters ─────────────────────────────────────────────────────────────
// All values are configurable via environment variables so production limits
// can be tuned without code changes.
function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw ?? fallback);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

const RATE_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS,       60_000);
const RATE_MAX       = parsePositiveInt(process.env.RATE_LIMIT_MAX,               200);
const AUTH_WINDOW_MS = parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS,  60_000);
const AUTH_MAX       = parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX,           10);

const TOO_MANY = { error: "Too many requests. Please try again later." };

const generalLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: RATE_MAX,
  standardHeaders: true,   // Retry-After + RateLimit-* headers per RFC 9110
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(TOO_MANY),
});

// Strict limiter for credential-sensitive endpoints only (login, register,
// password recovery). Other /api/auth/* routes (verify-email, token) are
// covered by the general limiter.
const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(TOO_MANY),
});

logger.info(
  { general: `${RATE_MAX}/${RATE_WINDOW_MS}ms`, auth: `${AUTH_MAX}/${AUTH_WINDOW_MS}ms` },
  "Rate limiters configured",
);

const app: Express = express();

// Trust the first proxy hop so req.ip reflects the real client IP behind
// Replit's reverse proxy, keeping per-IP rate limiting meaningful.
// Set TRUST_PROXY=0 to disable in environments without a reverse proxy.
// Accepts any non-negative integer; falls back to 1 for invalid/missing values.
function parseTrustProxy(raw: string | undefined): number {
  if (raw === undefined) return 1; // default: trust one hop (Replit always proxies)
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 1;
}
const trustProxy = parseTrustProxy(process.env.TRUST_PROXY);
app.set("trust proxy", trustProxy);
logger.info({ trustProxy }, "Express trust proxy");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && !allowedOrigins.includes(requestOrigin)) {
    logger.warn({ origin: requestOrigin }, "CORS: origin rejected");
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
});

app.use(
  cors({
    origin(requestOrigin, callback) {
      // Same-origin requests (no Origin header) are always allowed
      if (!requestOrigin) return callback(null, true);
      if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
      // Should not reach here after the guard above, but be safe
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Session middleware ────────────────────────────────────────────────────────
// HTTP-only cookie session backed by PostgreSQL (connect-pg-simple).
// Sessions table is created automatically on first run if missing.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) throw new Error("SESSION_SECRET environment variable is required but not set");

const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      pruneSessionInterval: 60,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: "hmr.sid",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);
logger.info("Session middleware configured");

// ── Strict limiter only on brute-force-sensitive credential endpoints ─────────
const AUTH_STRICT_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];
for (const path of AUTH_STRICT_PATHS) app.use(path, authLimiter);

// General rate limiter + auth guard on all /api routes.
// /api/auth/* and /api/healthz are public (no session required).
app.use(
  "/api",
  generalLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth") || req.path === "/healthz" || req.path === "/sitemap.xml") return next();
    requireAuth(req, res, next);
  },
  router,
);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err }, "Unhandled error");
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default app;

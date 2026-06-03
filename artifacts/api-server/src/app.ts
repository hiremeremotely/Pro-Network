import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

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
const RATE_WINDOW_MS   = Number(process.env.RATE_LIMIT_WINDOW_MS  ?? 60_000); // 1 min
const RATE_MAX         = Number(process.env.RATE_LIMIT_MAX         ?? 200);    // 200 req/min
const AUTH_WINDOW_MS   = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 60_000);
const AUTH_MAX         = Number(process.env.AUTH_RATE_LIMIT_MAX       ?? 10);  // 10 req/min

const TOO_MANY = { error: "Too many requests. Please try again later." };

const generalLimiter = rateLimit({
  windowMs: RATE_WINDOW_MS,
  max: RATE_MAX,
  standardHeaders: true,   // Retry-After + RateLimit-* headers
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(TOO_MANY),
});

const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: AUTH_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json(TOO_MANY),
});

logger.info(
  { generalLimiter: `${RATE_MAX} req/${RATE_WINDOW_MS}ms`, authLimiter: `${AUTH_MAX} req/${AUTH_WINDOW_MS}ms` },
  "Rate limiters configured",
);

const app: Express = express();

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

// Auth endpoints get the strict limiter first, then also hit the general one
app.use("/api/auth", authLimiter);
// All API routes share the general limiter
app.use("/api", generalLimiter, router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;

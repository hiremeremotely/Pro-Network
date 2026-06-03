import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

// ── Allowed CORS origins ──────────────────────────────────────────────────────
// Production domains come from REPLIT_DOMAINS (comma-separated, no protocol).
// The Replit dev-preview domain comes from REPLIT_DEV_DOMAIN.
// We always allow localhost variants for local development.
function buildAllowedOrigins(): string[] {
  const origins: string[] = [];

  const replitDomains = process.env.REPLIT_DOMAINS ?? "";
  for (const domain of replitDomains.split(",").map(d => d.trim()).filter(Boolean)) {
    origins.push(`https://${domain}`);
  }

  const devDomain = process.env.REPLIT_DEV_DOMAIN ?? "";
  if (devDomain) {
    origins.push(`https://${devDomain}`);
  }

  // Always allow localhost (any port) for dev
  origins.push("http://localhost");
  origins.push("http://127.0.0.1");
  for (const port of [3000, 4000, 5000, 5173, 8080]) {
    origins.push(`http://localhost:${port}`);
    origins.push(`http://127.0.0.1:${port}`);
  }

  return [...new Set(origins)];
}

const allowedOrigins = buildAllowedOrigins();
logger.info({ allowedOrigins }, "CORS allowed origins");

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

app.use("/api", router);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;

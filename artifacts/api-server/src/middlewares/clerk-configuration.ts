import type { RequestHandler } from "express";

/**
 * Missing deployment credentials must not bypass authentication or produce an
 * opaque Clerk exception on every request. Liveness is mounted before this.
 */
export function clerkConfigurationGuard(
  getSecretKey: () => string | undefined = () => process.env.CLERK_SECRET_KEY,
): RequestHandler {
  return (_req, res, next) => {
    if (!getSecretKey()?.trim()) {
      res.setHeader("Cache-Control", "no-store");
      res.status(503).json({
        code: "AUTH_NOT_CONFIGURED",
        error: "Authentication is unavailable. Please try again later.",
      });
      return;
    }
    next();
  };
}
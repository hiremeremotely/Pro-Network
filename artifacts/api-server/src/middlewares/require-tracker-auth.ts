import { Request, Response, NextFunction } from "express";
import { validateAuthToken } from "../routes/auth";

export function requireTrackerAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized — missing Bearer token" });
    return;
  }
  const profileId = validateAuthToken(auth.slice(7));
  if (profileId === null) {
    res.status(401).json({ error: "Unauthorized — invalid or tampered token" });
    return;
  }
  res.locals.callerProfileId = profileId;
  next();
}

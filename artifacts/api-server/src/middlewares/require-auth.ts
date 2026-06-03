import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.profileId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

import type { Request } from "express";

export async function establishProfileSession(req: Request, profileId: number): Promise<void> {
  // Rotate the identifier at login to prevent session fixation. Keep the
  // response pending until PostgreSQL has persisted the authenticated session.
  await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.profileId = profileId;
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
}
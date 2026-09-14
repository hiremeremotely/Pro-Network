import "express-session";

declare module "express-session" {
  interface SessionData {
    profileId?: number;
    isAdmin?: boolean;
    adminEmail?: string;
  }
}

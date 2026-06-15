import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { sql, desc, eq } from "drizzle-orm";
import { db, profilesTable, jobsTable, applicationsTable, postsTable } from "@workspace/db";

const router: IRouter = Router();

// ── Admin credentials — set via environment variables in production ───────────
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@hiremeremotely.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@2026";
const ADMIN_TOKEN    = process.env.ADMIN_TOKEN    ?? "bo_super_admin_token_2026";

// ── Middleware: require valid admin token ─────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"] ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token === ADMIN_TOKEN) { next(); return; }
  res.status(401).json({ error: "Unauthorised" });
}

router.post("/admin/login", (req, res): void => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    res.json({ success: true, token: ADMIN_TOKEN, name: "Super Admin", email: ADMIN_EMAIL });
  } else {
    res.status(401).json({ success: false, message: "Invalid email or password." });
  }
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [
    totalUsersResult,
    totalCompaniesResult,
    totalJobsResult,
    totalApplicationsResult,
    totalPostsResult,
    openToWorkResult,
    featuredJobsResult,
    appsByStatusResult,
    jobsByCategoryResult,
    recentProfilesResult,
    recentJobsResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.accountType, "individual")),
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.accountType, "company")),
    db.select({ count: sql<number>`count(*)` }).from(jobsTable),
    db.select({ count: sql<number>`count(*)` }).from(applicationsTable),
    db.select({ count: sql<number>`count(*)` }).from(postsTable),
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.openToWork, true)),
    db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(eq(jobsTable.featured, true)),
    db.select({ status: applicationsTable.status, count: sql<number>`count(*)` })
      .from(applicationsTable)
      .groupBy(applicationsTable.status),
    db.select({ category: jobsTable.category, count: sql<number>`count(*)` })
      .from(jobsTable)
      .groupBy(jobsTable.category)
      .orderBy(desc(sql`count(*)`)),
    db.select().from(profilesTable).orderBy(desc(profilesTable.createdAt)).limit(10),
    db.select().from(jobsTable).orderBy(desc(jobsTable.createdAt)).limit(10),
  ]);

  res.json({
    stats: {
      totalUsers: Number(totalUsersResult[0]?.count ?? 0),
      totalCompanies: Number(totalCompaniesResult[0]?.count ?? 0),
      totalJobs: Number(totalJobsResult[0]?.count ?? 0),
      totalApplications: Number(totalApplicationsResult[0]?.count ?? 0),
      totalPosts: Number(totalPostsResult[0]?.count ?? 0),
      openToWork: Number(openToWorkResult[0]?.count ?? 0),
      featuredJobs: Number(featuredJobsResult[0]?.count ?? 0),
    },
    applicationsByStatus: appsByStatusResult.map((r) => ({
      status: r.status,
      count: Number(r.count),
    })),
    jobsByCategory: jobsByCategoryResult.map((r) => ({
      category: r.category,
      count: Number(r.count),
    })),
    recentProfiles: recentProfilesResult,
    recentJobs: recentJobsResult,
  });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const { accountType, search, limit = "50", offset = "0" } = req.query as Record<string, string>;

  let query = db.select().from(profilesTable).$dynamic();

  if (accountType) {
    query = query.where(eq(profilesTable.accountType, accountType as "individual" | "company"));
  }

  const profiles = await query
    .orderBy(desc(profilesTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const filtered = search
    ? profiles.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.headline ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (p.location ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : profiles;

  const totalResult = await db.select({ count: sql<number>`count(*)` }).from(profilesTable);

  res.json({
    profiles: filtered,
    total: Number(totalResult[0]?.count ?? 0),
  });
});

export default router;

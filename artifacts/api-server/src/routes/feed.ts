import { Router, type IRouter } from "express";
import { sql, desc, eq } from "drizzle-orm";
import { db, profilesTable, jobsTable, applicationsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/feed/stats", async (_req, res): Promise<void> => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    totalProfilesResult,
    totalJobsResult,
    totalApplicationsResult,
    openToWorkResult,
    recentJobsResult,
    categoriesResult,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(profilesTable),
    db.select({ count: sql<number>`count(*)` }).from(jobsTable),
    db.select({ count: sql<number>`count(*)` }).from(applicationsTable),
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(eq(profilesTable.openToWork, true)),
    db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(sql`created_at >= ${oneWeekAgo}`),
    db.select({ category: jobsTable.category, count: sql<number>`count(*)` }).from(jobsTable).groupBy(jobsTable.category).orderBy(desc(sql`count(*)`)).limit(5),
  ]);

  res.json({
    totalProfiles: Number(totalProfilesResult[0]?.count ?? 0),
    totalJobs: Number(totalJobsResult[0]?.count ?? 0),
    totalApplications: Number(totalApplicationsResult[0]?.count ?? 0),
    openToWorkProfiles: Number(openToWorkResult[0]?.count ?? 0),
    remoteJobsPostedThisWeek: Number(recentJobsResult[0]?.count ?? 0),
    topCategories: categoriesResult.map((r) => ({ category: r.category, count: Number(r.count) })),
  });
});

router.get("/feed/featured-profiles", async (_req, res): Promise<void> => {
  const profiles = await db.select().from(profilesTable).limit(6).orderBy(desc(profilesTable.createdAt));
  res.json(profiles);
});

router.get("/feed/featured-jobs", async (_req, res): Promise<void> => {
  const jobs = await db.select().from(jobsTable).where(eq(jobsTable.featured, true)).limit(6).orderBy(desc(jobsTable.createdAt));
  const jobsWithCount = await Promise.all(
    jobs.map(async (job) => {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM applications WHERE job_id = ${job.id}`);
      const rows = result.rows ?? result;
      const countRow = Array.isArray(rows) ? rows[0] : undefined;
      return { ...job, applicationCount: Number((countRow as any)?.count ?? 0) };
    })
  );
  res.json(jobsWithCount);
});

export default router;

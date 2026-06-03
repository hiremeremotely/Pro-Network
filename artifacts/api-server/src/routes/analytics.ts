import { Router } from "express";
import {
  db, postsTable, postReactionsTable, postCommentsTable,
  connectionsTable, jobsTable, applicationsTable,
} from "@workspace/db";
import { eq, inArray, sql, desc } from "drizzle-orm";

const router = Router();

const STATUS_LABELS: Record<string, string> = {
  pending:    "Pending review",
  reviewing:  "Under review",
  interviewed:"Interviewing",
  accepted:   "Accepted",
  rejected:   "Rejected",
  withdrawn:  "Withdrawn",
};

const STATUS_COLORS: Record<string, string> = {
  pending:    "#94a3b8",
  reviewing:  "#60a5fa",
  interviewed:"#a78bfa",
  accepted:   "#34d399",
  rejected:   "#f87171",
  withdrawn:  "#d1d5db",
};

router.get("/analytics", async (req, res): Promise<void> => {
  const profileId  = req.session.profileId!;
  const accountType = String(req.query.accountType ?? "individual");

  const seed = profileId;

  // ─── JOBS (company) ────────────────────────────────────────────────────────
  let jobStats: object = {};
  if (accountType === "company") {
    const jobs = await db
      .select({ id: jobsTable.id, title: jobsTable.title, createdAt: jobsTable.createdAt })
      .from(jobsTable)
      .where(eq(jobsTable.companyProfileId, profileId))
      .orderBy(desc(jobsTable.createdAt));

    const jobIds = jobs.map(j => j.id);
    const totalJobsPosted = jobs.length;

    // Applications received across all jobs
    const appsByJob: { jobId: number; status: string; cnt: number }[] = jobIds.length > 0
      ? await db
          .select({ jobId: applicationsTable.jobId, status: applicationsTable.status, cnt: sql<number>`count(*)::int` })
          .from(applicationsTable)
          .where(inArray(applicationsTable.jobId, jobIds))
          .groupBy(applicationsTable.jobId, applicationsTable.status) as any
      : [];

    const totalApplicationsReceived = appsByJob.reduce((s, r) => s + r.cnt, 0);

    // Status breakdown across all jobs
    const statusMap: Record<string, number> = {};
    for (const r of appsByJob) {
      statusMap[r.status] = (statusMap[r.status] ?? 0) + r.cnt;
    }
    const statusBreakdown = Object.entries(statusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status, count,
        label: STATUS_LABELS[status] ?? status,
        color: STATUS_COLORS[status] ?? "#94a3b8",
        pct: totalApplicationsReceived > 0 ? Math.round((count / totalApplicationsReceived) * 100) : 0,
      }));

    // Per-job application counts
    const appsPerJob: Record<number, number> = {};
    for (const r of appsByJob) {
      appsPerJob[r.jobId] = (appsPerJob[r.jobId] ?? 0) + r.cnt;
    }
    const topJobs = jobs
      .map(j => ({ ...j, applications: appsPerJob[j.id] ?? 0 }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 5);

    // Monthly new apps (last 6 months) - simulated per job count
    const avgAppsPerJob = totalJobsPosted > 0 ? Math.round(totalApplicationsReceived / totalJobsPosted) : 0;

    jobStats = {
      totalJobsPosted,
      totalApplicationsReceived,
      avgAppsPerJob,
      statusBreakdown,
      topJobs,
      recentJobs: jobs.slice(0, 3),
    };
  }

  // ─── APPLICATIONS (individual) ─────────────────────────────────────────────
  let appStats: object = {};
  if (accountType === "individual") {
    const myApps = await db
      .select({
        id:        applicationsTable.id,
        jobId:     applicationsTable.jobId,
        status:    applicationsTable.status,
        appliedAt: applicationsTable.appliedAt,
      })
      .from(applicationsTable)
      .where(eq(applicationsTable.profileId, profileId))
      .orderBy(desc(applicationsTable.appliedAt));

    const totalApplied = myApps.length;

    const statusMap: Record<string, number> = {};
    for (const a of myApps) {
      statusMap[a.status] = (statusMap[a.status] ?? 0) + 1;
    }
    const statusBreakdown = Object.entries(statusMap)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({
        status, count,
        label: STATUS_LABELS[status] ?? status,
        color: STATUS_COLORS[status] ?? "#94a3b8",
        pct: totalApplied > 0 ? Math.round((count / totalApplied) * 100) : 0,
      }));

    const accepted   = statusMap["accepted"]   ?? 0;
    const interviews = statusMap["interviewed"] ?? 0;
    const successRate = totalApplied > 0 ? Math.round((accepted / totalApplied) * 100) : 0;
    const interviewRate = totalApplied > 0 ? Math.round(((interviews + accepted) / totalApplied) * 100) : 0;

    // Jobs applied with details
    const jobIds = [...new Set(myApps.map(a => a.jobId))];
    const jobDetails = jobIds.length > 0
      ? await db
          .select({ id: jobsTable.id, title: jobsTable.title, company: jobsTable.company, category: jobsTable.category })
          .from(jobsTable)
          .where(inArray(jobsTable.id, jobIds))
      : [];

    const jobMap = Object.fromEntries(jobDetails.map(j => [j.id, j]));

    // Category breakdown
    const catMap: Record<string, number> = {};
    for (const a of myApps) {
      const cat = jobMap[a.jobId]?.category ?? "Other";
      catMap[cat] = (catMap[cat] ?? 0) + 1;
    }
    const categoryBreakdown = Object.entries(catMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count, pct: totalApplied > 0 ? Math.round((count / totalApplied) * 100) : 0 }));

    // Recent 5 applications with job info
    const recentApplications = myApps.slice(0, 5).map(a => ({
      id:        a.id,
      jobId:     a.jobId,
      status:    a.status,
      statusLabel: STATUS_LABELS[a.status] ?? a.status,
      statusColor: STATUS_COLORS[a.status] ?? "#94a3b8",
      appliedAt: a.appliedAt,
      jobTitle:  jobMap[a.jobId]?.title   ?? "Unknown position",
      company:   jobMap[a.jobId]?.company ?? "Unknown company",
    }));

    // Last 30 / 7 days
    const now = Date.now();
    const appliedLast30 = myApps.filter(a => now - new Date(a.appliedAt).getTime() < 30 * 86400_000).length;
    const appliedLast7  = myApps.filter(a => now - new Date(a.appliedAt).getTime() <  7 * 86400_000).length;

    appStats = {
      totalApplied,
      appliedLast30,
      appliedLast7,
      accepted,
      interviews,
      successRate,
      interviewRate,
      statusBreakdown,
      categoryBreakdown,
      recentApplications,
    };
  }

  // ─── SAVED JOBS (bookmarks — individual) ────────────────────────────────────
  // Count from bookmarks table where item_type = 'job'
  const savedJobsResult = await db.execute(
    sql`SELECT count(*)::int as cnt FROM bookmarks WHERE profile_id = ${profileId} AND item_type = 'job'`
  ) as any;
  const savedJobs = Number(savedJobsResult.rows?.[0]?.cnt ?? 0);

  // ─── SOCIAL (light section) ─────────────────────────────────────────────────
  const posts = await db
    .select({ id: postsTable.id, likesCount: postsTable.likesCount, commentsCount: postsTable.commentsCount })
    .from(postsTable)
    .where(eq(postsTable.profileId, profileId));

  const postIds = posts.map(p => p.id);
  const totalPosts = posts.length;
  const totalReactions = posts.reduce((s, p) => s + p.likesCount, 0);
  const totalComments  = posts.reduce((s, p) => s + p.commentsCount, 0);

  const followerResult = await db.execute(
    sql`SELECT count(*)::int as cnt FROM connections WHERE following_id = ${profileId}`
  ) as any;
  const totalFollowers = Number(followerResult.rows?.[0]?.cnt ?? 0);

  // Simulated profile views
  const profileViews30 = ((seed * 19 + 47) % 251) + 50;
  const profileViews7  = Math.round(profileViews30 * 0.28);
  const viewsTrend     = ((seed * 7 + 11) % 30) + 5;

  res.json({
    accountType,
    ...(accountType === "company"    ? jobStats  : {}),
    ...(accountType === "individual" ? appStats  : {}),
    savedJobs,
    social: { totalPosts, totalReactions, totalComments, totalFollowers },
    profileViews: { last7: profileViews7, last30: profileViews30, trend: viewsTrend },
  });
});

export default router;

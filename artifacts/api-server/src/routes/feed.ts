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

router.get("/feed/featured-profiles", async (req, res): Promise<void> => {
  const excludeId = parseInt(req.query.excludeId as string, 10);
  const conditions = [eq(profilesTable.accountType, "individual")];
  if (!isNaN(excludeId)) conditions.push(sql`${profilesTable.id} != ${excludeId}` as any);
  const profiles = await db.select().from(profilesTable).where(sql.join(conditions, sql` AND `)).limit(6).orderBy(desc(profilesTable.createdAt));
  res.json(profiles);
});

router.get("/feed/featured-companies", async (req, res): Promise<void> => {
  const excludeId = parseInt(req.query.excludeId as string, 10);
  const conditions = [eq(profilesTable.accountType, "company")];
  if (!isNaN(excludeId)) conditions.push(sql`${profilesTable.id} != ${excludeId}` as any);
  const companies = await db.select().from(profilesTable).where(sql.join(conditions, sql` AND `)).limit(5).orderBy(desc(profilesTable.createdAt));
  res.json(companies);
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

// ── GET /feed/link-preview?url=... — scrape OG/meta tags from a URL ──────────
router.get("/feed/link-preview", async (req, res): Promise<void> => {
  const url = (req.query.url as string | undefined)?.trim();
  if (!url || !/^https?:\/\//i.test(url)) { res.status(400).json({ error: "valid url required" }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; HireMeRemotelyBot/1.0; +https://hiremere.app)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) { res.json({}); return; }

    // Reject responses that advertise more than 2 MB
    const MAX_BYTES = 2 * 1024 * 1024;
    const clHeader = response.headers.get("content-length");
    if (clHeader && parseInt(clHeader, 10) > MAX_BYTES) { res.json({}); return; }

    const rawText = await response.text();
    if (rawText.length > MAX_BYTES) { res.json({}); return; }
    const html = rawText;

    const getMeta = (props: string[]): string | null => {
      for (const p of props) {
        const m =
          html.match(new RegExp(`<meta[^>]+property=["']${p}["'][^>]+content=["']([^"']+)["']`, "i")) ??
          html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${p}["']`, "i")) ??
          html.match(new RegExp(`<meta[^>]+name=["']${p}["'][^>]+content=["']([^"']+)["']`, "i")) ??
          html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${p}["']`, "i"));
        if (m?.[1]) return m[1];
      }
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = getMeta(["og:title", "twitter:title"]) ?? titleMatch?.[1]?.trim() ?? null;
    const description = getMeta(["og:description", "twitter:description", "description"]);
    const image = getMeta(["og:image", "twitter:image", "twitter:image:src"]);
    const siteName = getMeta(["og:site_name"]);
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

    res.json({ title, description, image, siteName, domain, favicon, url });
  } catch (err: any) {
    if (err?.name === "AbortError") { res.status(504).json({ error: "timeout" }); return; }
    res.json({});
  }
});

export default router;

import { Router, type IRouter } from "express";
import { eq, ilike, or, and, sql, asc } from "drizzle-orm";
import { db, jobsTable } from "@workspace/db";
import {
  CreateJobBody,
  UpdateJobBody,
  GetJobParams,
  UpdateJobParams,
  DeleteJobParams,
  ListJobsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jobs", async (req, res): Promise<void> => {
  const query = ListJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { search, category, experienceLevel, limit = 20, offset = 0 } = query.data;

  // Build each condition independently then AND them all together
  const clauses: ReturnType<typeof eq | typeof or | typeof and>[] = [];

  // Keyword search: title, company, description, location, tags
  if (search) {
    clauses.push(
      or(
        ilike(jobsTable.title, `%${search}%`),
        ilike(jobsTable.company, `%${search}%`),
        ilike(jobsTable.description, `%${search}%`),
        ilike(jobsTable.location, `%${search}%`),
        sql`array_to_string(${jobsTable.tags}, ' ') ILIKE ${'%' + search + '%'}`,
      )!
    );
  }

  // Exact-match filters — applied as AND on top of the search
  if (category) clauses.push(eq(jobsTable.category, category));
  if (experienceLevel) clauses.push(eq(jobsTable.experienceLevel, experienceLevel));

  const whereClause = clauses.length === 0
    ? undefined
    : clauses.length === 1
      ? clauses[0]
      : and(...clauses);

  const [jobs, countResult] = await Promise.all([
    db.select().from(jobsTable).where(whereClause).limit(limit).offset(offset).orderBy(jobsTable.createdAt),
    db.select({ count: sql<number>`count(*)` }).from(jobsTable).where(whereClause),
  ]);

  const jobsWithCount = await Promise.all(
    jobs.map(async (job) => {
      const result = await db.execute(sql`SELECT COUNT(*) as count FROM applications WHERE job_id = ${job.id}`);
      const rows = result.rows ?? result;
      const countRow = Array.isArray(rows) ? rows[0] : undefined;
      return { ...job, applicationCount: Number((countRow as any)?.count ?? 0) };
    })
  );

  res.json({ jobs: jobsWithCount, total: Number(countResult[0]?.count ?? 0) });
});

// ── GET /jobs/suggestions?q=... — typeahead suggestions ──────────────────────
router.get("/jobs/suggestions", async (req, res): Promise<void> => {
  const q = (req.query.q as string ?? "").trim();
  if (!q || q.length < 1) { res.json({ titles: [], companies: [], tags: [] }); return; }

  const pattern = `%${q}%`;

  const [titleRows, companyRows, tagRows] = await Promise.all([
    // Distinct matching titles
    db
      .selectDistinct({ value: jobsTable.title })
      .from(jobsTable)
      .where(ilike(jobsTable.title, pattern))
      .orderBy(asc(jobsTable.title))
      .limit(5),

    // Distinct matching company names
    db
      .selectDistinct({ value: jobsTable.company })
      .from(jobsTable)
      .where(ilike(jobsTable.company, pattern))
      .orderBy(asc(jobsTable.company))
      .limit(4),

    // Tags: unnest the arrays, deduplicate, filter, limit
    db.execute(
      sql`SELECT DISTINCT unnest(tags) AS value
          FROM ${jobsTable}
          WHERE array_to_string(tags, ' ') ILIKE ${pattern}
          ORDER BY value
          LIMIT 6`
    ),
  ]);

  const tags = (tagRows.rows ?? tagRows as any[])
    .map((r: any) => String(r.value))
    .filter((t: string) => t.toLowerCase().includes(q.toLowerCase()));

  res.json({
    titles:    titleRows.map(r => r.value),
    companies: companyRows.map(r => r.value),
    tags,
  });
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.insert(jobsTable).values({
    ...parsed.data,
    tags: parsed.data.tags ?? [],
    featured: parsed.data.featured ?? false,
  }).returning();

  res.status(201).json({ ...job, applicationCount: 0 });
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const result = await db.execute(sql`SELECT COUNT(*) as count FROM applications WHERE job_id = ${job.id}`);
  const rows = result.rows ?? result;
  const countRow = Array.isArray(rows) ? rows[0] : undefined;
  res.json({ ...job, applicationCount: Number((countRow as any)?.count ?? 0) });
});

router.put("/jobs/:id", async (req, res): Promise<void> => {
  const params = UpdateJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [job] = await db.update(jobsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(jobsTable.id, params.data.id))
    .returning();
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const result2 = await db.execute(sql`SELECT COUNT(*) as count FROM applications WHERE job_id = ${job.id}`);
  const rows2 = result2.rows ?? result2;
  const countRow2 = Array.isArray(rows2) ? rows2[0] : undefined;
  res.json({ ...job, applicationCount: Number((countRow2 as any)?.count ?? 0) });
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and, or, sql, desc, notInArray } from "drizzle-orm";
import { db, profilesTable, jobsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/talent/recommended", async (req, res): Promise<void> => {
  const companyProfileId = parseInt(req.query.companyProfileId as string, 10);
  if (!companyProfileId) {
    res.status(400).json({ error: "companyProfileId required" });
    return;
  }

  const companyJobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.companyProfileId, companyProfileId))
    .limit(10);

  const categories = [...new Set(companyJobs.map(j => j.category).filter(Boolean))] as string[];
  const tags       = [...new Set(companyJobs.flatMap(j => (j.tags ?? []) as string[]))];

  const baseWhere = eq(profilesTable.accountType, "individual");

  let matched: typeof profilesTable.$inferSelect[] = [];

  if (categories.length > 0 || tags.length > 0) {
    const matchClauses = [];
    if (categories.length > 0) {
      matchClauses.push(
        or(...categories.map(c => eq(profilesTable.industry, c)))!
      );
    }
    if (tags.length > 0) {
      matchClauses.push(
        sql`${profilesTable.interests} && ARRAY[${sql.join(tags.map(t => sql`${t}`), sql`, `)}]::text[]`
      );
    }

    matched = await db
      .select()
      .from(profilesTable)
      .where(and(baseWhere, eq(profilesTable.openToWork, true), or(...matchClauses)))
      .orderBy(desc(profilesTable.createdAt))
      .limit(50);
  }

  if (matched.length < 10) {
    const seenIds = matched.map(p => p.id);
    const fallbackWhere = seenIds.length > 0
      ? and(baseWhere, eq(profilesTable.openToWork, true), notInArray(profilesTable.id, seenIds))
      : and(baseWhere, eq(profilesTable.openToWork, true));
    const fallback = await db
      .select()
      .from(profilesTable)
      .where(fallbackWhere)
      .orderBy(desc(profilesTable.createdAt))
      .limit(50 - matched.length);
    matched = [...matched, ...fallback];
  }

  if (matched.length < 5) {
    const seenIds = matched.map(p => p.id);
    const anyWhere = seenIds.length > 0
      ? and(baseWhere, notInArray(profilesTable.id, seenIds))
      : baseWhere;
    const any = await db
      .select()
      .from(profilesTable)
      .where(anyWhere)
      .orderBy(desc(profilesTable.createdAt))
      .limit(30 - matched.length);
    matched = [...matched, ...any];
  }

  res.json({
    profiles: matched.slice(0, 50),
    matchedByRole: companyJobs.length > 0,
    roleCategories: categories,
  });
});

export default router;

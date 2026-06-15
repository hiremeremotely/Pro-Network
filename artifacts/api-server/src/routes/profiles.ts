import { Router, type IRouter } from "express";
import { and, eq, ilike, ne, or, sql, inArray } from "drizzle-orm";
import { db, profilesTable, educationTable, experienceTable, portfolioTable, skillsTable } from "@workspace/db";
import {
  CreateProfileBody,
  UpdateProfileBody,
  GetProfileParams,
  UpdateProfileParams,
  DeleteProfileParams,
  ListProfilesQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles", async (req, res): Promise<void> => {
  const query = ListProfilesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { search, limit = 20, offset = 0 } = query.data;

  // Extra filters (read directly — not in generated Zod schema)
  const excludeIdRaw = req.query.excludeId as string | undefined;
  const excludeId    = excludeIdRaw ? Number(excludeIdRaw) : undefined;
  const accountTypeFilter  = req.query.accountType as string | undefined;
  const openToWorkRaw      = req.query.openToWork as string | undefined;
  const openToWorkFilter   = openToWorkRaw === "true" ? true : openToWorkRaw === "false" ? false : undefined;
  const industryFilter     = req.query.industry as string | undefined;
  const locationFilter     = req.query.location as string | undefined;
  const skillsFilter       = req.query.skills as string | undefined; // comma-separated names

  const clauses = [];

  if (search) {
    clauses.push(
      or(
        ilike(profilesTable.name, `%${search}%`),
        ilike(profilesTable.headline, `%${search}%`),
        ilike(profilesTable.location, `%${search}%`),
        ilike(profilesTable.email, `%${search}%`),
      )!
    );
  }

  if (excludeId) clauses.push(ne(profilesTable.id, excludeId));
  if (accountTypeFilter) clauses.push(eq(profilesTable.accountType, accountTypeFilter));
  if (openToWorkFilter !== undefined) clauses.push(eq(profilesTable.openToWork, openToWorkFilter));
  if (industryFilter) clauses.push(eq(profilesTable.industry, industryFilter));
  if (locationFilter) clauses.push(ilike(profilesTable.location, `%${locationFilter}%`));

  let profileIds: number[] | null = null;
  if (skillsFilter) {
    const skillNames = skillsFilter.split(",").map(s => s.trim()).filter(Boolean);
    if (skillNames.length > 0) {
      const skillRows = await db
        .select({ profileId: skillsTable.profileId })
        .from(skillsTable)
        .where(
          or(...skillNames.map(n => ilike(skillsTable.name, `%${n}%`)))!
        );
      profileIds = [...new Set(skillRows.map(r => r.profileId))];
      if (profileIds.length === 0) {
        res.json({ profiles: [], total: 0 });
        return;
      }
      clauses.push(inArray(profilesTable.id, profileIds));
    }
  }

  const whereClause = clauses.length === 1
    ? clauses[0]
    : clauses.length > 1
      ? and(...clauses)
      : undefined;

  const [profiles, countResult] = await Promise.all([
    db.select().from(profilesTable).where(whereClause).limit(limit).offset(offset).orderBy(profilesTable.createdAt),
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(whereClause),
  ]);

  res.json({ profiles, total: Number(countResult[0]?.count ?? 0) });
});

router.post("/profiles", async (req, res): Promise<void> => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db.insert(profilesTable).values({
    ...parsed.data,
    openToWork: parsed.data.openToWork ?? false,
  }).returning();
  res.status(201).json(profile);
});

router.get("/profiles/:id", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, params.data.id));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [education, experience, portfolio, skills] = await Promise.all([
    db.select().from(educationTable).where(eq(educationTable.profileId, params.data.id)),
    db.select().from(experienceTable).where(eq(experienceTable.profileId, params.data.id)),
    db.select().from(portfolioTable).where(eq(portfolioTable.profileId, params.data.id)),
    db.select().from(skillsTable).where(eq(skillsTable.profileId, params.data.id)),
  ]);

  // Privacy layer: hide contact info (email) from anyone except the profile
  // owner themselves or HMR admin. The viewer identifies themselves via
  // ?viewerId= query (set by the frontend from the session); HMR admin via
  // an admin token in the bo-admin header. Without a matching viewer the
  // email is hidden.
  const viewerId = req.query.viewerId ? Number(req.query.viewerId) : null;
  const adminToken = req.header("x-admin-token");
  const isOwner = viewerId === profile.id;
  const isAdmin = adminToken === "bo_super_admin_token_2026";
  const sanitized = (isOwner || isAdmin) ? profile : { ...profile, email: null };

  res.json({ ...sanitized, education, experience, portfolio, skills });
});

router.put("/profiles/:id", async (req, res): Promise<void> => {
  const params = UpdateProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db.update(profilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profilesTable.id, params.data.id))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profile);
});

router.delete("/profiles/:id", async (req, res): Promise<void> => {
  const params = DeleteProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(profilesTable).where(eq(profilesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;

import { Router, type IRouter } from "express";
import { eq, ilike, or, sql } from "drizzle-orm";
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

  let whereClause = undefined;
  if (search) {
    whereClause = or(
      ilike(profilesTable.name, `%${search}%`),
      ilike(profilesTable.headline, `%${search}%`),
      ilike(profilesTable.location, `%${search}%`),
    );
  }

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

  res.json({ ...profile, education, experience, portfolio, skills });
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

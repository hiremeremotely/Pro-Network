import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, experienceTable } from "@workspace/db";
import {
  CreateExperienceBody,
  CreateExperienceParams,
  UpdateExperienceBody,
  UpdateExperienceParams,
  DeleteExperienceParams,
  ListExperienceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles/:profileId/experience", async (req, res): Promise<void> => {
  const params = ListExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(experienceTable).where(eq(experienceTable.profileId, params.data.profileId));
  res.json(rows);
});

router.post("/profiles/:profileId/experience", async (req, res): Promise<void> => {
  const params = CreateExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateExperienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exp] = await db.insert(experienceTable).values({ ...parsed.data, profileId: params.data.profileId }).returning();
  res.status(201).json(exp);
});

router.put("/profiles/:profileId/experience/:id", async (req, res): Promise<void> => {
  const params = UpdateExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExperienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exp] = await db.update(experienceTable)
    .set(parsed.data)
    .where(and(eq(experienceTable.id, params.data.id), eq(experienceTable.profileId, params.data.profileId)))
    .returning();
  if (!exp) {
    res.status(404).json({ error: "Experience entry not found" });
    return;
  }
  res.json(exp);
});

router.delete("/profiles/:profileId/experience/:id", async (req, res): Promise<void> => {
  const params = DeleteExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(experienceTable).where(and(eq(experienceTable.id, params.data.id), eq(experienceTable.profileId, params.data.profileId)));
  res.sendStatus(204);
});

export default router;

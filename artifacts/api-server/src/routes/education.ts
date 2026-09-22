import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, educationTable } from "@workspace/db";
import {
  CreateEducationBody,
  CreateEducationParams,
  UpdateEducationBody,
  UpdateEducationParams,
  DeleteEducationParams,
  ListEducationParams,
} from "@workspace/api-zod";
import { canViewProfile, companyReleaseScope } from "../lib/privacyProjection";

const router: IRouter = Router();

router.get("/profiles/:profileId/education", async (req, res): Promise<void> => {
  const params = ListEducationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await canViewProfile(req, params.data.profileId))) { res.status(404).json({ error: "Profile not found" }); return; }
  const scope = await companyReleaseScope(req, params.data.profileId);
  if (!scope.has("education")) { res.json([]); return; }
  const rows = await db.select().from(educationTable).where(eq(educationTable.profileId, params.data.profileId));
  res.json(rows);
});

router.post("/profiles/:profileId/education", async (req, res): Promise<void> => {
  const params = CreateEducationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (Number(req.session?.profileId) !== params.data.profileId) { res.status(403).json({ error: "You may only modify your own education." }); return; }
  const parsed = CreateEducationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [edu] = await db.insert(educationTable).values({ ...parsed.data, profileId: params.data.profileId }).returning();
  res.status(201).json(edu);
});

router.put("/profiles/:profileId/education/:id", async (req, res): Promise<void> => {
  const params = UpdateEducationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (Number(req.session?.profileId) !== params.data.profileId) { res.status(403).json({ error: "You may only modify your own education." }); return; }
  const parsed = UpdateEducationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [edu] = await db.update(educationTable)
    .set(parsed.data)
    .where(and(eq(educationTable.id, params.data.id), eq(educationTable.profileId, params.data.profileId)))
    .returning();
  if (!edu) {
    res.status(404).json({ error: "Education entry not found" });
    return;
  }
  res.json(edu);
});

router.delete("/profiles/:profileId/education/:id", async (req, res): Promise<void> => {
  const params = DeleteEducationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (Number(req.session?.profileId) !== params.data.profileId) { res.status(403).json({ error: "You may only modify your own education." }); return; }
  await db.delete(educationTable).where(and(eq(educationTable.id, params.data.id), eq(educationTable.profileId, params.data.profileId)));
  res.sendStatus(204);
});

export default router;

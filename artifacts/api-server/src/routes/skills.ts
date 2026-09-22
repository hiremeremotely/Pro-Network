import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, skillsTable } from "@workspace/db";
import {
  AddProfileSkillBody,
  AddProfileSkillParams,
  DeleteProfileSkillParams,
  ListProfileSkillsParams,
} from "@workspace/api-zod";
import { canViewProfile, companyReleaseScope } from "../lib/privacyProjection";

const router: IRouter = Router();

router.get("/profiles/:profileId/skills", async (req, res): Promise<void> => {
  const params = ListProfileSkillsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await canViewProfile(req, params.data.profileId))) { res.status(404).json({ error: "Profile not found" }); return; }
  const scope = await companyReleaseScope(req, params.data.profileId);
  if (!scope.has("skills")) { res.json([]); return; }
  const rows = await db.select().from(skillsTable).where(eq(skillsTable.profileId, params.data.profileId));
  res.json(rows);
});

router.post("/profiles/:profileId/skills", async (req, res): Promise<void> => {
  const params = AddProfileSkillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (Number(req.session?.profileId) !== params.data.profileId) { res.status(403).json({ error: "You may only modify your own skills." }); return; }
  const parsed = AddProfileSkillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [skill] = await db.insert(skillsTable).values({ ...parsed.data, profileId: params.data.profileId }).returning();
  res.status(201).json(skill);
});

router.delete("/profiles/:profileId/skills/:id", async (req, res): Promise<void> => {
  const params = DeleteProfileSkillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (Number(req.session?.profileId) !== params.data.profileId) { res.status(403).json({ error: "You may only modify your own skills." }); return; }
  await db.delete(skillsTable).where(and(eq(skillsTable.id, params.data.id), eq(skillsTable.profileId, params.data.profileId)));
  res.sendStatus(204);
});

export default router;

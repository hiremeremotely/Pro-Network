import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, applicationsTable, profilesTable, jobsTable } from "@workspace/db";
import {
  ApplyToJobBody,
  ApplyToJobParams,
  ListApplicationsParams,
  ListProfileApplicationsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichApplication(app: typeof applicationsTable.$inferSelect) {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, app.profileId));
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  return { ...app, profile, job: { ...job, applicationCount: 0 } };
}

router.get("/jobs/:jobId/applications", async (req, res): Promise<void> => {
  const params = ListApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.jobId, params.data.jobId));
  const enriched = await Promise.all(apps.map(enrichApplication));
  res.json(enriched);
});

router.post("/jobs/:jobId/applications", async (req, res): Promise<void> => {
  const params = ApplyToJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ApplyToJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [app] = await db.insert(applicationsTable).values({
    ...parsed.data,
    profileId: req.session.profileId!,
    jobId: params.data.jobId,
    status: "pending",
  }).returning();
  const enriched = await enrichApplication(app);
  res.status(201).json(enriched);
});

router.get("/profiles/:profileId/applications", async (req, res): Promise<void> => {
  const params = ListProfileApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.profileId, params.data.profileId));
  const enriched = await Promise.all(apps.map(enrichApplication));
  res.json(enriched);
});

export default router;

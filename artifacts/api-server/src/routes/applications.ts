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
  const [profile] = await db.select({
    id: profilesTable.id, accountType: profilesTable.accountType, name: profilesTable.name,
    email: profilesTable.email, headline: profilesTable.headline, bio: profilesTable.bio,
    location: profilesTable.location, industry: profilesTable.industry, avatarUrl: profilesTable.avatarUrl,
  }).from(profilesTable).where(eq(profilesTable.id, app.profileId));
  const [job] = await db.select({
    id: jobsTable.id, companyProfileId: jobsTable.companyProfileId, title: jobsTable.title,
    company: jobsTable.company, location: jobsTable.location, description: jobsTable.description,
    category: jobsTable.category, experienceLevel: jobsTable.experienceLevel,
    salaryMin: jobsTable.salaryMin, salaryMax: jobsTable.salaryMax, currency: jobsTable.currency,
  }).from(jobsTable).where(eq(jobsTable.id, app.jobId));
  return { ...app, profile: profile ?? null, job: job ? { ...job, applicationCount: 0 } : null };
}

router.get("/jobs/:jobId/applications", async (req, res): Promise<void> => {
  const params = ListApplicationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const callerId = req.session.profileId;
  if (!callerId) { res.status(401).json({ error: "Authentication required" }); return; }
  const [job] = await db.select({ companyProfileId: jobsTable.companyProfileId })
    .from(jobsTable).where(eq(jobsTable.id, params.data.jobId));
  const [caller] = await db.select({ accountType: profilesTable.accountType })
    .from(profilesTable).where(eq(profilesTable.id, callerId));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  if (caller?.accountType !== "company" || job.companyProfileId !== callerId) {
    res.status(403).json({ error: "Only the company that owns this job may view applications." });
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
  const callerId = req.session.profileId;
  if (!callerId) { res.status(401).json({ error: "Authentication required" }); return; }
  const [job] = await db.select({ id: jobsTable.id }).from(jobsTable).where(eq(jobsTable.id, params.data.jobId));
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const [applicant] = await db.select({ accountType: profilesTable.accountType })
    .from(profilesTable).where(eq(profilesTable.id, callerId));
  if (applicant?.accountType !== "individual") {
    res.status(403).json({ error: "Only individual accounts may apply to jobs." });
    return;
  }
  const [app] = await db.insert(applicationsTable).values({
    ...parsed.data,
    profileId: callerId,
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
  if (req.session.profileId !== params.data.profileId) {
    res.status(403).json({ error: "You may only view your own applications." });
    return;
  }
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.profileId, params.data.profileId));
  const enriched = await Promise.all(apps.map(enrichApplication));
  res.json(enriched);
});

export default router;

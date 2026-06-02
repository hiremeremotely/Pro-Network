import { Router, type IRouter } from "express";
import { eq, inArray } from "drizzle-orm";
import { db, employeesTable, profilesTable, jobsTable, applicationsTable, conversationsTable, conversationMembersTable, onboardingTasksTable, notificationsTable, messagesTable } from "@workspace/db";
import { and } from "drizzle-orm";

const router: IRouter = Router();

async function enrichEmployee(emp: typeof employeesTable.$inferSelect) {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, emp.individualProfileId));
  const job = emp.jobId
    ? (await db.select().from(jobsTable).where(eq(jobsTable.id, emp.jobId)))[0] ?? null
    : null;
  return { ...emp, profile: profile ?? null, job };
}

router.get("/employees", async (req, res): Promise<void> => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId || isNaN(companyId)) {
    res.status(400).json({ error: "companyId query param required" });
    return;
  }
  const employees = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));
  const enriched = await Promise.all(employees.map(enrichEmployee));
  res.json(enriched);
});

router.post("/employees", async (req, res): Promise<void> => {
  const { companyProfileId, individualProfileId, jobId, role, salary, currency, startDate, status } = req.body;
  if (!companyProfileId || !individualProfileId || !role) {
    res.status(400).json({ error: "companyProfileId, individualProfileId, and role are required" });
    return;
  }
  const cId = Number(companyProfileId);
  const iId = Number(individualProfileId);
  const VALID_STATUSES = ["active", "contractor", "on-leave"];
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  // Idempotency: check if this employee record already exists
  const existing = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.companyProfileId, cId))
    .then(rows => rows.find(r => r.individualProfileId === iId));
  if (existing) {
    const enriched = await enrichEmployee(existing);
    res.status(200).json(enriched);
    return;
  }
  const [emp] = await db
    .insert(employeesTable)
    .values({
      companyProfileId: cId,
      individualProfileId: iId,
      jobId: jobId ? Number(jobId) : null,
      role: String(role),
      salary: salary ? Number(salary) : null,
      currency: currency ? String(currency) : "USD",
      startDate: startDate ? new Date(startDate) : new Date(),
      status: status ?? "active",
    })
    .returning();

  // Auto-enroll new employee in company team channel
  try {
    let [channel] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.companyProfileId, cId), eq(conversationsTable.type, "team")))
      .limit(1);
    if (!channel) {
      const [created] = await db
        .insert(conversationsTable)
        .values({ participant1Id: cId, participant2Id: cId, type: "team", companyProfileId: cId })
        .returning();
      channel = created;
      await db.insert(conversationMembersTable).values({ conversationId: channel.id, profileId: cId }).onConflictDoNothing();
    }
    await db.insert(conversationMembersTable).values({ conversationId: channel.id, profileId: iId }).onConflictDoNothing();
  } catch {
    // Non-fatal: employee is created, team channel enrollment failure should not block
  }

  // Send hire-success congratulations message + notification to the new employee
  try {
    const [companyProfile] = await db.select().from(profilesTable).where(eq(profilesTable.id, cId));
    const jobRecord = emp.jobId
      ? (await db.select().from(jobsTable).where(eq(jobsTable.id, emp.jobId)))[0] ?? null
      : null;
    const congratsText = `Congratulations! ${companyProfile?.name ?? "The company"} is delighted to welcome you to the team as ${emp.role}${jobRecord ? ` for the ${jobRecord.title} position` : ""}. Your onboarding details will follow shortly.`;

    // Find or create direct conversation between company and new employee
    const p1 = Math.min(cId, iId);
    const p2 = Math.max(cId, iId);
    let [conv] = await db
      .select()
      .from(conversationsTable)
      .where(and(eq(conversationsTable.participant1Id, p1), eq(conversationsTable.participant2Id, p2), eq(conversationsTable.type, "direct")))
      .limit(1);
    if (!conv) {
      const [created] = await db
        .insert(conversationsTable)
        .values({ participant1Id: p1, participant2Id: p2, type: "direct", lastMessageAt: new Date(), lastMessagePreview: congratsText.slice(0, 100) })
        .returning();
      conv = created;
      await db.insert(conversationMembersTable).values([
        { conversationId: conv.id, profileId: cId },
        { conversationId: conv.id, profileId: iId },
      ]).onConflictDoNothing();
    }
    await db.insert(messagesTable).values({ conversationId: conv.id, senderProfileId: cId, content: congratsText });
    await db.update(conversationsTable).set({ lastMessageAt: new Date(), lastMessagePreview: congratsText.slice(0, 100) }).where(eq(conversationsTable.id, conv.id));

    // In-app notification to new employee
    await db.insert(notificationsTable).values({
      recipientProfileId: iId,
      actorProfileId: cId,
      type: "hired",
      conversationId: conv.id,
      message: congratsText,
    });
  } catch {
    // Non-fatal: welcome message failure does not block hire
  }

  const enriched = await enrichEmployee(emp);
  res.status(201).json(enriched);
});

router.patch("/employees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { role, salary, currency, status, startDate, companyProfileId } = req.body;
  const VALID_STATUSES = ["active", "contractor", "on-leave"];
  if (!companyProfileId) {
    res.status(400).json({ error: "companyProfileId is required" });
    return;
  }
  // Unconditional ownership check
  const [record] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!record || record.companyProfileId !== Number(companyProfileId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (role !== undefined)      updates.role = String(role);
  if (salary !== undefined)    updates.salary = salary === null ? null : Number(salary);
  if (currency !== undefined)  updates.currency = String(currency);
  if (status !== undefined)    updates.status = String(status);
  if (startDate !== undefined) updates.startDate = new Date(startDate);

  const [emp] = await db
    .update(employeesTable)
    .set(updates)
    .where(eq(employeesTable.id, id))
    .returning();
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  const enriched = await enrichEmployee(emp);
  res.json(enriched);
});

router.delete("/employees/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const companyProfileId = req.query.companyProfileId as string | undefined;
  if (!companyProfileId) {
    res.status(400).json({ error: "companyProfileId query param is required" });
    return;
  }
  // Unconditional ownership check
  const [record] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!record || record.companyProfileId !== Number(companyProfileId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cId = record.companyProfileId;
  const iId = record.individualProfileId;

  await db.delete(employeesTable).where(eq(employeesTable.id, id));

  // Remove former employee from company team channel (non-fatal)
  try {
    const [channel] = await db
      .select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(and(eq(conversationsTable.companyProfileId, cId), eq(conversationsTable.type, "team")))
      .limit(1);
    if (channel) {
      await db
        .delete(conversationMembersTable)
        .where(and(eq(conversationMembersTable.conversationId, channel.id), eq(conversationMembersTable.profileId, iId)));
    }
  } catch {
    // Non-fatal: employee is deleted, team channel cleanup failure should not block
  }

  res.status(204).end();
});

router.get("/companies/:companyId/applications", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  if (!companyId || isNaN(companyId)) {
    res.status(400).json({ error: "Invalid companyId" });
    return;
  }
  const jobs = await db
    .select()
    .from(jobsTable)
    .where(eq(jobsTable.companyProfileId, companyId));
  if (jobs.length === 0) {
    res.json([]);
    return;
  }
  const jobIds = jobs.map((j) => j.id);
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(inArray(applicationsTable.jobId, jobIds));
  const enriched = await Promise.all(
    apps.map(async (app) => {
      const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, app.profileId));
      const job = jobs.find((j) => j.id === app.jobId) ?? null;
      return {
        ...app,
        profile: profile ?? null,
        job: job ? { ...job, applicationCount: 0 } : null,
      };
    })
  );
  res.json(enriched);
});

router.patch("/applications/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { status, companyProfileId } = req.body;
  if (!id || isNaN(id) || !status) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }
  if (!companyProfileId) {
    res.status(400).json({ error: "companyProfileId is required" });
    return;
  }
  // Unconditional ownership check: application must belong to a job posted by this company
  const [existingApp] = await db.select().from(applicationsTable).where(eq(applicationsTable.id, id));
  if (!existingApp) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const [ownerJob] = await db.select().from(jobsTable).where(eq(jobsTable.id, existingApp.jobId));
  if (!ownerJob || ownerJob.companyProfileId !== Number(companyProfileId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [app] = await db
    .update(applicationsTable)
    .set({ status: String(status) })
    .where(eq(applicationsTable.id, id))
    .returning();
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, app.profileId));
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, app.jobId));
  res.json({
    ...app,
    profile: profile ?? null,
    job: job ? { ...job, applicationCount: 0 } : null,
  });
});

// ── POST /api/employees/:id/onboarding/init ───────────────────────────────────
const DEFAULT_ONBOARDING_TASKS = [
  "Complete employment paperwork & contracts",
  "IT accounts & software access setup",
  "Equipment shipped / confirmed ready",
  "Intro call with your manager",
  "Meet the team (group intro session)",
  "Review company handbook & policies",
  "30-day check-in scheduled with HR",
];

router.post("/employees/:id/onboarding/init", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const companyProfileId = Number(req.body?.companyProfileId);
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid employee id" });
    return;
  }
  if (!companyProfileId || isNaN(companyProfileId)) {
    res.status(400).json({ error: "companyProfileId is required" });
    return;
  }
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
  if (!emp) {
    res.status(404).json({ error: "Employee not found" });
    return;
  }
  // Ownership check: only the employing company may init onboarding
  if (emp.companyProfileId !== companyProfileId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  // Only insert if no tasks exist yet
  const existing = await db.select({ id: onboardingTasksTable.id }).from(onboardingTasksTable).where(eq(onboardingTasksTable.employeeId, id));
  if (existing.length > 0) {
    res.json({ inserted: 0, message: "Onboarding tasks already exist" });
    return;
  }
  const tasks = DEFAULT_ONBOARDING_TASKS.map((title, i) => ({
    employeeId: id,
    title,
    completed: false,
    order: i + 1,
  }));
  await db.insert(onboardingTasksTable).values(tasks);
  res.status(201).json({ inserted: tasks.length });
});

export default router;

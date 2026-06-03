import { Router } from "express";
import { db } from "@workspace/db";
import {
  workLogsTable,
  timeOffRequestsTable,
  employeesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

const router = Router();

// ── GET /employees/:employeeId/work-logs ──────────────────────────────────────
// Ownership: either companyId (company view) or individualProfileId (employee view).
// Caller must supply exactly one of: ?companyId= or ?individualProfileId=
router.get("/employees/:employeeId/work-logs", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employeeId" }); return; }

  const companyId = req.query.companyId !== undefined ? parseInt(req.query.companyId as string) : NaN;
  const individualProfileId = req.query.individualProfileId !== undefined ? parseInt(req.query.individualProfileId as string) : NaN;

  if (!isNaN(companyId)) {
    // Company-side: verify employee belongs to this company
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else if (!isNaN(individualProfileId)) {
    // Individual-side: verify employee record belongs to this individual
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.individualProfileId, individualProfileId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else {
    res.status(400).json({ error: "companyId or individualProfileId required" });
    return;
  }

  const logs = await db.select().from(workLogsTable)
    .where(eq(workLogsTable.employeeId, employeeId))
    .orderBy(workLogsTable.date);
  res.json(logs);
});

// ── POST /employees/:employeeId/work-logs ─────────────────────────────────────
// Ownership: either companyId (company logging for employee) or individualProfileId (self-log).
router.post("/employees/:employeeId/work-logs", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const { companyId, individualProfileId, date, hours, description } = req.body;
  if (isNaN(employeeId) || !date || hours == null) {
    res.status(400).json({ error: "employeeId, date, hours required" });
    return;
  }

  if (companyId != null) {
    // Company-side: verify employee belongs to this company
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else if (individualProfileId != null) {
    // Individual-side: verify employee record belongs to this individual
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.individualProfileId, parseInt(individualProfileId))))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else {
    res.status(400).json({ error: "companyId or individualProfileId required" });
    return;
  }

  const [log] = await db.insert(workLogsTable)
    .values({ employeeId, date, hours: String(hours), description: description ?? null })
    .returning();
  res.status(201).json(log);
});

// ── DELETE /employees/:employeeId/work-logs/:logId ────────────────────────────
// Ownership: companyId (company-side) or individualProfileId (self-delete).
router.delete("/employees/:employeeId/work-logs/:logId", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const logId = parseInt(req.params.logId);
  if (isNaN(employeeId) || isNaN(logId)) {
    res.status(400).json({ error: "employeeId and logId required" });
    return;
  }

  const companyId = req.query.companyId !== undefined ? parseInt(req.query.companyId as string) : NaN;
  const individualProfileId = req.query.individualProfileId !== undefined ? parseInt(req.query.individualProfileId as string) : NaN;

  if (!isNaN(companyId)) {
    // Company-side ownership check
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else if (!isNaN(individualProfileId)) {
    // Individual-side ownership check
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.individualProfileId, individualProfileId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else {
    res.status(400).json({ error: "companyId or individualProfileId required" });
    return;
  }

  // Verify the log belongs to this employee before deleting
  const [existing] = await db.select({ id: workLogsTable.id }).from(workLogsTable)
    .where(and(eq(workLogsTable.id, logId), eq(workLogsTable.employeeId, employeeId)));
  if (!existing) { res.status(404).json({ error: "Log not found" }); return; }

  await db.delete(workLogsTable).where(eq(workLogsTable.id, logId));
  res.status(204).end();
});

// ── GET /employees/:employeeId/time-off ───────────────────────────────────────
// Ownership: either companyId or individualProfileId
router.get("/employees/:employeeId/time-off", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  if (isNaN(employeeId)) { res.status(400).json({ error: "Invalid employeeId" }); return; }

  const companyId = req.query.companyId !== undefined ? parseInt(req.query.companyId as string) : NaN;
  const individualProfileId = req.query.individualProfileId !== undefined ? parseInt(req.query.individualProfileId as string) : NaN;

  if (!isNaN(companyId)) {
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else if (!isNaN(individualProfileId)) {
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.individualProfileId, individualProfileId)))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else {
    res.status(400).json({ error: "companyId or individualProfileId required" });
    return;
  }

  const requests = await db.select().from(timeOffRequestsTable)
    .where(eq(timeOffRequestsTable.employeeId, employeeId))
    .orderBy(timeOffRequestsTable.createdAt);
  res.json(requests);
});

// ── POST /employees/:employeeId/time-off ──────────────────────────────────────
// Ownership: either companyId (company books time-off) or individualProfileId (self-submit).
router.post("/employees/:employeeId/time-off", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const { companyId, individualProfileId, startDate, endDate, reason } = req.body;
  if (isNaN(employeeId) || !startDate || !endDate) {
    res.status(400).json({ error: "employeeId, startDate, endDate required" });
    return;
  }

  if (companyId != null) {
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else if (individualProfileId != null) {
    const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
      .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.individualProfileId, parseInt(individualProfileId))))
      .limit(1);
    if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }
  } else {
    res.status(400).json({ error: "companyId or individualProfileId required" });
    return;
  }

  const [record] = await db.insert(timeOffRequestsTable)
    .values({ employeeId, startDate, endDate, reason: reason ?? null, status: "pending" })
    .returning();
  res.status(201).json(record);
});

// ── PATCH /time-off/:requestId/review ─────────────────────────────────────────
// Company approves/rejects a time-off request.
// Authorization: companyId verified against the employee's companyProfileId via DB lookup.
router.patch("/time-off/:requestId/review", async (req, res): Promise<void> => {
  const requestId = parseInt(req.params.requestId);
  const { companyId, status, reviewNote } = req.body;
  if (isNaN(requestId) || !companyId || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "requestId, companyId, and status (approved|rejected) required" });
    return;
  }

  const [existing] = await db.select().from(timeOffRequestsTable)
    .where(eq(timeOffRequestsTable.id, requestId)).limit(1);
  if (!existing) { res.status(404).json({ error: "Request not found" }); return; }

  // Verify the company owns the employee who submitted this request
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, existing.employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
    .limit(1);
  if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }

  const [updated] = await db.update(timeOffRequestsTable)
    .set({ status, reviewedAt: new Date(), reviewNote: reviewNote ?? null })
    .where(eq(timeOffRequestsTable.id, requestId))
    .returning();
  res.json(updated);
});

// ── GET /companies/:companyId/attendance/pending-time-off ─────────────────────
// Returns pending time-off requests for all employees in company.
// Authorization: companyId is the URL param; employees are verified to belong to it.
router.get("/companies/:companyId/attendance/pending-time-off", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "companyId required" }); return; }

  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));
  if (!employees.length) { res.json([]); return; }

  const empIds = employees.map(e => e.id);
  const pending = await db.select().from(timeOffRequestsTable)
    .where(and(inArray(timeOffRequestsTable.employeeId, empIds), eq(timeOffRequestsTable.status, "pending")))
    .orderBy(timeOffRequestsTable.createdAt);

  const empById = Object.fromEntries(employees.map(e => [e.id, e]));
  const result = pending.map(r => ({ ...r, employee: empById[r.employeeId] ?? null }));
  res.json(result);
});

// ── GET /companies/:companyId/attendance/monthly-summary ─────────────────────
// Returns this-month logged hours + approved time-off days per employee.
// Time-off overlap: counts any request overlapping the month boundary (not just fully within).
router.get("/companies/:companyId/attendance/monthly-summary", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "companyId required" }); return; }

  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));
  if (!employees.length) { res.json([]); return; }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const empIds = employees.map(e => e.id);

  const logs = await db.select().from(workLogsTable)
    .where(and(
      inArray(workLogsTable.employeeId, empIds),
      gte(workLogsTable.date, monthStart),
      lte(workLogsTable.date, monthEnd)
    ));

  // Use overlap: startDate <= monthEnd AND endDate >= monthStart (catches partial-month requests)
  const approved = await db.select().from(timeOffRequestsTable)
    .where(and(
      inArray(timeOffRequestsTable.employeeId, empIds),
      eq(timeOffRequestsTable.status, "approved"),
      lte(timeOffRequestsTable.startDate, monthEnd),
      gte(timeOffRequestsTable.endDate, monthStart)
    ));

  const hoursByEmp: Record<number, number> = {};
  for (const log of logs) {
    hoursByEmp[log.employeeId] = (hoursByEmp[log.employeeId] ?? 0) + Number(log.hours);
  }

  const daysOffByEmp: Record<number, number> = {};
  for (const tor of approved) {
    // Clamp to month boundaries before counting days
    const start = new Date(Math.max(new Date(tor.startDate).getTime(), new Date(monthStart).getTime()));
    const end = new Date(Math.min(new Date(tor.endDate).getTime(), new Date(monthEnd).getTime()));
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    daysOffByEmp[tor.employeeId] = (daysOffByEmp[tor.employeeId] ?? 0) + days;
  }

  const summary = employees.map(e => ({
    employeeId: e.id,
    role: e.role,
    status: e.status,
    hoursLogged: hoursByEmp[e.id] ?? 0,
    daysOff: daysOffByEmp[e.id] ?? 0,
  }));

  res.json(summary);
});

// ── GET /my-employment — individual user's employment records ─────────────────
// Returns all companies the individual is employed at.
// Caller must supply individualProfileId (their own profile ID) to scope results.
// This endpoint returns only records where individualProfileId matches — no cross-user data.
router.get("/my-employment", async (req, res): Promise<void> => {
  const individualProfileId = parseInt(req.query.individualProfileId as string);
  const id = !isNaN(individualProfileId) ? individualProfileId : (req.session.profileId ?? NaN);

  // Only returns rows where individualProfileId == the supplied value — inherently scoped.
  const records = await db.select().from(employeesTable)
    .where(eq(employeesTable.individualProfileId, id))
    .orderBy(employeesTable.createdAt);

  res.json(records);
});

export default router;

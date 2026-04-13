import { Router } from "express";
import { db } from "@workspace/db";
import {
  workLogsTable,
  timeOffRequestsTable,
  employeesTable,
} from "@workspace/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

const router = Router();

// ── GET /employees/:employeeId/work-logs ──────────────────────────────────────
router.get("/employees/:employeeId/work-logs", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const companyId = parseInt(req.query.companyId as string);
  if (isNaN(employeeId) || isNaN(companyId)) {
    res.status(400).json({ error: "employeeId and companyId required" });
    return;
  }
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
    .limit(1);
  if (!emp.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const logs = await db.select().from(workLogsTable)
    .where(eq(workLogsTable.employeeId, employeeId))
    .orderBy(workLogsTable.date);
  res.json(logs);
});

// ── POST /employees/:employeeId/work-logs ─────────────────────────────────────
router.post("/employees/:employeeId/work-logs", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const { companyId, date, hours, description } = req.body;
  if (isNaN(employeeId) || !companyId || !date || hours == null) {
    res.status(400).json({ error: "employeeId, companyId, date, hours required" });
    return;
  }
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
    .limit(1);
  if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }

  const [log] = await db.insert(workLogsTable)
    .values({ employeeId, date, hours: String(hours), description: description ?? null })
    .returning();
  res.status(201).json(log);
});

// ── DELETE /employees/:employeeId/work-logs/:logId ────────────────────────────
router.delete("/employees/:employeeId/work-logs/:logId", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const logId = parseInt(req.params.logId);
  const companyId = parseInt(req.query.companyId as string);
  if (isNaN(employeeId) || isNaN(logId) || isNaN(companyId)) {
    res.status(400).json({ error: "employeeId, logId, companyId required" });
    return;
  }
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
    .limit(1);
  if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }

  await db.delete(workLogsTable).where(and(eq(workLogsTable.id, logId), eq(workLogsTable.employeeId, employeeId)));
  res.status(204).end();
});

// ── GET /employees/:employeeId/time-off ───────────────────────────────────────
router.get("/employees/:employeeId/time-off", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const companyId = parseInt(req.query.companyId as string);
  if (isNaN(employeeId) || isNaN(companyId)) {
    res.status(400).json({ error: "employeeId and companyId required" });
    return;
  }
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId)))
    .limit(1);
  if (!emp.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const requests = await db.select().from(timeOffRequestsTable)
    .where(eq(timeOffRequestsTable.employeeId, employeeId))
    .orderBy(timeOffRequestsTable.createdAt);
  res.json(requests);
});

// ── POST /employees/:employeeId/time-off ──────────────────────────────────────
router.post("/employees/:employeeId/time-off", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const { companyId, startDate, endDate, reason } = req.body;
  if (isNaN(employeeId) || !companyId || !startDate || !endDate) {
    res.status(400).json({ error: "employeeId, companyId, startDate, endDate required" });
    return;
  }
  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
    .limit(1);
  if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }

  const [req2] = await db.insert(timeOffRequestsTable)
    .values({ employeeId, startDate, endDate, reason: reason ?? null, status: "pending" })
    .returning();
  res.status(201).json(req2);
});

// ── PATCH /time-off/:requestId/review ─────────────────────────────────────────
// Company approves/rejects a time-off request
router.patch("/time-off/:requestId/review", async (req, res): Promise<void> => {
  const requestId = parseInt(req.params.requestId);
  const { companyId, status, reviewNote } = req.body;
  if (isNaN(requestId) || !companyId || !["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "requestId, companyId, and status (approved|rejected) required" });
    return;
  }

  const existing = await db.select().from(timeOffRequestsTable)
    .where(eq(timeOffRequestsTable.id, requestId)).limit(1);
  if (!existing.length) { res.status(404).json({ error: "Request not found" }); return; }

  const emp = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, existing[0].employeeId), eq(employeesTable.companyProfileId, parseInt(companyId))))
    .limit(1);
  if (!emp.length) { res.status(403).json({ error: "Access denied" }); return; }

  const [updated] = await db.update(timeOffRequestsTable)
    .set({ status, reviewedAt: new Date(), reviewNote: reviewNote ?? null })
    .where(eq(timeOffRequestsTable.id, requestId))
    .returning();
  res.json(updated);
});

// ── GET /companies/:companyId/attendance/pending-time-off ─────────────────────
// Returns pending time-off requests for all employees in company
router.get("/companies/:companyId/attendance/pending-time-off", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "companyId required" }); return; }

  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));
  if (!employees.length) { res.json([]); return; }

  const empIds = employees.map(e => e.id);
  const pending = await db.select().from(timeOffRequestsTable)
    .where(
      empIds.length === 1
        ? and(eq(timeOffRequestsTable.employeeId, empIds[0]), eq(timeOffRequestsTable.status, "pending"))
        : and(timeOffRequestsTable.employeeId.in(empIds), eq(timeOffRequestsTable.status, "pending"))
    )
    .orderBy(timeOffRequestsTable.createdAt);

  const empById = Object.fromEntries(employees.map(e => [e.id, e]));
  const result = pending.map(r => ({ ...r, employee: empById[r.employeeId] ?? null }));
  res.json(result);
});

// ── GET /companies/:companyId/attendance/monthly-summary ─────────────────────
// Returns this-month logged hours + approved time-off days per employee
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
  const empIdCondition = empIds.length === 1
    ? eq(workLogsTable.employeeId, empIds[0])
    : workLogsTable.employeeId.in(empIds);

  const logs = await db.select().from(workLogsTable)
    .where(and(empIdCondition, gte(workLogsTable.date, monthStart), lte(workLogsTable.date, monthEnd)));

  const torCondition = empIds.length === 1
    ? and(eq(timeOffRequestsTable.employeeId, empIds[0]), eq(timeOffRequestsTable.status, "approved"))
    : and(timeOffRequestsTable.employeeId.in(empIds), eq(timeOffRequestsTable.status, "approved"));

  const approved = await db.select().from(timeOffRequestsTable)
    .where(and(torCondition, gte(timeOffRequestsTable.startDate, monthStart), lte(timeOffRequestsTable.endDate, monthEnd)));

  const hoursByEmp: Record<number, number> = {};
  for (const log of logs) {
    hoursByEmp[log.employeeId] = (hoursByEmp[log.employeeId] ?? 0) + Number(log.hours);
  }

  const daysOffByEmp: Record<number, number> = {};
  for (const tor of approved) {
    const start = new Date(tor.startDate);
    const end = new Date(tor.endDate);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (86400000)) + 1);
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

export default router;

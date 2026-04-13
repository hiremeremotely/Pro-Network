import { Router } from "express";
import { db } from "@workspace/db";
import {
  contractsTable,
  employeesTable,
} from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// ── GET /employees/:employeeId/contract ──────────────────────────────────────
router.get("/employees/:employeeId/contract", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const companyId = parseInt(req.query.companyId as string);
  if (isNaN(employeeId) || isNaN(companyId)) {
    res.status(400).json({ error: "employeeId and companyId required" });
    return;
  }

  const emp = await db.select().from(employeesTable).where(
    and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, companyId))
  ).limit(1);
  if (!emp.length) { res.status(404).json({ error: "Employee not found" }); return; }

  const contracts = await db.select().from(contractsTable)
    .where(eq(contractsTable.employeeId, employeeId))
    .orderBy(contractsTable.createdAt);

  res.json(contracts[0] ?? null);
});

// ── PUT /employees/:employeeId/contract ──────────────────────────────────────
// Upsert: creates if doesn't exist, updates if it does
router.put("/employees/:employeeId/contract", async (req, res): Promise<void> => {
  const employeeId = parseInt(req.params.employeeId);
  const { companyId, type, startDate, endDate, rate, currency, paymentStatus, notes } = req.body;
  if (isNaN(employeeId) || !companyId) {
    res.status(400).json({ error: "employeeId and companyId required" });
    return;
  }

  const emp = await db.select().from(employeesTable).where(
    and(eq(employeesTable.id, employeeId), eq(employeesTable.companyProfileId, parseInt(companyId)))
  ).limit(1);
  if (!emp.length) { res.status(403).json({ error: "Employee not found or access denied" }); return; }

  const existing = await db.select({ id: contractsTable.id }).from(contractsTable)
    .where(eq(contractsTable.employeeId, employeeId)).limit(1);

  const payload: Partial<typeof contractsTable.$inferInsert> = {
    type: type ?? "full-time",
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    rate: rate != null ? String(rate) : null,
    currency: currency ?? "USD",
    paymentStatus: paymentStatus ?? "paid",
    notes: notes ?? null,
  };

  let contract;
  if (existing.length) {
    const updated = await db.update(contractsTable)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(contractsTable.id, existing[0].id))
      .returning();
    contract = updated[0];
  } else {
    const inserted = await db.insert(contractsTable)
      .values({ employeeId, ...payload } as typeof contractsTable.$inferInsert)
      .returning();
    contract = inserted[0];
  }

  res.json(contract);
});

// ── GET /companies/:companyId/contracts/renewals ──────────────────────────────
// Returns contracts expiring within 30 days (for dashboard widget)
router.get("/companies/:companyId/contracts/renewals", async (req, res): Promise<void> => {
  const companyId = parseInt(req.params.companyId);
  if (isNaN(companyId)) { res.status(400).json({ error: "companyId required" }); return; }

  const employees = await db.select().from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));
  if (!employees.length) { res.json([]); return; }

  const empIds = employees.map(e => e.id);
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const allContracts = await db.select().from(contractsTable)
    .where(
      empIds.length === 1
        ? eq(contractsTable.employeeId, empIds[0])
        : contractsTable.employeeId.in(empIds)
    );

  const upcoming = allContracts.filter(c => {
    if (!c.endDate) return false;
    const end = new Date(c.endDate);
    return end >= now && end <= in30;
  });

  const empById = Object.fromEntries(employees.map(e => [e.id, e]));
  const result = upcoming.map(c => ({ ...c, employee: empById[c.employeeId] ?? null }));

  res.json(result);
});

export default router;

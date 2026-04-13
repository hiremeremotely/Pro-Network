import { Router } from "express";
import { eq, and, asc } from "drizzle-orm";
import { db, employeesTable, onboardingTasksTable, employeeDocumentsTable } from "@workspace/db";

const router = Router();

const DEFAULT_TASKS = [
  "Sign employment contract",
  "Upload government ID",
  "Complete your platform profile",
  "Attend remote orientation call",
  "Set up payroll / banking details",
  "Review company remote work policy",
  "Schedule intro call with your team",
];

async function verifyEmployeeOwnership(employeeId: number, companyId: number): Promise<boolean> {
  const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, employeeId));
  return !!emp && emp.companyProfileId === companyId;
}

router.get("/employees/:id/onboarding", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const companyId = parseInt(req.query.companyId as string);
  if (!id || isNaN(id) || !companyId || isNaN(companyId)) {
    res.status(400).json({ error: "id and companyId are required" });
    return;
  }
  if (!(await verifyEmployeeOwnership(id, companyId))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  let tasks = await db
    .select()
    .from(onboardingTasksTable)
    .where(eq(onboardingTasksTable.employeeId, id))
    .orderBy(asc(onboardingTasksTable.order));

  if (tasks.length === 0) {
    const toInsert = DEFAULT_TASKS.map((title, i) => ({
      employeeId: id,
      title,
      order: i,
      completed: false,
    }));
    tasks = await db.insert(onboardingTasksTable).values(toInsert).returning();
    tasks.sort((a, b) => a.order - b.order);
  }

  const documents = await db
    .select()
    .from(employeeDocumentsTable)
    .where(eq(employeeDocumentsTable.employeeId, id));

  res.json({ tasks, documents });
});

router.patch("/employees/:id/onboarding/tasks/:taskId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const taskId = parseInt(req.params.taskId);
  const companyId = parseInt(req.body.companyId);
  if (!id || isNaN(id) || !taskId || isNaN(taskId) || !companyId || isNaN(companyId)) {
    res.status(400).json({ error: "id, taskId, and companyId are required" });
    return;
  }
  if (!(await verifyEmployeeOwnership(id, companyId))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { completed } = req.body;
  const [task] = await db
    .update(onboardingTasksTable)
    .set({
      completed: Boolean(completed),
      completedAt: completed ? new Date() : null,
    })
    .where(and(eq(onboardingTasksTable.id, taskId), eq(onboardingTasksTable.employeeId, id)))
    .returning();
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(task);
});

router.post("/employees/:id/documents", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { companyId, fileName, objectPath, documentType } = req.body;
  if (!id || isNaN(id) || !companyId || !fileName || !objectPath) {
    res.status(400).json({ error: "id, companyId, fileName, and objectPath are required" });
    return;
  }
  if (!(await verifyEmployeeOwnership(id, Number(companyId)))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const VALID_TYPES = ["contract", "id", "other"];
  const docType = VALID_TYPES.includes(documentType) ? documentType : "other";
  const [doc] = await db
    .insert(employeeDocumentsTable)
    .values({ employeeId: id, fileName: String(fileName), objectPath: String(objectPath), documentType: docType })
    .returning();
  res.status(201).json(doc);
});

router.delete("/employees/:id/documents/:docId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const docId = parseInt(req.params.docId);
  const companyId = parseInt(req.query.companyId as string);
  if (!id || isNaN(id) || !docId || isNaN(docId) || !companyId || isNaN(companyId)) {
    res.status(400).json({ error: "id, docId, and companyId are required" });
    return;
  }
  if (!(await verifyEmployeeOwnership(id, companyId))) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db
    .delete(employeeDocumentsTable)
    .where(and(eq(employeeDocumentsTable.id, docId), eq(employeeDocumentsTable.employeeId, id)));
  res.status(204).end();
});

router.get("/onboarding/progress", async (req, res): Promise<void> => {
  const companyId = parseInt(req.query.companyId as string);
  if (!companyId || isNaN(companyId)) {
    res.status(400).json({ error: "companyId is required" });
    return;
  }
  const employees = await db
    .select({ id: employeesTable.id })
    .from(employeesTable)
    .where(eq(employeesTable.companyProfileId, companyId));

  if (employees.length === 0) {
    res.json({});
    return;
  }

  const empIds = employees.map(e => e.id);
  const progress: Record<number, { total: number; completed: number }> = {};
  for (const empId of empIds) {
    const tasks = await db
      .select()
      .from(onboardingTasksTable)
      .where(eq(onboardingTasksTable.employeeId, empId));
    // If no tasks seeded yet, use the default task count so the UI always shows progress
    const total = tasks.length > 0 ? tasks.length : DEFAULT_TASKS.length;
    progress[empId] = {
      total,
      completed: tasks.filter(t => t.completed).length,
    };
  }
  res.json(progress);
});

export default router;

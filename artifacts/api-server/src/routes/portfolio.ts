import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, portfolioTable } from "@workspace/db";
import {
  CreatePortfolioProjectBody,
  CreatePortfolioProjectParams,
  UpdatePortfolioProjectBody,
  UpdatePortfolioProjectParams,
  DeletePortfolioProjectParams,
  ListPortfolioParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/profiles/:profileId/portfolio", async (req, res): Promise<void> => {
  const params = ListPortfolioParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db.select().from(portfolioTable).where(eq(portfolioTable.profileId, params.data.profileId));
  res.json(rows);
});

router.post("/profiles/:profileId/portfolio", async (req, res): Promise<void> => {
  const params = CreatePortfolioProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreatePortfolioProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.insert(portfolioTable).values({
    ...parsed.data,
    profileId: params.data.profileId,
    tags: parsed.data.tags ?? [],
    featured: parsed.data.featured ?? false,
  }).returning();
  res.status(201).json(project);
});

router.put("/profiles/:profileId/portfolio/:id", async (req, res): Promise<void> => {
  const params = UpdatePortfolioProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePortfolioProjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [project] = await db.update(portfolioTable)
    .set(parsed.data)
    .where(and(eq(portfolioTable.id, params.data.id), eq(portfolioTable.profileId, params.data.profileId)))
    .returning();
  if (!project) {
    res.status(404).json({ error: "Portfolio project not found" });
    return;
  }
  res.json(project);
});

router.delete("/profiles/:profileId/portfolio/:id", async (req, res): Promise<void> => {
  const params = DeletePortfolioProjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(portfolioTable).where(and(eq(portfolioTable.id, params.data.id), eq(portfolioTable.profileId, params.data.profileId)));
  res.sendStatus(204);
});

export default router;

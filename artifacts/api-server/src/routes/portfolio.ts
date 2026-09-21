import { Router, type IRouter } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, portfolioTable, portfolioUploadTicketsTable } from "@workspace/db";
import { ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const uploadMimes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const idParams = z.object({ profileId: z.coerce.number().int().positive() });
const itemParams = idParams.extend({ id: z.coerce.number().int().positive() });
const visibility = z.enum(["public", "private"]);
const allowedMime = z.enum(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const urlSchema = z.string().url().max(2048).refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" || url.protocol === "http:";
}, "URL must use http or https");
const body = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  projectUrl: urlSchema.nullable().optional(),
  canonicalUrl: urlSchema.nullable().optional(),
  imageUrl: urlSchema.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
  featured: z.boolean().optional(),
  visibility: visibility.optional(),
  source: z.enum(["manual", "github", "behance", "dribbble", "linkedin", "personal", "upload"]).optional(),
  externalId: z.string().max(500).nullable().optional(),
  objectPath: z.string().regex(/^\/objects\/[A-Za-z0-9._/-]+$/).nullable().optional(),
  mimeType: allowedMime.nullable().optional(),
  fileSize: z.number().int().nonnegative().max(15 * 1024 * 1024).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});
const editBody = body.partial().refine((value) => Object.keys(value).length > 0);
function validProviderUrl(source: string | undefined, value: string | null | undefined): boolean {
  if (!source || !value || source === "manual" || source === "upload") return true;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (source === "github") return host === "github.com";
    if (source === "behance") return host === "behance.net";
    if (source === "dribbble") return host === "dribbble.com";
    if (source === "linkedin") return host === "linkedin.com" && new URL(value).pathname.startsWith("/in/");
    return true;
  } catch { return false; }
}

function owns(req: any, profileId: number): boolean {
  return req.session?.profileId === profileId;
}
function publicRow(row: any) {
  const { objectPath: _objectPath, ...safe } = row;
  return safe;
}
function rowsForResponse(rows: any[], owner: boolean) {
  return owner ? rows : rows.filter((row) => row.visibility === "public").map(publicRow);
}
async function validateUpload(profileId: number, objectPath: string, declaredMime?: string | null, declaredSize?: number | null) {
  const [ticket] = await db.select().from(portfolioUploadTicketsTable)
    .where(and(eq(portfolioUploadTicketsTable.profileId, profileId), eq(portfolioUploadTicketsTable.objectPath, objectPath)));
  if (!ticket || (ticket.status !== "pending" && ticket.status !== "attached")) throw new Error("Upload ticket is missing or not owned by this profile");
  const file = await objectStorageService.getObjectEntityFile(objectPath);
  const [metadata] = await file.getMetadata();
  const actualSize = Number(metadata.size ?? 0);
  const actualMime = String(metadata.contentType ?? "");
  if (actualSize > 15 * 1024 * 1024 || !uploadMimes.has(actualMime) || !uploadMimes.has(ticket.declaredMimeType) ||
      (declaredMime && declaredMime !== actualMime) || (declaredSize !== undefined && declaredSize !== null && declaredSize !== actualSize)) {
    throw new Error("Uploaded file metadata is invalid");
  }
  await db.update(portfolioUploadTicketsTable).set({ status: "attached", updatedAt: new Date() })
    .where(and(eq(portfolioUploadTicketsTable.id, ticket.id), eq(portfolioUploadTicketsTable.status, "pending")));
  return { actualMime, actualSize };
}

router.get("/profiles/:profileId/portfolio", async (req, res): Promise<void> => {
  const parsed = idParams.safeParse(req.params);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const owner = owns(req, parsed.data.profileId);
  const rows = await db.select().from(portfolioTable)
    .where(owner ? eq(portfolioTable.profileId, parsed.data.profileId) : and(eq(portfolioTable.profileId, parsed.data.profileId), eq(portfolioTable.visibility, "public")))
    .orderBy(asc(portfolioTable.sortOrder), asc(portfolioTable.id));
  res.json(rowsForResponse(rows, owner));
});

router.post("/profiles/:profileId/portfolio", async (req, res): Promise<void> => {
  const params = idParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only modify your own portfolio." }); return; }
  const parsed = body.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  if (!validProviderUrl(parsed.data.source, parsed.data.canonicalUrl ?? parsed.data.projectUrl)) {
    res.status(400).json({ error: "URL does not match the selected portfolio source." });
    return;
  }
  if (parsed.data.source === "upload" && (!parsed.data.objectPath || !parsed.data.mimeType)) {
    res.status(400).json({ error: "Uploaded portfolio items require a completed file upload." });
    return;
  }
  if (parsed.data.source && parsed.data.externalId) {
    const [existing] = await db.select().from(portfolioTable).where(and(
      eq(portfolioTable.profileId, params.data.profileId),
      eq(portfolioTable.source, parsed.data.source),
      eq(portfolioTable.externalId, parsed.data.externalId),
    ));
    if (existing) { res.json(existing); return; }
  }
  if (parsed.data.source === "upload") {
    if (!parsed.data.objectPath) { res.status(400).json({ error: "objectPath is required for uploads" }); return; }
    try { await validateUpload(params.data.profileId, parsed.data.objectPath, parsed.data.mimeType, parsed.data.fileSize); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid upload" }); return; }
  }
  const values = { ...parsed.data, profileId: params.data.profileId, tags: parsed.data.tags ?? [] };
  if (parsed.data.source && parsed.data.externalId) {
    const [project] = await db.insert(portfolioTable).values(values)
      .onConflictDoNothing({ target: [portfolioTable.profileId, portfolioTable.source, portfolioTable.externalId] })
      .returning();
    if (project) { res.status(201).json(project); return; }
    const [existing] = await db.select().from(portfolioTable).where(and(
      eq(portfolioTable.profileId, params.data.profileId),
      eq(portfolioTable.source, parsed.data.source),
      eq(portfolioTable.externalId, parsed.data.externalId),
    ));
    if (existing) { res.json(existing); return; }
    res.status(409).json({ error: "This portfolio item already exists." });
    return;
  }
  const [project] = await db.insert(portfolioTable).values(values).returning();
  res.status(201).json(project);
});

router.put("/profiles/:profileId/portfolio/reorder", async (req, res): Promise<void> => {
  const params = idParams.safeParse(req.params);
  const ids = z.array(z.number().int().positive()).max(200).safeParse(req.body?.ids);
  if (!params.success || !ids.success) { res.status(400).json({ error: "ids must be an array of portfolio ids" }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only modify your own portfolio." }); return; }
  await db.transaction(async (tx) => {
    for (const [sortOrder, id] of ids.data.entries()) {
      await tx.update(portfolioTable).set({ sortOrder, updatedAt: new Date() })
        .where(and(eq(portfolioTable.id, id), eq(portfolioTable.profileId, params.data.profileId)));
    }
  });
  res.json({ ok: true });
});

router.put("/profiles/:profileId/portfolio/:id", async (req, res): Promise<void> => {
  const params = itemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only modify your own portfolio." }); return; }
  const parsed = editBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [current] = await db.select().from(portfolioTable).where(and(
    eq(portfolioTable.id, params.data.id),
    eq(portfolioTable.profileId, params.data.profileId),
  ));
  if (!current) { res.status(404).json({ error: "Portfolio project not found" }); return; }
  const nextSource = parsed.data.source ?? current.source;
  const nextUrl = parsed.data.canonicalUrl ?? parsed.data.projectUrl ?? current.canonicalUrl ?? current.projectUrl;
  if (!validProviderUrl(nextSource, nextUrl)) {
    res.status(400).json({ error: "URL does not match the selected portfolio source." });
    return;
  }
  if (parsed.data.source === "upload" || parsed.data.objectPath) {
    if (!parsed.data.objectPath) { res.status(400).json({ error: "objectPath is required for uploads" }); return; }
    try { await validateUpload(params.data.profileId, parsed.data.objectPath, parsed.data.mimeType, parsed.data.fileSize); }
    catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : "Invalid upload" }); return; }
  }
  let project;
  try {
    [project] = await db.update(portfolioTable).set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(portfolioTable.id, params.data.id), eq(portfolioTable.profileId, params.data.profileId))).returning();
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      res.status(409).json({ error: "This imported portfolio item already exists." });
      return;
    }
    throw error;
  }
  if (!project) { res.status(404).json({ error: "Portfolio project not found" }); return; }
  res.json(project);
});

router.delete("/profiles/:profileId/portfolio/:id", async (req, res): Promise<void> => {
  const params = itemParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only modify your own portfolio." }); return; }
  await db.delete(portfolioTable).where(and(eq(portfolioTable.id, params.data.id), eq(portfolioTable.profileId, params.data.profileId)));
  res.sendStatus(204);
});

router.get("/profiles/:profileId/portfolio/import/github", async (req, res): Promise<void> => {
  const params = idParams.safeParse(req.params);
  const username = z.string().regex(/^[A-Za-z0-9-]{1,39}$/).safeParse(req.query.username);
  if (!params.success || !username.success) { res.status(400).json({ error: "A valid public GitHub username is required" }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only import into your own portfolio." }); return; }
  try {
    const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username.data)}/repos?per_page=100&sort=updated`, { headers: { Accept: "application/vnd.github+json", "User-Agent": "ProConnect-Portfolio-Importer" } });
    if (response.status === 403 || response.status === 429) { res.status(429).json({ error: "GitHub rate limit reached; try again later." }); return; }
    if (!response.ok) { res.status(response.status === 404 ? 404 : 502).json({ error: "GitHub repository discovery failed" }); return; }
    const repos = await response.json() as Array<any>;
    res.json(repos.map((repo) => ({ externalId: String(repo.id), title: repo.name, description: repo.description, canonicalUrl: repo.html_url, projectUrl: repo.homepage || repo.html_url, imageUrl: null, tags: repo.language ? [repo.language] : [], source: "github" })));
  } catch { res.status(502).json({ error: "GitHub is unavailable" }); }
});

router.post("/profiles/:profileId/portfolio/import", async (req, res): Promise<void> => {
  const params = idParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  if (!owns(req, params.data.profileId)) { res.status(403).json({ error: "You may only import into your own portfolio." }); return; }
  const input = z.object({ items: z.array(body.refine((item) => validProviderUrl(item.source, item.canonicalUrl ?? item.projectUrl), "URL does not match provider")).min(1).max(100) }).safeParse(req.body);
  if (!input.success) { res.status(400).json({ error: input.error.message }); return; }
  const imported = [];
  for (const item of input.data.items) {
    if (item.source === "upload") { res.status(400).json({ error: "Bulk upload imports are not supported; attach uploads individually." }); return; }
    const existing = item.externalId && item.source ? await db.select().from(portfolioTable).where(and(eq(portfolioTable.profileId, params.data.profileId), eq(portfolioTable.source, item.source), eq(portfolioTable.externalId, item.externalId))) : [];
    if (existing[0]) { imported.push(existing[0]); continue; }
    const [row] = await db.insert(portfolioTable).values({ ...item, profileId: params.data.profileId, tags: item.tags ?? [] })
      .onConflictDoNothing({ target: [portfolioTable.profileId, portfolioTable.source, portfolioTable.externalId] }).returning();
    if (row) imported.push(row);
    else {
      const [existingRow] = await db.select().from(portfolioTable).where(and(eq(portfolioTable.profileId, params.data.profileId), eq(portfolioTable.source, item.source!), eq(portfolioTable.externalId, item.externalId!)));
      if (existingRow) imported.push(existingRow);
    }
  }
  res.status(201).json(imported);
});

export default router;
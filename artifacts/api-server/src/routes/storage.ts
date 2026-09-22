import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { eq } from "drizzle-orm";
import { db, portfolioTable, portfolioUploadTicketsTable } from "@workspace/db";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { logger } from "../lib/logger";
import { canViewProfile, companyReleaseScope } from "../lib/privacyProjection";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  if (!req.session.profileId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { name, size, contentType, purpose } = parsed.data;
    const portfolioMimeTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (purpose === "portfolio") {
      if (!portfolioMimeTypes.includes(contentType)) {
        res.status(400).json({ error: "Portfolio uploads must be PDF, PNG, JPEG, or WebP" });
        return;
      }
      if (size > 15 * 1024 * 1024) {
        res.status(413).json({ error: "Portfolio uploads must be 15MB or smaller" });
        return;
      }
    }

    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
    if (purpose === "portfolio") {
      await db.insert(portfolioUploadTicketsTable).values({
        profileId: req.session.profileId,
        objectPath,
        originalName: name,
        declaredMimeType: contentType,
        declaredSize: size,
      });
    }

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    logger.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    logger.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * Serve a portfolio upload by item id without exposing its object-storage path.
 * Public items are viewable from public profiles; private items are owner-only.
 */
router.get("/storage/portfolio/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid portfolio item" });
    return;
  }
  try {
    const [item] = await db.select({
      profileId: portfolioTable.profileId,
      objectPath: portfolioTable.objectPath,
      visibility: portfolioTable.visibility,
      mimeType: portfolioTable.mimeType,
    }).from(portfolioTable).where(eq(portfolioTable.id, id));
    if (!item?.objectPath) {
      res.status(404).json({ error: "Portfolio file not found" });
      return;
    }
    if (!(await canViewProfile(req, item.profileId))) {
      res.status(404).json({ error: "Portfolio file not found" });
      return;
    }
    const scope = await companyReleaseScope(req, item.profileId);
    const ownerOrAdmin = Number(req.session?.profileId) === item.profileId || req.session?.isAdmin === true;
    if (!ownerOrAdmin && (!scope.has("portfolio") || item.visibility !== "public")) {
      res.status(403).json({ error: "This portfolio file is private" });
      return;
    }
    const objectFile = await objectStorageService.getObjectEntityFile(item.objectPath);
    const response = await objectStorageService.downloadObject(objectFile);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", item.mimeType ?? "application/octet-stream");
    res.setHeader("Content-Disposition", item.mimeType === "application/pdf" ? "attachment" : "inline");
    if (response.body) {
      Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Portfolio file not found" });
      return;
    }
    logger.error({ err: error, portfolioId: id }, "Error serving portfolio file");
    res.status(500).json({ error: "Failed to serve portfolio file" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const [ticket] = await db.select({ profileId: portfolioUploadTicketsTable.profileId })
      .from(portfolioUploadTicketsTable).where(eq(portfolioUploadTicketsTable.objectPath, objectPath));
    if (!ticket || req.session.profileId !== ticket.profileId) {
      res.status(403).json({ error: "You do not have access to this uploaded object" });
      return;
    }
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      logger.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    logger.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;

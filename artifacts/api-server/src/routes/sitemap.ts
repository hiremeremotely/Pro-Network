import { Router } from "express";
import { db } from "@workspace/db";
import { jobsTable, profilesTable } from "@workspace/db";

const router = Router();

const SITE_URL = "https://hiremeremotely.com";

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function urlEntry(loc: string, changefreq: string, priority: string): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const [jobs, profiles] = await Promise.all([
      db.select({ id: jobsTable.id }).from(jobsTable),
      db.select({ id: profilesTable.id }).from(profilesTable),
    ]);

    const staticRoutes = [
      urlEntry(`${SITE_URL}/`, "monthly", "1.0"),
      urlEntry(`${SITE_URL}/jobs`, "weekly", "0.9"),
      urlEntry(`${SITE_URL}/profiles`, "weekly", "0.8"),
      urlEntry(`${SITE_URL}/terms`, "monthly", "0.3"),
      urlEntry(`${SITE_URL}/privacy`, "monthly", "0.3"),
    ];

    const jobEntries = jobs.map(j =>
      urlEntry(`${SITE_URL}/jobs/${j.id}`, "weekly", "0.8"),
    );

    const profileEntries = profiles.map(p =>
      urlEntry(`${SITE_URL}/profiles/${p.id}`, "monthly", "0.6"),
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticRoutes,
      ...jobEntries,
      ...profileEntries,
      "</urlset>",
    ].join("\n");

    res.set("Content-Type", "application/xml");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "Failed to generate sitemap");
    res.status(500).send("Error generating sitemap");
  }
});

export default router;

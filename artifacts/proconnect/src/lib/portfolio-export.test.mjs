import test from "node:test";
import assert from "node:assert/strict";
import { exportProjectUrl, parsePortfolioExport, validateExportFile } from "./portfolio-export.ts";

test("LinkedIn Projects.csv preserves quoted values and withholds unrelated links", () => {
  const result = parsePortfolioExport('\uFEFFName,Description,Url\n"Research, redesign","Led ""accessibility"" review\nwith users",https://www.linkedin.com/in/example/\nOther,No link,https://evil.example/in/fake', "linkedin");
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].title, "Research, redesign");
  assert.match(result.projects[0].description, /review\nwith users/);
  assert.equal(result.projects[1].projectUrl, "");
  assert.equal(result.warnings.length, 1);
});

test("template CSV accepts platform project links and fields", () => {
  const result = parsePortfolioExport("title,description,project_url,tags\r\nVisual identity,Brand work,https://behance.net/gallery/123,Branding;Illustration", "behance");
  assert.deepEqual(result.projects[0].tags, ["Branding", "Illustration"]);
  assert.equal(result.projects[0].projectUrl, "https://behance.net/gallery/123");
  assert.equal(exportProjectUrl("javascript:alert(1)", "behance"), false);
  assert.equal(exportProjectUrl("https://behance.net.evil.test/gallery/123", "behance"), false);
});

test("malformed, oversize, and wrong format exports fail closed", () => {
  assert.throws(() => parsePortfolioExport('title,description\n"unfinished', "dribbble"), /unfinished/);
  assert.throws(() => parsePortfolioExport("title,title\nA,B", "dribbble"), /duplicate/);
  assert.throws(() => parsePortfolioExport("name,description\nA,B", "dribbble"), /title column/);
  assert.throws(() => parsePortfolioExport("title\n" + "A\n".repeat(101), "behance"), /at most 100/);
  assert.throws(() => validateExportFile({ name: "download.zip", size: 100 }), /ZIP/);
  assert.throws(() => validateExportFile({ name: "Projects.csv", size: 2 * 1024 * 1024 + 1 }), /2 MB/);
});
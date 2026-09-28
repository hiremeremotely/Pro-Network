import test from "node:test";
import assert from "node:assert/strict";
import { buildHubItems, profileShareUrl } from "./professional-hub.ts";
import { editedPortfolioSource, portfolioEditPayload, withPortfolioProjectUrl } from "./portfolio-edit.ts";

const base = "/";

test("query and fragment identify distinct destinations while exact repeats render once", () => {
  const profile = {
    website: "https://example.com/work?view=one",
    customLinks: [
      { url: "https://example.com/work?view=two", label: "Second view" },
      { url: "https://example.com/work?view=one#details", label: "Details" },
      { url: "https://example.com/work?view=one", label: "Repeat" },
    ],
  };
  assert.deepEqual(buildHubItems(profile, false, base).map((item) => item.title), ["Website", "Second view", "Details"]);
});

test("featured portfolio wins over both other portfolio entries and legacy links with the same URL", () => {
  const destination = "https://github.com/example/project";
  const profile = {
    githubUrl: destination,
    customLinks: [{ label: "Repeated", url: destination }],
    portfolio: [
      { id: 1, title: "Ordinary", projectUrl: destination, featured: false, visibility: "public" },
      { id: 2, title: "Featured case study", projectUrl: destination, featured: true, visibility: "public", source: "github" },
    ],
  };
  assert.deepEqual(buildHubItems(profile, false, base).map(({ title, provider }) => [title, provider]), [["Featured case study", "github"]]);
  assert.equal(profile.portfolio[0].title, "Ordinary", "building the hub must not reorder the profile response");
});

test("private projects are visible only to the owner and cannot hide public links from visitors", () => {
  const profile = {
    website: "https://example.com/private",
    portfolio: [{ id: 1, title: "Private case study", projectUrl: "https://example.com/private", visibility: "private" }],
  };
  assert.deepEqual(buildHubItems(profile, false, base).map((item) => item.title), ["Website"]);
  assert.deepEqual(buildHubItems(profile, true, base).map((item) => item.title), ["Private case study"]);
});

test("reviewed portfolio summaries without approved source URLs are not outbound links", () => {
  const profile = { portfolio: [
    { id: 1, title: "Reviewed work", description: "Built a design system", visibility: "public", source: "github", projectUrl: null, canonicalUrl: null },
    { id: 2, title: "LinkedIn profile", visibility: "public", source: "linkedin", projectUrl: null, canonicalUrl: null },
    { id: 3, title: "Uploaded CV", description: "Case study", visibility: "public", mimeType: "application/pdf" },
  ] };
  const visitor = buildHubItems(profile, false, base);
  assert.deepEqual(visitor.map((item) => item.title), ["Reviewed work", "Uploaded CV"]);
  assert.ok(visitor.every((item) => item.url === null));
  assert.equal(buildHubItems(profile, true, base).find((item) => item.title === "Uploaded CV")?.url, "/api/storage/portfolio/3");
});

test("shared profile URL ignores the current page query and fragment and respects the base path", () => {
  assert.equal(profileShareUrl("https://example.com?tracking=123#tab", "/app/", 42), "https://example.com/app/profiles/42");
});

test("editing imported providers keeps the source, external identity and canonical URL", () => {
  for (const [source, externalId, url] of [
    ["github", "repo-123", "https://github.com/example/repo"],
    ["linkedin", "member-123", "https://linkedin.com/in/example"],
  ]) {
    const payload = portfolioEditPayload({
      title: "Edited", description: "", tags: [], visibility: "public", featured: true,
      source: editedPortfolioSource(source, "personal"), externalId, canonicalUrl: url,
      projectUrl: url,
    });
    assert.deepEqual([payload.source, payload.externalId, payload.canonicalUrl], [source, externalId, url]);
  }
  assert.equal(editedPortfolioSource("manual", "behance"), "behance");
  const hub = buildHubItems({ portfolio: [{
    id: 99, title: "Repository", projectUrl: "https://project.framer.website",
    canonicalUrl: "https://github.com/example/repo", source: "github", visibility: "public",
  }] }, false, base);
  assert.equal(hub[0].provider, "github");
});

test("form URL change retains imported canonical provider identity but updates manual canonical URLs", () => {
  for (const [source, externalId, canonicalUrl] of [
    ["github", "repo-123", "https://github.com/example/repo"],
    ["linkedin", "member-123", "https://linkedin.com/in/example"],
  ]) {
    const draft = withPortfolioProjectUrl({
      title: "Project", description: "", tags: [], featured: false, visibility: "public",
      source, externalId, projectUrl: canonicalUrl, canonicalUrl,
    }, "https://deployed.example/app", true);
    const payload = portfolioEditPayload({ ...draft, source: editedPortfolioSource(draft.source, "personal") });
    assert.deepEqual([payload.projectUrl, payload.canonicalUrl, payload.source, payload.externalId],
      ["https://deployed.example/app", canonicalUrl, source, externalId]);
  }
  assert.equal(withPortfolioProjectUrl({ source: "manual", canonicalUrl: "https://old.example" }, "https://new.example", true).canonicalUrl, "https://new.example");
});
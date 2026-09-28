import test from "node:test";
import assert from "node:assert/strict";
import { existingImport, importedItemIdentity, preservesImportedIdentity, rowsForPortfolioViewer, validProviderUrl } from "./portfolio-rules.ts";

test("re-import matches the same provider and external ID, returning the edited stored item", () => {
  const saved = { source: "github", externalId: "123", title: "My edited title", featured: true };
  assert.equal(existingImport([saved], "github", "123"), saved);
  assert.equal(existingImport([saved], "linkedin", "123"), undefined);
  assert.deepEqual(importedItemIdentity("github", "123"), { source: "github", externalId: "123" });
  assert.equal(importedItemIdentity("github", null), null);
});

test("edits cannot relabel or re-key imported items, but can change display fields", () => {
  for (const source of ["github", "linkedin"]) {
    const current = { source, externalId: "123" };
    assert.equal(preservesImportedIdentity(current, { source, externalId: "123", title: "New" }), true);
    assert.equal(preservesImportedIdentity(current, { source: "personal" }), false);
    assert.equal(preservesImportedIdentity(current, { externalId: "456" }), false);
    assert.equal(preservesImportedIdentity(current, { externalId: null }), false);
  }
});

test("provider validation accepts a deployed project URL only when the original provider URL remains canonical", () => {
  const edit = {
    source: "github", externalId: "123",
    projectUrl: "https://my-deployed-project.example",
    canonicalUrl: "https://github.com/example/repo",
  };
  assert.equal(preservesImportedIdentity({ source: "github", externalId: "123" }, edit), true);
  assert.equal(validProviderUrl(edit.source, edit.canonicalUrl ?? edit.projectUrl), true);
  assert.equal(validProviderUrl(edit.source, edit.projectUrl), false);
  assert.equal(validProviderUrl("linkedin", "https://linkedin.com/in/example"), true);
});

test("visitor portfolio results exclude private items and object paths without changing owner results", () => {
  const rows = [
    { visibility: "public", title: "Public", objectPath: "/objects/public", projectUrl: "https://github.com/person/repo", canonicalUrl: "https://github.com/person/repo", imageUrl: "https://example.com/person.jpg", externalId: "123" },
    { visibility: "private", title: "Private", objectPath: "/objects/private", projectUrl: "https://example.com/private" },
  ];
  assert.equal(rowsForPortfolioViewer(rows, true), rows);
  assert.deepEqual(rowsForPortfolioViewer(rows, false), [{
    visibility: "public", title: "Public", projectUrl: null, canonicalUrl: null, imageUrl: null, externalId: null,
  }]);
  assert.deepEqual(rowsForPortfolioViewer(rows, false, true), [{
    visibility: "public", title: "Public", projectUrl: "https://github.com/person/repo", canonicalUrl: "https://github.com/person/repo",
    imageUrl: "https://example.com/person.jpg", externalId: "123",
  }]);
});
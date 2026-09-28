import test from "node:test";
import assert from "node:assert/strict";
import { blockedProvider, discoverSource, metadata, publicIpv4, robotsAllows, sourceUrl } from "./portfolio-source-discovery.ts";

test("only public, ordinary web addresses may be fetched", () => {
  for (const ip of ["127.0.0.1", "10.4.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "198.18.0.1"]) {
    assert.equal(publicIpv4(ip), false);
  }
  assert.equal(publicIpv4("8.8.8.8"), true);
  for (const url of ["http://localhost", "http://127.0.0.1", "http://[::1]", "https://user:pass@example.com", "https://example.com:8443", "file:///tmp/test", "http://metadata.internal"]) {
    assert.throws(() => sourceUrl(url), url);
  }
});

test("restricted provider pages are classified without requesting their content", async () => {
  assert.equal(blockedProvider("notlinkedin.com"), false);
  assert.equal(blockedProvider("www.linkedin.com"), true);
  const result = await discoverSource("https://www.linkedin.com/in/sample");
  assert.equal(result.status, "needs_input");
  assert.deepEqual(result.candidates, []);
  assert.match(result.message, /cannot import/i);
});

test("site metadata extracts only page-backed draft fields and bounded project links", () => {
  const page = new URL("https://myportfolio.example/");
  const html = `<title>Portfolio Home</title>
    <meta content="A work overview &amp; case studies" name="description">
    <meta property='og:title' content='My &amp; Work'>
    <meta property="og:image" content="/preview.png">
    <link rel="canonical" href="https://myportfolio.example/">
    <a href="/projects/design-system">One</a>
    <a href="/projects/design-system">Duplicate</a>
    <a href="http://127.0.0.1/projects/private">Private</a>
    <a href="https://not-myportfolio.example/projects/else">Other site</a>`;
  const result = metadata(html, page);
  assert.equal(result.candidate.title, "My & Work");
  assert.equal(result.candidate.description, "A work overview & case studies");
  assert.equal(result.candidate.imageUrl, "https://myportfolio.example/preview.png");
  assert.deepEqual(result.links.map((url) => url.href), ["https://myportfolio.example/projects/design-system"]);
});

test("robots wildcard disallow and more specific allow are honored", () => {
  const robots = "User-agent: *\nDisallow: /private\nAllow: /private/public\nUser-agent: Other\nDisallow: /";
  assert.equal(robotsAllows(robots, "/projects/test"), true);
  assert.equal(robotsAllows(robots, "/private/job"), false);
  assert.equal(robotsAllows(robots, "/private/public/item"), true);
  assert.equal(robotsAllows("User-agent: *\nAllow: /\nUser-agent: HMR-Portfolio-Preview\nDisallow: /", "/"), false);
  assert.equal(robotsAllows("User-agent: *\nAllow: /private/*/ok\nDisallow: /private/", "/private/secret"), false);
  assert.equal(robotsAllows("User-agent: *\nAllow: /private/*/ok\nDisallow: /private/", "/private/secret/ok"), true);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /private/\nAllow: /private/", "/private/x"), true);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /projects$\n", "/projects"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /projects$\n", "/projects/x"), true);
});
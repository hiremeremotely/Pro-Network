import test from "node:test";
import assert from "node:assert/strict";
import { blockedProvider, discoverPersonalSource, discoverSource, metadata, publicIpv4, robotsAllows, sitemapLocations, sourceUrl } from "./portfolio-source-discovery.ts";

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

function fixture(pages, forbidden = []) {
  const requested = [];
  const load = async (url, xml = false) => {
    requested.push([url.pathname, xml]);
    if (forbidden.some((path) => url.pathname.startsWith(path))) throw new Error("This site does not permit HMR to read this page.");
    const body = pages[url.pathname];
    return { url, status: body === undefined ? 404 : 200, body: body ?? "", truncated: false };
  };
  return { requested, load };
}

test("sitemap parses same-origin entries and rejects private and foreign URLs", () => {
  const result = sitemapLocations(`<urlset>
    <url><loc>https://folio.example/launch&amp;learn</loc></url>
    <url><loc>https://outside.example/other</loc></url>
    <url><loc>http://127.0.0.1/secret</loc></url>
  </urlset>`, new URL("https://folio.example/sitemap.xml"));
  assert.deepEqual(result.pages.map((item) => item.href), ["https://folio.example/launch&learn"]);
});

test("sitemap-only unusual slugs become drafts only when the page identifies a project", async () => {
  const { load, requested } = fixture({
    "/": "<title>Portfolio</title>",
    "/sitemap.xml": `<sitemapindex><sitemap><loc>https://folio.example/portfolio-map.xml</loc></sitemap></sitemapindex>`,
    "/portfolio-map.xml": `<urlset><url><loc>https://folio.example/</loc></url><url><loc>https://folio.example/blue-orbit</loc></url><url><loc>https://folio.example/about</loc></url></urlset>`,
    "/blue-orbit": `<script type="application/ld+json">{"@context":"https://schema.org","@type":"CreativeWork","name":"Blue Orbit","description":"A public project."}</script>`,
    "/about": "<title>About me</title>",
  });
  const result = await discoverPersonalSource(new URL("https://folio.example/"), load);
  assert.equal(result.status, "projects");
  assert.deepEqual(result.candidates.map((item) => item.title), ["Blue Orbit"]);
  assert.deepEqual(requested, [["/", false], ["/sitemap.xml", true], ["/portfolio-map.xml", true], ["/blue-orbit", false], ["/about", false]]);
});

test("structured project lists reveal unusual same-site slugs; forbidden pages remain excluded", async () => {
  const { load, requested } = fixture({
    "/": `<title>Portfolio</title><script type="application/ld+json">
      {"@type":"ItemList","itemListElement":[{"url":"/atlas"},{"url":"/secret"},{"url":"https://other.example/foreign"}]}
      </script>`,
    "/atlas": `<title>Atlas</title><script type="application/ld+json">{"@type":"Project","url":"/atlas"}</script>`,
    "/sitemap.xml": "",
  }, ["/secret"]);
  const result = await discoverPersonalSource(new URL("https://folio.example/"), load);
  assert.equal(result.status, "projects");
  assert.deepEqual(result.candidates.map((item) => item.title), ["Atlas"]);
  assert.equal(requested.some(([path]) => path === "/foreign"), false);
});

test("uncorroborated sitemap pages remain a site preview and requests stay bounded", async () => {
  const pages = { "/": "<title>My site</title>",
    "/sitemap.xml": `<urlset>${Array.from({ length: 25 }, (_, i) => `<url><loc>https://folio.example/odd-${i}</loc></url>`).join("")}</urlset>` };
  for (let i = 0; i < 25; i++) pages[`/odd-${i}`] = `<title>Generic page ${i}</title>`;
  const { load, requested } = fixture(pages);
  const result = await discoverPersonalSource(new URL("https://folio.example/"), load);
  assert.equal(result.status, "site_preview");
  assert.deepEqual(result.candidates.map((item) => item.title), ["My site"]);
  assert.equal(requested.length, 6);
  assert.match(result.message, /no individual project pages were confirmed/i);
});

test("a disallowed sitemap cannot turn the home page into a project", async () => {
  const { load, requested } = fixture({ "/": "<title>My portfolio</title>" }, ["/sitemap.xml"]);
  const result = await discoverPersonalSource(new URL("https://folio.example/"), load);
  assert.equal(result.status, "site_preview");
  assert.deepEqual(result.candidates.map((item) => item.title), ["My portfolio"]);
  assert.deepEqual(requested, [["/", false], ["/sitemap.xml", true]]);
});

// Exercise discoverSource's real redirect/robots/DNS policy with controlled HTTP
// responses. No request here opens a socket or uses a third-party service.
function networkFixture(responses) {
  const requested = [], resolved = [];
  const network = {
    resolve: async (host) => { resolved.push(host); return [{ address: "8.8.8.8", family: 4 }]; },
    request: async (url, pinned, xml) => {
      assert.deepEqual(pinned, { address: "8.8.8.8", family: 4 });
      requested.push(url.href);
      const response = responses[url.href];
      if (!response) throw new Error(`Unexpected outbound request: ${url.href}`);
      return { status: 200, contentType: xml ? "application/xml" : "text/html", body: "", truncated: false, ...response };
    },
  };
  return { network, requested, resolved };
}

const site = "https://folio.example";

test("truncated oversized robots rules never authorize a project fetch", async () => {
  const project = `${site}/projects/secret`;
  const { network, requested, resolved } = networkFixture({
    [`${site}/robots.txt`]: {
      contentType: "text/plain",
      body: `User-agent: *\nAllow: /projects/\n${"# padding\n".repeat(64000)}`,
      truncated: true,
    },
    [project]: { body: "<title>Secret project</title>" },
  });
  const result = await discoverSource(project, network);
  assert.equal(result.status, "error");
  assert.deepEqual(result.candidates, []);
  assert.match(result.message, /could not verify.*access rules/i);
  assert.deepEqual(requested, [`${site}/robots.txt`]);
  assert.deepEqual(resolved, ["folio.example"]);
});

test("robots redirects to another origin do not authorize a project fetch", async () => {
  const project = `${site}/projects/secret`;
  const foreignRules = "https://another.example/robots.txt";
  const { network, requested, resolved } = networkFixture({
    [`${site}/robots.txt`]: { status: 302, location: foreignRules },
    [foreignRules]: { contentType: "text/plain", body: "User-agent: *\nAllow: /" },
    [project]: { body: "<title>Secret project</title>" },
  });
  const result = await discoverSource(project, network);
  assert.equal(result.status, "error");
  assert.deepEqual(result.candidates, []);
  assert.match(result.message, /original website/i);
  assert.deepEqual(requested, [`${site}/robots.txt`]);
  assert.deepEqual(resolved, ["folio.example"]);
});

test("complete allowed robots rules still permit a normal project preview", async () => {
  const project = `${site}/projects/atlas`;
  const { network, requested } = networkFixture({
    [`${site}/robots.txt`]: { contentType: "text/plain", body: "User-agent: *\nAllow: /projects/" },
    [project]: { body: "<title>Atlas case study</title><meta name='description' content='A public project'>" },
    [`${site}/sitemap.xml`]: { status: 404 },
  });
  const result = await discoverSource(project, network);
  assert.equal(result.status, "projects");
  assert.deepEqual(result.candidates.map(candidate => candidate.title), ["Atlas case study"]);
  assert.equal(result.candidates[0].projectUrl, project);
  assert.deepEqual(requested, [`${site}/robots.txt`, project, `${site}/sitemap.xml`]);
});

test("a permitted entry redirect cannot fetch a robots-disallowed destination or draft it", async () => {
  const { network, requested, resolved } = networkFixture({
    [`${site}/robots.txt`]: { contentType: "text/plain", body: "User-agent: *\nDisallow: /private/" },
    [`${site}/go`]: { status: 302, location: "/private/case-study" },
    [`${site}/private/case-study`]: { body: "<title>Secret work</title>" },
  });
  const result = await discoverSource(`${site}/go`, network);
  assert.equal(result.status, "link_only");
  assert.deepEqual(result.candidates, []);
  assert.match(result.message, /does not permit/);
  assert.deepEqual(requested, [`${site}/robots.txt`, `${site}/go`]);
  assert.deepEqual(resolved, ["folio.example", "folio.example"]);
});

test("a cross-origin redirect is rejected before its destination is resolved or fetched", async () => {
  const { network, requested, resolved } = networkFixture({
    [`${site}/robots.txt`]: { status: 404 },
    [`${site}/go`]: { status: 301, location: "https://another.example/projects/secret" },
    "https://another.example/projects/secret": { body: "<title>Foreign work</title>" },
  });
  const result = await discoverSource(`${site}/go`, network);
  assert.equal(result.status, "error");
  assert.deepEqual(result.candidates, []);
  assert.match(result.message, /original website/);
  assert.deepEqual(requested, [`${site}/robots.txt`, `${site}/go`]);
  assert.deepEqual(resolved, ["folio.example", "folio.example"]);
});

test("allowed same-origin redirects can still produce a reviewed project draft", async () => {
  const { network, requested } = networkFixture({
    [`${site}/robots.txt`]: { contentType: "text/plain", body: "User-agent: *\nDisallow: /private/\nAllow: /projects/" },
    [`${site}/go`]: { status: 302, location: "/projects/atlas" },
    [`${site}/projects/atlas`]: { body: "<title>Atlas case study</title><meta name='description' content='A public project'>" },
    [`${site}/sitemap.xml`]: { status: 404 },
  });
  const result = await discoverSource(`${site}/go`, network);
  assert.equal(result.status, "projects");
  assert.deepEqual(result.candidates.map(candidate => candidate.title), ["Atlas case study"]);
  assert.equal(result.candidates[0].projectUrl, `${site}/projects/atlas`);
  assert.deepEqual(requested, [`${site}/robots.txt`, `${site}/go`, `${site}/projects/atlas`, `${site}/sitemap.xml`]);
});

test("a child project redirect to a forbidden page remains only a site preview", async () => {
  const { network, requested } = networkFixture({
    [`${site}/robots.txt`]: { contentType: "text/plain", body: "User-agent: *\nDisallow: /private/" },
    [`${site}/`]: { body: '<title>Portfolio overview</title><a href="/projects/teaser">Project</a>' },
    [`${site}/sitemap.xml`]: { status: 404 },
    [`${site}/projects/teaser`]: { status: 302, location: "/private/secret" },
    [`${site}/private/secret`]: { body: "<title>Secret project</title>" },
  });
  const result = await discoverSource(`${site}/`, network);
  assert.equal(result.status, "site_preview");
  assert.deepEqual(result.candidates.map(candidate => candidate.title), ["Portfolio overview"]);
  assert.deepEqual(requested, [`${site}/robots.txt`, `${site}/`, `${site}/sitemap.xml`, `${site}/projects/teaser`]);
});
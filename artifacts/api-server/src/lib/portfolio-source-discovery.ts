import { lookup } from "node:dns/promises";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import type { LookupFunction } from "node:net";

export type SourceCandidate = {
  title: string;
  description: string | null;
  projectUrl: string;
  canonicalUrl: string;
  imageUrl: string | null;
  tags: string[];
  source: "personal" | "github";
  externalId: string;
};
export type SourceResult = {
  url: string;
  status: "projects" | "site_preview" | "link_only" | "needs_input" | "error";
  message: string;
  candidates: SourceCandidate[];
};

const blockedHosts = ["linkedin.com", "behance.net", "dribbble.com", "x.com", "twitter.com"];
const userAgent = "HMR-Portfolio-Preview/1.0";

export function blockedProvider(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^www\./, "");
  return blockedHosts.some((blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`));
}

export function publicIpv4(address: string): boolean {
  if (isIP(address) !== 4) return false; // IPv6 deliberately unsupported; never risk an unclassified internal range.
  const [a, b, c] = address.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || b === 0 && c === 0)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  return !(a === 192 && b === 0 && c === 0);
}

export function sourceUrl(value: string): URL {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
    !url.hostname.includes(".") || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal") ||
    isIP(url.hostname) !== 0 || url.href.length > 2048) {
    throw new Error("Enter a public http(s) URL without credentials or a custom port.");
  }
  url.hash = "";
  return url;
}

async function fetchPublic(
  value: URL, remaining = 2, obeyRobots = false, robotsCache = new Map<string, string | null>(),
  xml = false, sameOrigin?: string,
): Promise<{ url: URL; status: number; body: string; truncated: boolean }> {
  if (sameOrigin && value.origin !== sameOrigin) throw new Error("Discovery stays on the original website.");
  if (blockedProvider(value.hostname) || value.hostname === "github.com") throw new Error("This provider does not allow public page extraction here.");
  if (obeyRobots) {
    if (!robotsCache.has(value.origin)) {
      const rules = await fetchPublic(new URL("/robots.txt", value), 2, false, robotsCache, false, value.origin);
      if (rules.url.origin !== value.origin || rules.truncated) throw new Error("Could not verify this site's access rules.");
      robotsCache.set(value.origin, rules.status === 404 ? null : rules.body);
    }
    const rules = robotsCache.get(value.origin);
    if (rules && !robotsAllows(rules, value.pathname + value.search)) throw new Error("This site does not permit HMR to read this page.");
  }
  const answers = await lookup(value.hostname, { all: true, verbatim: true });
  const addresses = answers.filter((answer) => answer.family === 4);
  if (!addresses.length || addresses.some((answer) => !publicIpv4(answer.address))) throw new Error("This address is not a public website.");
  const { address, family } = addresses[0];
  const pinnedLookup = ((_host: string, options: { all?: boolean },
    callback: (err: NodeJS.ErrnoException | null, addresses: unknown, family?: number) => void) => {
    if (options.all) callback(null, [{ address, family }]);
    else callback(null, address, family);
  }) as LookupFunction;
  const result = await new Promise<{ status: number; location?: string; contentType: string; body: string; truncated: boolean }>((resolve, reject) => {
    const request = (value.protocol === "https:" ? httpsRequest : httpRequest)(value, {
       method: "GET", lookup: pinnedLookup, headers: { "User-Agent": userAgent, Accept: xml ? "application/xml,text/xml;q=0.9,text/plain;q=0.8" : "text/html,text/plain;q=0.8" },
      timeout: 4500,
    }, (response) => {
      const status = response.statusCode ?? 0;
      const contentType = String(response.headers["content-type"] || "");
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 512_000) {
          chunks.push(chunk.subarray(0, Math.max(0, chunk.length - (bytes - 512_000))));
          resolve({ status, location: response.headers.location, contentType, body: Buffer.concat(chunks).toString("utf8"), truncated: true });
          response.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({
        status, location: response.headers.location,
        contentType, body: Buffer.concat(chunks).toString("utf8"), truncated: false,
      }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("The source timed out.")));
    request.on("error", reject);
    request.end();
  });
  if (result.status >= 300 && result.status < 400 && result.location) {
    if (remaining <= 0) throw new Error("Too many redirects.");
    const next = sourceUrl(new URL(result.location, value).href);
    return fetchPublic(next, remaining - 1, obeyRobots, robotsCache, xml, sameOrigin);
  }
  if (result.status === 404) return { url: value, status: 404, body: "", truncated: false };
  if (result.status !== 200) throw new Error(`The source returned HTTP ${result.status}.`);
  if (!(xml ? /(?:application|text)\/(?:xml|plain)|application\/[^;\s]+\+xml/i : /text\/html|text\/plain/i).test(result.contentType)) {
    throw new Error("This source did not return a supported page.");
  }
  return { url: value, status: result.status, body: result.body, truncated: result.truncated };
}

export function robotsAllows(text: string, path: string): boolean {
  const groups: Array<{ agents: string[]; rules: Array<{ pattern: string; allow: boolean }> }> = [];
  let group: (typeof groups)[number] | undefined;
  for (const line of text.split(/\r?\n/)) {
    const clean = line.split("#")[0].trim();
    if (!clean) continue;
    const [, key, value] = clean.match(/^([\w-]+):\s*(.*)$/) || [];
    if (!key) continue;
    if (key.toLowerCase() === "user-agent") {
      if (!group || group.rules.length) {
        group = { agents: [], rules: [] };
        groups.push(group);
      }
      group.agents.push(value.trim().toLowerCase());
      continue;
    }
    if (!group || !["allow", "disallow"].includes(key.toLowerCase()) || !value.trim()) continue;
    group.rules.push({ pattern: value.trim(), allow: key.toLowerCase() === "allow" });
  }
  const applicable = groups.filter((g) => g.agents.some((agent) => agent !== "*" && userAgent.toLowerCase().includes(agent)));
  const chosen = applicable.length ? applicable : groups.filter((g) => g.agents.includes("*"));
  const rules = chosen.flatMap((g) => g.rules);
  const matches = rules.filter((rule) => {
    const end = rule.pattern.endsWith("$");
    const raw = end ? rule.pattern.slice(0, -1) : rule.pattern;
    const expression = raw.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
    return new RegExp(`^${expression}${end ? "$" : ""}`).test(path);
  });
  matches.sort((a, b) => {
    const specificity = (r: (typeof rules)[number]) => r.pattern.replace(/[*$]/g, "").length;
    return specificity(b) - specificity(a) || Number(b.allow) - Number(a.allow);
  });
  return matches[0]?.allow ?? true;
}

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity: string) => {
    if (entity.startsWith("#")) {
      const n = entity[1]?.toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[entity.toLowerCase()] || "";
  });
}

function attrs(tag: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [, name, doubleQuoted, singleQuoted, bare] of tag.matchAll(/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[name.toLowerCase()] = decode(doubleQuoted ?? singleQuoted ?? bare ?? "");
  }
  return result;
}

function sameSiteUrl(value: string, base: URL): URL | null {
  try {
    const url = sourceUrl(new URL(value, base).href);
    return url.origin === base.origin ? url : null;
  } catch { return null; }
}

function structuredNodes(html: string): Record<string, any>[] {
  const nodes: Record<string, any>[] = [];
  function visit(value: unknown) {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, any>;
    nodes.push(node);
    if (node["@graph"]) visit(node["@graph"]);
  }
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/application\/ld\+json/i.test(attrs(match[1]).type || "")) continue;
    try { visit(JSON.parse(match[2])); } catch { /* ignore malformed structured data */ }
  }
  return nodes;
}

function isProjectNode(node: Record<string, any>): boolean {
  const types = [node["@type"]].flat().filter((type): type is string => typeof type === "string");
  return types.some((type) => /^(?:https?:\/\/schema\.org\/)?(?:Project|CreativeWork|SoftwareSourceCode|VisualArtwork|CaseStudy)$/i.test(type));
}

function structuredLinks(html: string, page: URL): URL[] {
  const urls: URL[] = [];
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const url = sameSiteUrl(value, page);
    if (url && url.href !== page.href && !urls.some((item) => item.href === url.href)) urls.push(url);
  };
  for (const node of structuredNodes(html)) {
    if (node["@type"] === "ItemList" && Array.isArray(node.itemListElement)) {
      for (const item of node.itemListElement.slice(0, 40)) {
        add(typeof item === "string" ? item : item?.url ?? item?.item?.url ?? item?.item);
      }
    }
    if (isProjectNode(node)) add(node.url);
  }
  return urls.slice(0, 12);
}

export function sitemapLocations(xml: string, base: URL): { pages: URL[]; indexes: URL[] } {
  const pages: URL[] = [], indexes: URL[] = [];
  for (const [element, list] of [["url", pages], ["sitemap", indexes]] as const) {
    const pattern = new RegExp(`<${element}\\b[^>]*>[\\s\\S]*?<loc\\b[^>]*>([\\s\\S]*?)<\\/loc>[\\s\\S]*?<\\/${element}>`, "gi");
    for (const match of xml.matchAll(pattern)) {
      const url = sameSiteUrl(decode(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim()), base);
      if (url && !list.some((item) => item.href === url.href)) list.push(url);
      if (list.length >= 40) break;
    }
  }
  return { pages, indexes };
}

function advertisedSitemap(robots: string | null, base: URL): URL | null {
  for (const match of (robots || "").matchAll(/^sitemap:\s*(\S+)/gim)) {
    const url = sameSiteUrl(match[1], base);
    if (url) return url;
  }
  return null;
}

export function metadata(html: string, page: URL): { candidate: SourceCandidate; links: URL[] } {
  const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((match) => attrs(match[0]));
  const meta = (...keys: string[]) => metas.find((m) => keys.includes((m.property || m.name || "").toLowerCase()))?.content?.trim() || "";
  const project = structuredNodes(html).find((node) => isProjectNode(node) &&
    (typeof node.url !== "string" || sameSiteUrl(node.url, page)?.pathname === page.pathname));
  const title = decode(meta("og:title", "twitter:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    (typeof project?.name === "string" ? project.name : "")).replace(/<[^>]*>/g, "").trim().slice(0, 200);
  const description = decode(meta("og:description", "description", "twitter:description") ||
    (typeof project?.description === "string" ? project.description : "")).slice(0, 1500) || null;
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]))
    .find((m) => m.rel?.toLowerCase() === "canonical")?.href;
  let canonicalUrl = page;
  try {
    if (canonical) {
      const candidate = sourceUrl(new URL(canonical, page).href);
      if (candidate.hostname === page.hostname) canonicalUrl = candidate;
    }
  } catch { /* use the fetched URL */ }
  let imageUrl: string | null = null;
  try {
    const image = meta("og:image", "twitter:image");
    if (image) {
      const parsed = sourceUrl(new URL(image, page).href);
      if (parsed.hostname === page.hostname) imageUrl = parsed.href;
    }
  } catch { /* avoid unsafe preview assets */ }
  const links: URL[] = [];
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attrs(match[0]).href;
    if (!href) continue;
    try {
      const target = sourceUrl(new URL(href, page).href);
      if (target.origin === page.origin && /\/(projects?|work|case-stud(?:y|ies)|portfolio)\/[^/]+/i.test(target.pathname) &&
        !links.some((link) => link.href === target.href)) links.push(target);
    } catch { /* ignore invalid links */ }
    if (links.length >= 4) break;
  }
  return { candidate: {
    title, description, projectUrl: canonicalUrl.href, canonicalUrl: canonicalUrl.href,
    imageUrl, tags: [], source: "personal", externalId: canonicalUrl.href,
  }, links };
}

function confirmedProject(html: string, page: URL): boolean {
  return structuredNodes(html).some((node) => {
    if (!isProjectNode(node)) return false;
    const declared = typeof node.url === "string" ? sameSiteUrl(node.url, page) : null;
    return (!declared || declared.pathname === page.pathname) && page.pathname !== "/";
  });
}

type Page = Awaited<ReturnType<typeof fetchPublic>>;
type PageLoader = (url: URL, xml?: boolean) => Promise<Page>;

// The optional loader makes the bounded discovery policy testable without making live network calls.
export async function discoverPersonalSource(value: URL, load: PageLoader, sitemapHint?: URL): Promise<SourceResult> {
  const page = await load(value);
  if (page.status === 404) throw new Error("The page was not found.");
  const parsed = metadata(page.body, page.url);
  const directProject = /\/(projects?|work|case-stud(?:y|ies)|portfolio)\/[^/]+/i.test(page.url.pathname) ||
    confirmedProject(page.body, page.url);
  const candidates: SourceCandidate[] = [];
  if (directProject && parsed.candidate.title) candidates.push(parsed.candidate);

  const leads = [...parsed.links, ...structuredLinks(page.body, page.url)];
  // At most two sitemap documents and four project pages per source, even for large indexes.
  let sitemap = sitemapHint ?? new URL("/sitemap.xml", page.url);
  for (let i = 0; i < 2 && leads.length < 40; i++) {
    try {
      const result = await load(sitemap, true);
      if (result.status !== 200 || result.truncated || result.url.origin !== page.url.origin) break;
      const locations = sitemapLocations(result.body, result.url);
      leads.push(...locations.pages);
      if (!locations.indexes.length) break;
      sitemap = locations.indexes[0];
    } catch { break; /* optional discovery must not hide the site preview */ }
  }
  const seen = new Set([page.url.href]);
  let checked = 0;
  for (const link of leads) {
    if (checked >= 4) break;
    if (link.origin !== page.url.origin || seen.has(link.href)) continue;
    seen.add(link.href);
    checked++;
    try {
      const child = await load(link);
      if (child.status !== 200 || child.url.origin !== page.url.origin) continue;
      const candidate = metadata(child.body, child.url).candidate;
      const conventional = /\/(projects?|work|case-stud(?:y|ies)|portfolio)\/[^/]+/i.test(child.url.pathname);
      if ((conventional || confirmedProject(child.body, child.url)) && candidate.title &&
        !candidates.some((existing) => existing.canonicalUrl === candidate.canonicalUrl)) candidates.push(candidate);
    } catch { /* a forbidden or broken project page must not discard other candidates */ }
  }
  if (candidates.length) return {
    url: value.href, status: "projects", candidates,
    message: `${candidates.length} public project page${candidates.length === 1 ? "" : "s"} found. Review the extracted metadata.`,
  };
  return { url: value.href, status: "site_preview", candidates: parsed.candidate.title ? [parsed.candidate] : [],
    message: page.truncated
      ? "Only a site preview was available from the start of this large page; other projects may not have been detected. Add project links individually."
      : "Only a site preview was available; no individual project pages were confirmed within this check. Review it or add projects yourself." };
}

async function githubCandidates(url: URL): Promise<SourceResult> {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length < 1 || segments.length > 2 || !segments.every((part) => /^[A-Za-z0-9_.-]+$/.test(part))) {
    return { url: url.href, status: "link_only", message: "Use a GitHub profile or repository URL to discover public repositories.", candidates: [] };
  }
  const endpoint = segments.length === 1
    ? `https://api.github.com/users/${encodeURIComponent(segments[0])}/repos?per_page=100&sort=updated`
    : `https://api.github.com/repos/${segments.map(encodeURIComponent).join("/")}`;
  const response = await fetch(endpoint, { headers: { Accept: "application/vnd.github+json", "User-Agent": userAgent }, signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error(response.status === 403 || response.status === 429 ? "GitHub rate limit reached." : `GitHub returned HTTP ${response.status}.`);
  const data = await response.json();
  const repos: any[] = Array.isArray(data) ? data : [data];
  const candidates = repos.filter((repo) => repo && repo.id && repo.html_url).map((repo) => ({
    externalId: String(repo.id), title: String(repo.name || "").slice(0, 200),
    description: typeof repo.description === "string" ? repo.description.slice(0, 1500) : null,
    canonicalUrl: repo.html_url, projectUrl: repo.homepage?.startsWith("https://") ? repo.homepage : repo.html_url,
    imageUrl: null, tags: repo.language ? [repo.language] : [], source: "github" as const,
  }));
  return { url: url.href, status: candidates.length ? "projects" : "needs_input",
    message: candidates.length ? `${candidates.length} public GitHub project${candidates.length === 1 ? "" : "s"} found.` : "No public repositories found.", candidates };
}

export async function discoverSource(value: string): Promise<SourceResult> {
  try {
    const url = sourceUrl(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "github.com") return await githubCandidates(url);
    if (blockedProvider(host)) return {
      url: url.href, status: "needs_input", candidates: [],
      message: "HMR cannot import projects from this platform's profile URL. Add project details yourself or upload your own case study.",
    };
    const robotsCache = new Map<string, string | null>();
    const load: PageLoader = (target, xml) => fetchPublic(target, 2, true, robotsCache, xml, url.origin);
    // Fetch the entry page first to populate robotsCache; it may advertise a nonstandard sitemap.
    const page = await load(url);
    const hint = advertisedSitemap(robotsCache.get(url.origin) ?? null, page.url);
    return await discoverPersonalSource(url, (target, xml) => target.href === url.href && !xml ? Promise.resolve(page) : load(target, xml), hint ?? undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source unavailable.";
    return { url: value, status: message.includes("does not permit") ? "link_only" : "error", candidates: [], message };
  }
}
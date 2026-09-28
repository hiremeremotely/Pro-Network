export type HubPortfolio = {
  id: number;
  title: string;
  description?: string | null;
  projectUrl?: string | null;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  mimeType?: string | null;
  source?: string | null;
  tags?: string[] | null;
  visibility?: string | null;
  featured?: boolean | null;
};

export type HubProfile = {
  portfolio?: HubPortfolio[] | null;
  website?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  twitterUrl?: string | null;
  customLinks?: { url: string; label?: string | null }[] | null;
};

export type HubItem = {
  type: "portfolio" | "link";
  id: string;
  title: string;
  url: string | null;
  provider: string;
  featured: boolean;
  description?: string | null;
  imageUrl?: string | null;
  tags: string[];
  isPdf?: boolean;
};

function safeHubUrl(url: string | null | undefined, base: string) {
  if (!url) return null;
  if (url.startsWith(`${base}api/storage/portfolio/`)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}

function providerFromUrl(url: string | null, fallback: string) {
  if (!url) return fallback;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "github.com" || host.endsWith(".github.com")) return "github";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
    if (host === "behance.net" || host.endsWith(".behance.net")) return "behance";
    if (host === "dribbble.com" || host.endsWith(".dribbble.com")) return "dribbble";
    if (host === "framer.com" || host.endsWith(".framer.com") || host.endsWith(".framer.website")) return "framer";
    if (host === "x.com" || host === "twitter.com") return "twitter";
  } catch {
    return fallback;
  }
  return fallback;
}

function destinationKey(url: string) {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.hostname.toLowerCase()}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url.toLowerCase().trim().replace(/\/$/, "");
  }
}

export function profileShareUrl(origin: string, base: string, id: number): string {
  return new URL(`${base}profiles/${id}`, origin).href;
}

export function buildHubItems(profile: HubProfile, isOwn: boolean, base: string): HubItem[] {
  const urls = new Set<string>();
  const items: HubItem[] = [];
  for (const p of [...(profile.portfolio ?? [])].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))) {
    if (p.visibility === "private" && !isOwn) continue;
    const url = safeHubUrl(p.projectUrl || p.canonicalUrl || (isOwn && p.mimeType ? `${base}api/storage/portfolio/${p.id}` : null), base);
    if (!isOwn && !url && !p.description && !p.tags?.length) continue;
    if (url) {
      const key = destinationKey(url);
      if (urls.has(key)) continue;
      urls.add(key);
    }
    items.push({
      type: "portfolio", id: `port-${p.id}`, title: p.title, description: p.description,
      imageUrl: p.imageUrl || (p.mimeType?.startsWith("image/") ? url : null),
      url, provider: p.source === "github" || p.source === "linkedin" ? p.source : providerFromUrl(url, p.source || "portfolio"), tags: p.tags || [],
      featured: Boolean(p.featured), isPdf: p.mimeType === "application/pdf",
    });
  }

  const addLink = (url: string | null | undefined, provider: string, title: string) => {
    const safeUrl = safeHubUrl(url, base);
    if (!safeUrl) return;
    const key = destinationKey(safeUrl);
    if (urls.has(key)) return;
    urls.add(key);
    items.push({
      type: "link", id: `link-${provider}-${key}`, title, url: safeUrl,
      provider: providerFromUrl(safeUrl, provider), featured: false, tags: [],
    });
  };
  addLink(profile.website, "website", "Website");
  addLink(profile.linkedinUrl, "linkedin", "LinkedIn");
  addLink(profile.githubUrl, "github", "GitHub");
  addLink(profile.twitterUrl, "twitter", "X");
  for (const link of profile.customLinks ?? []) addLink(link.url, "custom", link.label || "Link");
  return items.sort((a, b) => Number(b.featured) - Number(a.featured));
}
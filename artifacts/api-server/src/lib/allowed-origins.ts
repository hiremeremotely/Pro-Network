type OriginEnvironment = {
  NODE_ENV?: string;
  ALLOWED_ORIGINS?: string;
  REPLIT_DOMAINS?: string;
  REPLIT_DEV_DOMAIN?: string;
};

export function buildAllowedOrigins(env: OriginEnvironment = process.env): string[] {
  const origins: string[] = [];
  const isProd = env.NODE_ENV === "production";

  // Explicit origins support hosts outside Replit without spoofing its metadata.
  for (const configured of (env.ALLOWED_ORIGINS ?? "").split(",").map(s => s.trim()).filter(Boolean)) {
    let url: URL;
    try {
      url = new URL(configured);
    } catch {
      throw new Error("ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      (isProd && url.protocol !== "https:") ||
      url.username || url.password || url.search || url.hash ||
      url.pathname !== "/" || url.hostname.includes("*")
    ) {
      throw new Error("ALLOWED_ORIGINS must contain exact HTTPS origins in production, without paths or credentials");
    }
    origins.push(url.origin);
  }

  for (const domain of (env.REPLIT_DOMAINS ?? "").split(",").map(s => s.trim()).filter(Boolean)) {
    origins.push(`https://${domain}`);
  }

  if (!isProd) {
    if (env.REPLIT_DEV_DOMAIN) origins.push(`https://${env.REPLIT_DEV_DOMAIN}`);
    origins.push("http://localhost", "http://127.0.0.1");
    for (const port of [3000, 4000, 5000, 5173, 8080]) {
      origins.push(`http://localhost:${port}`, `http://127.0.0.1:${port}`);
    }
  }
  return [...new Set(origins)];
}
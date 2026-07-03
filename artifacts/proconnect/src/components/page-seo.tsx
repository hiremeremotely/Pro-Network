import { Helmet } from "react-helmet-async";

const SITE_NAME = "Hire Me Remotely";
const SITE_URL = "https://hiremeremotely.com";
const DEFAULT_DESCRIPTION =
  "Find your next remote job or hire remote talent. Hire Me Remotely connects professionals and companies worldwide.";
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

interface PageSEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export function PageSEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalPath,
  ogImage = DEFAULT_OG_IMAGE,
  noIndex = false,
  jsonLd,
}: PageSEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;

  const schemas = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      {canonical && <meta property="og:url" content={canonical} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}

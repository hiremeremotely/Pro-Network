export function validProviderUrl(source: string | undefined, value: string | null | undefined): boolean {
  if (!source || !value || source === "manual" || source === "upload") return true;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    if (source === "github") return host === "github.com";
    if (source === "behance") return host === "behance.net";
    if (source === "dribbble") return host === "dribbble.com";
    if (source === "linkedin") return host === "linkedin.com" && new URL(value).pathname.startsWith("/in/");
    return true;
  } catch { return false; }
}

export function importedItemIdentity(source: string | null | undefined, externalId: string | null | undefined) {
  return source && externalId ? { source, externalId } : null;
}

export function preservesImportedIdentity(
  current: { source: string; externalId: string | null },
  edit: { source?: string; externalId?: string | null },
) {
  if (!importedItemIdentity(current.source, current.externalId)) return true;
  return (edit.source === undefined || edit.source === current.source) &&
    (edit.externalId === undefined || edit.externalId === current.externalId);
}

export function existingImport<T extends { source: string; externalId: string | null }>(
  rows: T[], source: string | undefined, externalId: string | null | undefined,
): T | undefined {
  const identity = importedItemIdentity(source, externalId);
  return identity ? rows.find((row) => row.source === identity.source && row.externalId === identity.externalId) : undefined;
}

export function rowsForPortfolioViewer<T extends {
  visibility: string; objectPath?: string | null; projectUrl?: string | null;
  canonicalUrl?: string | null; imageUrl?: string | null; externalId?: string | null;
}>(rows: T[], owner: boolean, approvedSources = false) {
  return owner ? rows : rows.filter((row) => row.visibility === "public").map((row) => {
    const { objectPath: _objectPath, ...safe } = row;
    return approvedSources ? safe : {
      ...safe, projectUrl: null, canonicalUrl: null, imageUrl: null, externalId: null,
    };
  });
}
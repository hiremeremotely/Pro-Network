export function editedPortfolioSource(originalSource: string, selectedProvider: string): string {
  return originalSource === "github" || originalSource === "linkedin" ? originalSource : selectedProvider;
}

export function withPortfolioProjectUrl<T extends {
  source: string; projectUrl?: string | null; canonicalUrl?: string | null;
}>(draft: T, projectUrl: string, editing: boolean): T {
  const imported = editing && (draft.source === "github" || draft.source === "linkedin");
  return {
    ...draft,
    projectUrl,
    canonicalUrl: imported ? (draft.canonicalUrl || draft.projectUrl || null) : projectUrl,
  };
}

export function portfolioEditPayload(item: {
  title: string; description: string; projectUrl?: string | null; imageUrl?: string | null;
  tags: string[]; featured: boolean; visibility: "public" | "private"; source: string;
  externalId?: string | null; canonicalUrl?: string | null; objectPath?: string | null;
  mimeType?: string | null; fileSize?: number | null;
}) {
  return {
    title: item.title, description: item.description || null, projectUrl: item.projectUrl || null,
    imageUrl: item.imageUrl || null, tags: item.tags, featured: item.featured, visibility: item.visibility,
    source: item.source, externalId: item.externalId || null,
    canonicalUrl: item.canonicalUrl || item.projectUrl || null, objectPath: item.objectPath || null,
    mimeType: item.mimeType || null, fileSize: item.fileSize || null,
  };
}
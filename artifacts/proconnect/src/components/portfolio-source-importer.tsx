import { useState } from "react";
import { useDiscoverPortfolioSources } from "@workspace/api-client-react";
import type { PortfolioProject, PortfolioSourceCandidate, PortfolioSourceResult } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type SourceDraft = {
  title: string;
  description: string;
  tags: string[];
  visibility: "private" | "public";
  featured: boolean;
  source: string;
  projectUrl: string;
  canonicalUrl: string;
  externalId: string;
  imageUrl: string | null;
};
type Entry = { key: string; draft: SourceDraft; selected: boolean; alreadySaved: boolean };

function sameUrl(left: string | null | undefined, right: string | null | undefined): boolean {
  if (!left || !right) return false;
  try {
    const a = new URL(left), b = new URL(right);
    return a.hostname.toLowerCase() === b.hostname.toLowerCase() &&
      a.pathname.replace(/\/$/, "") === b.pathname.replace(/\/$/, "") && a.search === b.search;
  } catch { return left === right; }
}

function isSaved(candidate: PortfolioSourceCandidate, portfolio: PortfolioProject[]) {
  return portfolio.some((item) =>
    item.source === candidate.source && item.externalId && item.externalId === candidate.externalId ||
    sameUrl(item.canonicalUrl || item.projectUrl, candidate.canonicalUrl) ||
    sameUrl(item.projectUrl, candidate.projectUrl));
}

export function PortfolioSourceImporter({
  profileId, portfolio, sourceLinks, onSave, onManual, busy,
}: {
  profileId: number;
  portfolio: PortfolioProject[];
  sourceLinks: string[];
  onSave: (items: SourceDraft[], onItemSaved: (item: SourceDraft) => void) => Promise<boolean>;
  onManual: (url: string) => void;
  busy: boolean;
}) {
  const [urls, setUrls] = useState(() => [...new Set(sourceLinks.filter(Boolean))].join("\n"));
  const [results, setResults] = useState<PortfolioSourceResult[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const discover = useDiscoverPortfolioSources();
  const parsed = [...new Set(urls.split(/[\s,]+/).map((url) => url.trim()).filter(Boolean))];

  async function check() {
    setError(""); setSaved(false); setResults([]); setEntries([]);
    if (!parsed.length || parsed.length > 18) { setError("Enter between one and 18 URLs."); return; }
    setChecking(true);
    try {
      const found: PortfolioSourceResult[] = [];
      for (let start = 0; start < parsed.length; start += 6) {
        const chunk = parsed.slice(start, start + 6);
        try {
          const response = await discover.mutateAsync({ profileId, data: { urls: chunk } });
          found.push(...response.results);
        } catch {
          found.push(...chunk.map((url) => ({
            url, status: "error" as const, candidates: [], message: "The source check failed. Try this link again later.",
          })));
        }
      }
      setResults(found);
      const unique = new Set<string>();
      const next: Entry[] = [];
      for (const result of found) for (const candidate of result.candidates) {
        const key = `${candidate.source}:${candidate.externalId}`;
        if (unique.has(key)) continue;
        unique.add(key);
        const alreadySaved = isSaved(candidate, portfolio);
        next.push({
          key, alreadySaved, selected: !alreadySaved && result.status === "projects",
          draft: {
            title: candidate.title, description: candidate.description || "",
            projectUrl: candidate.projectUrl, canonicalUrl: candidate.canonicalUrl,
            imageUrl: candidate.imageUrl ?? null, source: candidate.source,
            externalId: candidate.externalId, visibility: "private", featured: false, tags: candidate.tags,
          },
        });
      }
      setEntries(next);
    } catch {
      setError("Could not check these sources. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  function update(key: string, patch: Partial<SourceDraft>) {
    setEntries((current) => current.map((entry) => entry.key === key
      ? { ...entry, draft: { ...entry.draft, ...patch } } : entry));
  }

  const selected = entries.filter((entry) => entry.selected && !entry.alreadySaved);
  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gray-600">Paste your own public work links, one per line. We check accessible project pages and GitHub repositories; LinkedIn, Behance, and Dribbble need details from you. Nothing is saved yet.</p>
        <Textarea
          aria-label="Portfolio source URLs"
          value={urls} rows={4} placeholder={"https://github.com/yourname\nhttps://your-portfolio.com/projects"}
          onChange={(event) => setUrls(event.target.value)}
          className="mt-3"
        />
        <div className="flex items-center justify-between mt-2 gap-3">
          <span className="text-xs text-gray-500">Up to 18 links per check. Only public, permitted page metadata is used.</span>
          <Button onClick={check} disabled={checking || busy}>{checking ? "Checking sources…" : "Find work"}</Button>
        </div>
        {error && <p role="alert" className="text-sm text-destructive mt-2">{error}</p>}
      </div>

      {results.length > 0 && (
        <div className="space-y-3" aria-live="polite">
          <h4 className="font-semibold text-sm">What we found</h4>
          {results.map((result, index) => (
            <div key={`${result.url}-${index}`} className="rounded-xl border p-3">
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline">{result.status === "projects" ? "Project drafts"
                  : result.status === "site_preview" ? "Site preview only"
                  : result.status === "error" ? "Could not read" : "Needs your input"}</Badge>
                <span className="text-xs text-gray-500 break-all">{result.url}</span>
              </div>
              <p className="text-sm text-gray-700 mt-2">{result.message}</p>
              {result.status !== "projects" && (
                <Button variant="link" size="sm" className="px-0 h-7" onClick={() => onManual(result.url)}>
                  Add your own project details
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div>
            <h4 className="font-semibold text-sm">Review suggested cards</h4>
            <p className="text-xs text-gray-500 mt-1">These are page titles and descriptions, not verified claims about your work. Edit them before confirming. New cards are private unless you choose Public summary; source links stay private until an approved introduction.</p>
          </div>
          {entries.map((entry) => (
            <div key={entry.key} className="rounded-xl border bg-gray-50 p-3 space-y-2">
              <label className="flex gap-2 items-start text-sm font-medium">
                <input type="checkbox" className="mt-1" disabled={entry.alreadySaved}
                  checked={entry.selected} onChange={(event) => setEntries((current) => current.map((row) =>
                    row.key === entry.key ? { ...row, selected: event.target.checked } : row))} />
                <span>{entry.draft.title || "Untitled site"} {entry.alreadySaved && <Badge variant="secondary">Already in portfolio</Badge>}</span>
              </label>
              <p className="text-xs text-gray-500 break-all">Found at: {entry.draft.canonicalUrl}</p>
              {entry.selected && !entry.alreadySaved && (
                <div className="space-y-2 pl-5">
                  <Input aria-label="Project title" value={entry.draft.title} placeholder="Project title"
                    onChange={(event) => update(entry.key, { title: event.target.value })} />
                  <Textarea aria-label="Project description" value={entry.draft.description} placeholder="What did you build?"
                    onChange={(event) => update(entry.key, { description: event.target.value })} />
                  <Input aria-label="Project tags" value={entry.draft.tags.join(", ")} placeholder="Tags, comma-separated"
                    onChange={(event) => update(entry.key, { tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
                  <div className="flex gap-4 text-xs items-center">
                    <label><input type="checkbox" checked={entry.draft.featured}
                      onChange={(event) => update(entry.key, { featured: event.target.checked })} /> Featured</label>
                    <label>Visibility <select value={entry.draft.visibility}
                      onChange={(event) => update(entry.key, { visibility: event.target.value as "private" | "public" })}>
                      <option value="private">Private</option><option value="public">Public summary</option>
                    </select></label>
                  </div>
                </div>
              )}
            </div>
          ))}
          <Button className="w-full" disabled={!selected.length || busy || selected.some((entry) => !entry.draft.title.trim())}
            onClick={async () => {
              const allSaved = await onSave(selected.map((entry) => entry.draft), (item) => {
                setEntries((current) => current.map((entry) => entry.key === `${item.source}:${item.externalId}`
                  ? { ...entry, selected: false, alreadySaved: true } : entry));
              });
              if (allSaved) setSaved(true);
            }}>
            {busy ? "Saving…" : `Confirm and save ${selected.length} card${selected.length === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}
      {saved && <p className="text-sm text-green-700">Saved to your portfolio.</p>}
    </div>
  );
}
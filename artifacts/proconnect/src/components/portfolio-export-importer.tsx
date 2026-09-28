import { useRef, useState } from "react";
import type { PortfolioProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { exportProjectUrl, parsePortfolioExport, validateExportFile } from "@/lib/portfolio-export";
import type { ExportPlatform } from "@/lib/portfolio-export";
import type { SourceDraft } from "@/components/portfolio-source-importer";

type Entry = { row: number; draft: SourceDraft; selected: boolean; saved: boolean; original: string };

export function PortfolioExportImporter({
  portfolio, onSave, busy,
}: {
  portfolio: PortfolioProject[];
  onSave: (items: SourceDraft[], onItemSaved: (item: SourceDraft) => void) => Promise<boolean>;
  busy: boolean;
}) {
  const [platform, setPlatform] = useState<ExportPlatform>("linkedin");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filename, setFilename] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const loadVersion = useRef(0);

  function changePlatform(value: ExportPlatform) {
    loadVersion.current++;
    setPlatform(value); setEntries([]); setFilename(""); setWarnings([]); setError(""); setReviewed(false); setLoading(false);
  }

  async function readFile(file?: File) {
    const version = ++loadVersion.current;
    setEntries([]); setWarnings([]); setError(""); setReviewed(false); setFilename("");
    if (!file) return;
    try {
      validateExportFile(file);
      setLoading(true);
      const { projects, warnings: notices } = parsePortfolioExport(await file.text(), platform);
      if (version !== loadVersion.current) return;
      setFilename(file.name);
      setWarnings(notices);
      setEntries(projects.map(project => {
        const saved = portfolio.some(item => item.source === platform && (
          project.projectUrl && (item.projectUrl === project.projectUrl || item.canonicalUrl === project.projectUrl) ||
          item.title.trim().toLowerCase() === project.title.trim().toLowerCase()
        ));
        return {
          row: project.row, original: project.title, saved: Boolean(saved), selected: false,
          draft: {
            title: project.title, description: project.description, projectUrl: project.projectUrl,
            canonicalUrl: project.projectUrl, imageUrl: null, tags: project.tags,
            featured: false, visibility: "private", source: platform, externalId: "",
          },
        };
      }));
    } catch (cause) {
      if (version === loadVersion.current) setError(cause instanceof Error ? cause.message : "Could not read this CSV.");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }

  function update(row: number, patch: Partial<SourceDraft>) {
    setEntries(current => current.map(entry => entry.row === row ? { ...entry, draft: { ...entry.draft, ...patch } } : entry));
  }

  const selected = entries.filter(entry => entry.selected && !entry.saved);
  const invalid = selected.some(({ draft }) =>
    !draft.title.trim() || draft.title.length > 200 || draft.description.length > 5000 ||
    draft.tags.length > 30 || draft.tags.some(tag => !tag || tag.length > 50) ||
    !exportProjectUrl(draft.projectUrl.trim(), platform)
  );
  const template = "title,description,project_url,tags\n\"Sample project\",\"Describe your contribution\",\"https://behance.net/gallery/example\",\"Design;Research\"\n";

  return <div className="space-y-4">
    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-gray-700">
      <p className="font-semibold">Import from a file you provide</p>
      <p className="mt-1">No account connection or profile scraping. The CSV is read in your browser; only cards you review and confirm are saved. They start private. Public summaries and source-link release still follow HMR's visibility and introduction rules.</p>
    </div>
    <label className="block text-sm font-medium">Where did your project data come from?
      <select className="block mt-1 w-full rounded-md border bg-white p-2 text-sm" value={platform}
        onChange={event => changePlatform(event.target.value as ExportPlatform)} disabled={busy}>
        <option value="linkedin">LinkedIn</option>
        <option value="behance">Behance</option>
        <option value="dribbble">Dribbble</option>
      </select>
    </label>
    {platform === "linkedin"
      ? <p className="text-sm text-gray-600">Supported: the <strong>Projects.csv</strong> file extracted from your own LinkedIn data download (Name and optional Description and Url columns). Choose that CSV, not the ZIP or Profile.csv. Other project fields are not imported.</p>
      : <div className="text-sm text-gray-600">There is no universal native {platform === "behance" ? "Behance" : "Dribbble"} export format supported here. Prepare a CSV with <strong>title</strong> and optional <strong>description, project_url, tags</strong> columns. Separate tags with semicolons.
          <a className="block w-fit text-primary underline mt-1" download="hmr-projects-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}>Download CSV template</a>
        </div>}
    <label className="block text-sm font-medium">Choose your CSV (up to 2 MB, 100 projects)
      <input type="file" accept=".csv,text/csv" disabled={busy || loading} className="mt-2 block w-full text-sm"
        onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void readFile(file); }} />
    </label>
    {loading && <p role="status" className="text-sm text-gray-500">Reading CSV…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {warnings.length > 0 && <div role="status" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">{warnings.length} import notice{warnings.length === 1 ? "" : "s"}</p>
      <ul className="list-disc pl-4 mt-1 max-h-28 overflow-y-auto">{warnings.map((notice, index) => <li key={index}>{notice}</li>)}</ul>
    </div>}
    {entries.length > 0 && <div className="space-y-3 border-t pt-4">
      <div><h4 className="font-semibold">Review extracted claims from {filename}</h4>
        <p className="text-xs text-gray-500 mt-1">This is user-supplied data, not independent proof of your work. Confirm your role, dates, descriptions, tags, and links before saving. URLs outside the selected platform are not attached automatically.</p>
      </div>
      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {entries.map(entry => <div key={entry.row} className="rounded-xl border bg-gray-50 p-3 space-y-2">
          <label className="flex gap-2 items-start text-sm font-medium">
            <input type="checkbox" className="mt-1" checked={entry.selected} disabled={entry.saved || busy}
              onChange={event => setEntries(current => current.map(row => row.row === entry.row ? { ...row, selected: event.target.checked } : row))} />
            <span className="min-w-0">{entry.original} <span className="text-xs text-gray-500 font-normal">· CSV record {entry.row}</span> {entry.saved && <Badge variant="secondary">Already in portfolio</Badge>}</span>
          </label>
          {entry.selected && !entry.saved && <div className="space-y-2 pl-5">
            <Input aria-label={`Project title, record ${entry.row}`} maxLength={200} value={entry.draft.title}
              disabled={busy}
              onChange={event => update(entry.row, { title: event.target.value })} placeholder="Project title" />
            <Textarea aria-label={`Project description, record ${entry.row}`} maxLength={5000} value={entry.draft.description}
              disabled={busy}
              onChange={event => update(entry.row, { description: event.target.value })} placeholder="What did you actually contribute?" />
            <Input aria-label={`Project URL, record ${entry.row}`} value={entry.draft.projectUrl} maxLength={2048} disabled={busy}
              onChange={event => update(entry.row, { projectUrl: event.target.value, canonicalUrl: event.target.value })}
              placeholder={platform === "linkedin" ? "Optional LinkedIn profile URL" : `Optional ${platform} project URL`} />
            {entry.draft.projectUrl && !exportProjectUrl(entry.draft.projectUrl.trim(), platform) &&
              <p className="text-xs text-destructive">Use a valid {platform} URL here. Add links to other websites as separate projects.</p>}
            <Input aria-label={`Project tags, record ${entry.row}`} value={entry.draft.tags.join("; ")} disabled={busy}
              onChange={event => update(entry.row, { tags: event.target.value.split(";").map(tag => tag.trim()).filter(Boolean) })}
              placeholder="Tags separated by semicolons" />
            <div className="flex flex-wrap gap-4 items-center text-xs">
              <label><input type="checkbox" checked={entry.draft.featured} disabled={busy} onChange={event => update(entry.row, { featured: event.target.checked })} /> Featured</label>
              <label>Visibility <select value={entry.draft.visibility} disabled={busy}
                onChange={event => update(entry.row, { visibility: event.target.value as "private" | "public" })}>
                <option value="private">Private</option><option value="public">Public summary</option>
              </select></label>
            </div>
          </div>}
        </div>)}
      </div>
      <label className="flex gap-2 items-start text-xs text-gray-600">
        <input type="checkbox" checked={reviewed} disabled={busy} onChange={event => setReviewed(event.target.checked)} className="mt-0.5" />
        <span>I reviewed these claims and understand that choosing Public summary can display the title, description, and tags. Source links remain protected by HMR's release rules.</span>
      </label>
      {invalid && <p role="alert" className="text-xs text-destructive">Check selected titles, descriptions, URLs, and tags (up to 30 tags of 50 characters each) before saving.</p>}
      <Button className="w-full" disabled={!selected.length || invalid || !reviewed || busy} onClick={async () => {
        const toSave = selected.map(entry => ({
          ...entry.draft, projectUrl: entry.draft.projectUrl.trim(), canonicalUrl: entry.draft.projectUrl.trim(),
        }));
        const savedRows = new Map(toSave.map((draft, index) => [draft, selected[index].row]));
        await onSave(toSave, item => {
          setEntries(current => current.map(entry => entry.row === savedRows.get(item) ? { ...entry, selected: false, saved: true } : entry));
        });
      }}>{busy ? "Saving…" : `Confirm and save ${selected.length} private or reviewed card${selected.length === 1 ? "" : "s"}`}</Button>
    </div>}
  </div>;
}
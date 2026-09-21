import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreatePortfolioProject, useDeletePortfolioProject, useUpdatePortfolioProject,
  useDiscoverGithubPortfolio, useReorderPortfolio, getListPortfolioQueryKey,
} from "@workspace/api-client-react";
import type { GithubPortfolioCandidate, PortfolioProject } from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { GithubIcon, LinkedinIcon, LinkIcon, UploadIcon, TrashIcon, StarIcon, ArrowUpIcon, ArrowDownIcon, PencilIcon, FileTextIcon } from "lucide-react";

type Mode = "choose" | "github" | "linkedin" | "external" | "upload";
type Draft = Partial<PortfolioProject> & { title: string; description: string; tags: string[]; visibility: "public" | "private"; featured: boolean; source: string };
const blank: Draft = { title: "", description: "", projectUrl: "", imageUrl: "", tags: [], visibility: "public", featured: false, source: "manual" };
const allowedMime = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const sourceName = (source?: string) => source === "github" ? "GitHub" : source === "linkedin" ? "LinkedIn" : source === "upload" ? "Upload" : source === "manual" ? "Manual" : source ? source[0].toUpperCase() + source.slice(1) : "Portfolio";

function providerFor(url: string): "behance" | "dribbble" | "linkedin" | "personal" | null {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === "behance.net" || host.endsWith(".behance.net")) return "behance";
    if (host === "dribbble.com" || host.endsWith(".dribbble.com")) return "dribbble";
    if (host === "linkedin.com" && new URL(url).pathname.startsWith("/in/")) return "linkedin";
    if (host && !["localhost", "127.0.0.1"].includes(host)) return "personal";
  } catch { /* invalid URL is reported by the form */ }
  return null;
}

function toPayload(item: Draft) {
  return {
    title: item.title, description: item.description || null, projectUrl: item.projectUrl || null,
    imageUrl: item.imageUrl || null, tags: item.tags, featured: item.featured, visibility: item.visibility,
    source: item.source as any, externalId: item.externalId || null,
    canonicalUrl: item.canonicalUrl || item.projectUrl || null, objectPath: item.objectPath || null,
    mimeType: (item.mimeType || null) as any, fileSize: item.fileSize || null,
  };
}

export function PortfolioManager({ profileId, portfolio, githubUrl }: { profileId: number; portfolio: PortfolioProject[]; githubUrl?: string | null }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const create = useCreatePortfolioProject();
  const update = useUpdatePortfolioProject();
  const remove = useDeletePortfolioProject();
  const reorder = useReorderPortfolio();
  const initialGithub = useMemo(() => { try { return githubUrl ? new URL(githubUrl).pathname.split("/").filter(Boolean)[0] || "" : ""; } catch { return ""; } }, [githubUrl]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("choose");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [githubUser, setGithubUser] = useState(initialGithub);
  const [candidates, setCandidates] = useState<GithubPortfolioCandidate[]>([]);
  const [selected, setSelected] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const discover = useDiscoverGithubPortfolio(profileId, { username: githubUser }, { query: { enabled: false, queryKey: ["portfolio-github-discovery", profileId] } });
  const { uploadFile } = useUpload({
    purpose: "portfolio",
    onSuccess: result => { setDraft(d => ({ ...d, objectPath: result.objectPath })); setUploading(false); },
    onError: () => { setUploading(false); setUploadError("Upload failed. Please try again."); },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: getListPortfolioQueryKey(profileId) });
  const openFlow = (next: Mode) => { setEditingId(null); setMode(next); setDraft({ ...blank, source: next === "external" ? "personal" : next }); setSelected([]); setCandidates([]); setUploadError(""); setOpen(true); };
  const edit = (item: PortfolioProject) => { setEditingId(item.id); setDraft({ ...item, title: item.title, description: item.description ?? "", tags: item.tags, visibility: item.visibility, featured: item.featured, source: item.source }); setMode(item.source === "upload" ? "upload" : "external"); setUploadError(""); setOpen(true); };
  async function save(items: Draft[]) {
    setBusy(true);
    try {
      for (const item of items) {
        if (editingId !== null) await update.mutateAsync({ profileId, id: editingId, data: toPayload(item) });
        else await create.mutateAsync({ profileId, data: toPayload(item) });
      }
      invalidate(); setOpen(false); setEditingId(null);
      toast({ title: items.length > 1 ? `${items.length} projects imported` : "Portfolio item saved" });
    } catch { toast({ title: "Could not save portfolio item", variant: "destructive" }); } finally { setBusy(false); }
  }
  async function findGithub() {
    if (!githubUser.trim()) return;
    setBusy(true);
    try { const found = await discover.refetch(); const repos = found.data ?? []; setCandidates(repos); setSelected(repos.map(c => ({ ...blank, ...c, title: c.title, description: c.description ?? "", tags: c.tags ?? [], source: "github", visibility: "public", featured: false }))); if (!repos.length) toast({ title: "No public repositories found" }); }
    catch { toast({ title: "GitHub discovery failed", description: "Check the username or try again later.", variant: "destructive" }); } finally { setBusy(false); }
  }
  function move(index: number, direction: -1 | 1) { const next = [...portfolio]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; reorder.mutate({ profileId, data: { ids: next.map(p => p.id) } }, { onSuccess: invalidate }); }
  const chooseGithub = (id: string, checked: boolean) => {
    const candidate = candidates.find(c => String(c.externalId) === id);
    if (!candidate) return;
    setSelected(items => checked
      ? [...items, { ...blank, ...candidate, description: candidate.description ?? "", tags: candidate.tags ?? [], source: "github", visibility: "public", featured: false }]
      : items.filter(x => String(x.externalId) !== id));
  };
  const updateSelected = (index: number, patch: Partial<Draft>) => setSelected(items => items.map((item, i) => i === index ? { ...item, ...patch } : item));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-gray-900">Portfolio</h2><p className="text-sm text-gray-500">Show the work you want people to remember.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => openFlow("choose")} className="gap-2"><UploadIcon className="w-4 h-4" /> Import portfolio</Button><Button onClick={() => openFlow("external")} className="gap-2"><LinkIcon className="w-4 h-4" /> Add manually</Button></div></div>
    {!portfolio.length && <div className="rounded-2xl border border-dashed p-10 text-center text-gray-500"><FileTextIcon className="w-9 h-9 mx-auto mb-2 text-gray-300" /><p className="font-medium text-gray-700">Your portfolio is ready for its first project</p></div>}
    <div className="space-y-3">{portfolio.map((p, i) => <div key={p.id} className="flex flex-wrap gap-4 items-start rounded-2xl border bg-white p-4 shadow-sm" data-testid={`portfolio-row-${p.id}`}>
      <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">{p.imageUrl ? <img src={p.imageUrl} alt={`${p.title} preview`} className="w-full h-full rounded-xl object-cover" /> : p.mimeType?.startsWith("image/") ? <img src={`${import.meta.env.BASE_URL}api/storage/portfolio/${p.id}`} alt={`${p.title} preview`} className="w-full h-full rounded-xl object-cover" /> : <FileTextIcon className="w-6 h-6 text-indigo-400" />}</div>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-gray-900 truncate">{p.title}</p><Badge variant="outline" className="text-[10px]">{sourceName(p.source)}</Badge>{p.featured && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-0"><StarIcon className="w-3 h-3 mr-1" /> Featured</Badge>}<Badge variant="secondary" className="text-[10px]">{p.visibility}</Badge></div>{p.description && <p className="text-sm text-gray-500 line-clamp-1 mt-1">{p.description}</p>}<div className="flex flex-wrap gap-1 mt-2">{p.tags.map(tag => <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>)}</div>{(p.projectUrl || p.canonicalUrl || p.mimeType) && <a href={p.projectUrl || p.canonicalUrl || `${import.meta.env.BASE_URL}api/storage/portfolio/${p.id}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-2 inline-block">{p.mimeType && !p.projectUrl && !p.canonicalUrl ? "View file" : "View project"} ↗</a>}</div>
      <div className="flex items-center gap-1 ml-auto"><Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0 || reorder.isPending} aria-label="Move up"><ArrowUpIcon className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => move(i, 1)} disabled={i === portfolio.length - 1 || reorder.isPending} aria-label="Move down"><ArrowDownIcon className="w-4 h-4" /></Button><Button variant="ghost" size="icon" onClick={() => edit(p)} aria-label="Edit"><PencilIcon className="w-4 h-4" /></Button><Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove.mutate({ profileId, id: p.id }, { onSuccess: invalidate })} aria-label="Delete"><TrashIcon className="w-4 h-4" /></Button></div>
    </div>)}</div>
    {open && <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6">
      <div className="flex justify-between items-start mb-5"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Portfolio studio</p><h3 className="text-xl font-bold mt-1">{mode === "choose" ? "Bring your best work together" : mode === "github" ? "Import from GitHub" : mode === "linkedin" ? "Add LinkedIn profile link" : mode === "upload" ? "Upload a case study" : "Add portfolio link"}</h3></div><button onClick={() => setOpen(false)} className="text-gray-400 text-xl" aria-label="Close">×</button></div>
      {mode === "choose" && <div className="grid sm:grid-cols-2 gap-3">{[["github", GithubIcon, "GitHub repositories", "Choose public repositories"], ["linkedin", LinkedinIcon, "LinkedIn identity", "Verified profile link only"], ["external", LinkIcon, "External link", "Behance, Dribbble, or personal site"], ["upload", UploadIcon, "Upload", "PDF, PNG, JPEG, or WebP"]].map(([m, Icon, title, sub]) => { const I = Icon as any; return <button key={m as string} onClick={() => openFlow(m as Mode)} className="text-left rounded-xl border p-4 hover:border-primary hover:bg-primary/5"><I className="w-5 h-5 text-primary mb-3" /><p className="font-semibold">{title as string}</p><p className="text-xs text-gray-500 mt-1">{sub as string}</p></button>; })}</div>}
      {mode === "github" && <div className="space-y-4"><Label>GitHub username</Label><div className="flex flex-wrap gap-2"><Input className="flex-1 min-w-[180px]" value={githubUser} onChange={e => setGithubUser(e.target.value)} placeholder="username" /><Button onClick={findGithub} disabled={busy || !githubUser.trim()}>{busy ? "Finding…" : "Find repositories"}</Button></div>{candidates.length > 0 && <div className="space-y-2 max-h-56 overflow-y-auto">{candidates.map(c => <label key={c.externalId} className="flex gap-3 border rounded-xl p-3 cursor-pointer"><input type="checkbox" checked={selected.some(x => String(x.externalId) === String(c.externalId))} onChange={e => chooseGithub(String(c.externalId), e.target.checked)} /><div><p className="font-semibold text-sm">{c.title}</p><p className="text-xs text-gray-500">{c.description || "No description"} · {(c.tags || []).join(", ")}</p></div></label>)}</div>}{selected.length > 0 && <Review items={selected} onChange={updateSelected} onRemove={i => setSelected(s => s.filter((_, n) => n !== i))} onSave={() => save(selected)} busy={busy} />}</div>}
      {mode === "linkedin" && <div className="space-y-4"><p className="text-sm text-gray-600 bg-blue-50 rounded-xl p-3">LinkedIn import adds a verified profile link and basic identity only. It never imports work history or projects.</p><Input placeholder="https://linkedin.com/in/your-name" value={draft.projectUrl || ""} onChange={e => setDraft(d => ({ ...d, projectUrl: e.target.value, canonicalUrl: e.target.value, title: d.title || "LinkedIn profile" }))} /><Review items={[{ ...draft, source: "linkedin" }]} onChange={(_, patch) => setDraft(d => ({ ...d, ...patch }))} onSave={() => save([{ ...draft, source: "linkedin", title: draft.title || "LinkedIn profile" }])} busy={busy} /></div>}
      {(mode === "external" || mode === "upload") && <div className="space-y-4"><div><Label>Title *</Label><Input value={draft.title} onChange={e => setDraft(d => ({ ...d, title: e.target.value }))} /></div><div><Label>Description</Label><Textarea value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} /></div>{mode === "external" ? <><Input placeholder="https://behance.net/... or your personal site" value={draft.projectUrl || ""} onChange={e => setDraft(d => ({ ...d, projectUrl: e.target.value, canonicalUrl: e.target.value }))} /><p className="text-xs text-gray-500">We save the link you provide; we do not fetch or scrape it.</p></> : <><input type="file" accept={allowedMime.join(",")} className="block w-full text-sm" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; if (!allowedMime.includes(f.type)) { setUploadError("Choose a PDF, PNG, JPEG, or WebP file."); return; } if (f.size > 15728640) { setUploadError("Files must be 15MB or smaller."); return; } setUploadError(""); setUploading(true); setDraft(d => ({ ...d, title: d.title || f.name, mimeType: f.type as Draft["mimeType"], fileSize: f.size, objectPath: null })); await uploadFile(f); }} /><p className="text-xs text-gray-500">PDF, PNG, JPEG, or WebP · max 15MB</p>{uploading && <p className="text-sm text-primary">Uploading securely…</p>}{uploadError && <p className="text-sm text-destructive">{uploadError}</p>}</>}<Input placeholder="Tags, comma-separated" value={draft.tags.join(", ")} onChange={e => setDraft(d => ({ ...d, tags: e.target.value.split(",").map(x => x.trim()).filter(Boolean) }))} /><Review items={[draft]} onChange={(_, patch) => setDraft(d => ({ ...d, ...patch }))} onSave={() => { const provider = mode === "external" ? providerFor(draft.projectUrl || "") : "upload"; if (mode === "external" && editingId === null && !provider) { setUploadError("Enter a valid Behance, Dribbble, LinkedIn, or personal URL."); return; } save([{ ...draft, source: editingId !== null ? draft.source : (provider || "personal") }]); }} busy={busy || uploading} requireObjectPath={mode === "upload" && editingId === null} /></div>}
    </div></div>}
  </div>;
}

function Review({ items, onChange, onRemove, onSave, busy, requireObjectPath }: { items: Draft[]; onChange: (index: number, patch: Partial<Draft>) => void; onRemove?: (index: number) => void; onSave: () => void; busy: boolean; requireObjectPath?: boolean }) {
  return <div className="border-t pt-4 space-y-3"><p className="text-sm font-semibold">Review before publishing</p>{items.map((item, i) => <div key={i} className="rounded-xl bg-gray-50 p-3 space-y-2"><Input value={item.title} onChange={e => onChange(i, { title: e.target.value })} placeholder="Title" /><Textarea value={item.description} onChange={e => onChange(i, { description: e.target.value })} placeholder="Description" /><Input value={item.tags.join(", ")} onChange={e => onChange(i, { tags: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} placeholder="Tags, comma-separated" /><div className="flex flex-wrap items-center gap-4 text-xs"><label><input type="checkbox" checked={item.featured} onChange={e => onChange(i, { featured: e.target.checked })} /> Featured</label><label>Visibility <select value={item.visibility} onChange={e => onChange(i, { visibility: e.target.value as "public" | "private" })}><option value="public">Public</option><option value="private">Private</option></select></label>{onRemove && <button type="button" className="text-destructive ml-auto" onClick={() => onRemove(i)}>Remove</button>}</div></div>)}<Button onClick={onSave} disabled={busy || !items.length || !items.every(x => x.title.trim() && (!requireObjectPath || !!x.objectPath))} className="w-full">{busy ? "Saving…" : "Confirm and save"}</Button></div>;
}
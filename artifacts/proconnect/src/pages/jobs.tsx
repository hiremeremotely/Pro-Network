import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { JobCard } from "@/components/job-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SearchIcon, BriefcaseIcon, XIcon, MapPinIcon,
  DollarSignIcon, BookmarkIcon, BuildingIcon, TagIcon, SparklesIcon,
  SendHorizontalIcon, Share2Icon,
} from "lucide-react";
import type { Job } from "@workspace/api-client-react";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useAppAuth } from "@/contexts/app-auth";
import { useStartChat } from "@/hooks/use-start-chat";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;

const CATEGORIES = ["Engineering", "Design", "Product", "Data", "Marketing", "Sales"];
const LEVELS     = ["Entry", "Mid-level", "Senior", "Staff", "Manager"];

const LEVEL_COLORS: Record<string, string> = {
  Senior: "bg-purple-50 text-purple-700",
  Staff:  "bg-indigo-50 text-indigo-700",
  "Mid-level": "bg-blue-50 text-blue-700",
  Entry:  "bg-green-50 text-green-700",
  Manager: "bg-orange-50 text-orange-700",
};

// ── Typeahead search box ───────────────────────────────────────────────────────

interface Suggestions { titles: string[]; companies: string[]; tags: string[]; }

function JobSearchBox({ value, onChange, onCommit }: {
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [debouncedQ, setDebouncedQ]   = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef   = useRef<HTMLDivElement>(null);

  // Debounce the query for fetching suggestions
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(value), 200);
    return () => clearTimeout(t);
  }, [value]);

  const { data } = useQuery<Suggestions>({
    queryKey: ["job-suggestions", debouncedQ],
    queryFn: () => fetch(`${BASE}api/jobs/suggestions?q=${encodeURIComponent(debouncedQ)}`).then(r => r.json()),
    enabled: debouncedQ.length >= 1,
    staleTime: 30_000,
  });

  const groups: { label: string; icon: React.ElementType; items: string[]; }[] = [];
  if (data?.titles?.length)    groups.push({ label: "Roles",     icon: BriefcaseIcon, items: data.titles });
  if (data?.companies?.length) groups.push({ label: "Companies", icon: BuildingIcon,  items: data.companies });
  if (data?.tags?.length)      groups.push({ label: "Skills",    icon: TagIcon,       items: data.tags });

  const flat = groups.flatMap(g => g.items);
  const showDropdown = open && debouncedQ.length >= 1 && groups.length > 0;

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHighlighted(-1);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function select(item: string) {
    onChange(item);
    onCommit(item);
    setOpen(false);
    setHighlighted(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) {
      if (e.key === "Enter") { e.preventDefault(); onCommit(value); }
      return;
    }
    if (e.key === "ArrowDown")  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    if (e.key === "Escape")     { setOpen(false); setHighlighted(-1); }
    if (e.key === "Enter")      { e.preventDefault(); highlighted >= 0 ? select(flat[highlighted]) : onCommit(value); }
  }

  let itemIdx = 0;

  return (
    <div ref={boxRef} className="relative flex-1">
      {/* Input */}
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Search jobs, companies, or skills…"
        autoComplete="off"
        spellCheck={false}
        className="w-full h-11 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-sm"
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); onCommit(""); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {groups.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                <group.icon className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{group.label}</span>
              </div>
              {group.items.map(item => {
                const idx = itemIdx++;
                const isActive = highlighted === idx;
                return (
                  <button
                    key={item}
                    type="button"
                    onMouseDown={() => select(item)}
                    onMouseEnter={() => setHighlighted(idx)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                      isActive ? "bg-primary/8 text-primary" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="flex-1 truncate">{highlightMatch(item, debouncedQ)}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <div className="border-t border-gray-100 px-3 py-2 flex items-center gap-1.5 text-[11px] text-gray-400">
            <SparklesIcon className="w-3 h-3" />
            Press Enter to search all results
          </div>
        </div>
      )}
    </div>
  );
}

// Highlight the matched portion of a suggestion
function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-semibold text-primary">{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Job send-to-connection modal ───────────────────────────────────────────────

function JobSendModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<number | null>(null);
  const startChat = useStartChat();
  const { user } = useAppAuth();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ["send-connections", user?.id],
    queryFn: () =>
      fetch(`${BASE}api/connections/network`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
  });
  const allConnections: any[] = data?.profiles ?? [];

  const profiles = search.trim()
    ? allConnections.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.headline ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : allConnections;

  async function handleSend(profileId: number, recipientName: string) {
    setSending(profileId);
    const convId = await startChat(profileId);
    if (convId && user?.id) {
      const payload = JSON.stringify({
        __type: "shared_job",
        jobId: job.id,
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogoUrl ?? null,
        location: job.location ?? null,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        currency: job.currency ?? "USD",
        experienceLevel: job.experienceLevel,
      });
      await fetch(`${BASE}api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: payload }),
      });
    }
    onClose();
    toast({
      title: "Job shared",
      description: `Sent to ${recipientName}.`,
      duration: 3000,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Send job to a connection</h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{job.title} · {job.company}</p>
          </div>
          <button onClick={onClose} className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search connections…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
            />
          </div>
        </div>

        {/* Connection list */}
        <div className="overflow-y-auto max-h-64 px-2 pb-3 mt-1">
          {profiles.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-8">
              {allConnections.length === 0 ? "No connections yet" : "No matches found"}
            </p>
          )}
          {profiles.map((p: any) => {
            const initials = p.name?.slice(0, 2).toUpperCase() ?? "??";
            return (
              <button
                key={p.id}
                onClick={() => handleSend(p.id, p.name)}
                disabled={sending === p.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
              >
                <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                  <AvatarImage src={p.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  {p.headline && <p className="text-xs text-gray-400 truncate">{p.headline}</p>}
                </div>
                {sending === p.id ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : (
                  <SendHorizontalIcon className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Job row & table row ────────────────────────────────────────────────────────

function JobRow({ job, bookmarked, onBookmark, onSend }: {
  job: Job & { applicationCount?: number };
  bookmarked?: boolean;
  onBookmark?: (e: React.MouseEvent) => void;
  onSend?: (e: React.MouseEvent) => void;
}) {
  const { toast } = useToast();
  const salary = job.salaryMin && job.salaryMax
    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
    : null;

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}${BASE}jobs/${job.id}`;
    const data = { title: `${job.title} at ${job.company}`, text: `Check out this remote job: ${job.title} at ${job.company}`, url };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast({ title: "Link copied", duration: 2000 }); } catch {} }
  }

  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BriefcaseIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{job.title}</p>
            {job.featured && <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded flex-shrink-0">Featured</Badge>}
          </div>
          <p className="text-xs text-gray-500">{job.company}</p>
        </div>
        {job.location && (
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <MapPinIcon className="w-3.5 h-3.5" />{job.location}
          </div>
        )}
        {salary && (
          <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <DollarSignIcon className="w-3.5 h-3.5" />{salary}
          </div>
        )}
        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 flex-shrink-0 hidden sm:inline-flex ${LEVEL_COLORS[job.experienceLevel] || "bg-gray-100 text-gray-500"}`}>
          {job.experienceLevel}
        </Badge>
        <button
          onClick={handleShare}
          title="Share job"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <Share2Icon className="w-4 h-4" />
        </button>
        {onSend && (
          <button
            onClick={onSend}
            title="Send to a connection"
            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
          >
            <SendHorizontalIcon className="w-4 h-4" />
          </button>
        )}
        {onBookmark && (
          <button
            onClick={onBookmark}
            title={bookmarked ? "Remove bookmark" : "Save job"}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors flex-shrink-0 ${
              bookmarked
                ? "text-primary bg-primary/10 hover:bg-red-50 hover:text-red-500"
                : "text-gray-400 hover:bg-gray-100 hover:text-primary"
            }`}
          >
            <BookmarkIcon className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
          </button>
        )}
        <Button size="sm" className="rounded-full px-4 text-xs flex-shrink-0 hidden sm:flex">Apply</Button>
      </div>
    </Link>
  );
}

function JobTableRow({ job, index, bookmarked, onBookmark, onSend }: {
  job: Job & { applicationCount?: number };
  index: number;
  bookmarked?: boolean;
  onBookmark?: (e: React.MouseEvent) => void;
  onSend?: (e: React.MouseEvent) => void;
}) {
  const { toast } = useToast();

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    const url = `${window.location.origin}${BASE}jobs/${job.id}`;
    const data = { title: `${job.title} at ${job.company}`, text: `Check out this remote job: ${job.title} at ${job.company}`, url };
    if (navigator.share) { try { await navigator.share(data); } catch {} }
    else { try { await navigator.clipboard.writeText(url); toast({ title: "Link copied", duration: 2000 }); } catch {} }
  }

  const salary = job.salaryMin && job.salaryMax
    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
    : "—";
  return (
    <tr className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
      <td className="px-4 py-3">
        <Link href={`/jobs/${job.id}`} className="group">
          <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">{job.title}</p>
          {job.featured && <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded mt-0.5">Featured</Badge>}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{job.company}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{job.location || "—"}</td>
      <td className="px-4 py-3">
        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${LEVEL_COLORS[job.experienceLevel] || "bg-gray-100 text-gray-500"}`}>
          {job.experienceLevel}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{salary}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            title="Share job"
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Share2Icon className="w-3.5 h-3.5" />
          </button>
          {onSend && (
            <button
              onClick={onSend}
              title="Send to a connection"
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              <SendHorizontalIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onBookmark && (
            <button
              onClick={onBookmark}
              title={bookmarked ? "Remove bookmark" : "Save job"}
              className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                bookmarked
                  ? "text-primary bg-primary/10 hover:bg-red-50 hover:text-red-500"
                  : "text-gray-400 hover:bg-gray-100 hover:text-primary"
              }`}
            >
              <BookmarkIcon className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          )}
          <Link href={`/jobs/${job.id}`}>
            <Button size="sm" className="rounded-full px-3 text-xs">Apply</Button>
          </Link>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [query,  setQuery]  = useState("");
  const [category, setCategory] = useState<string>("");
  const [level, setLevel]       = useState<string>("");
  const [view, setView]         = useState<ViewMode>("grid");

  const { user } = useAppAuth();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [sendJob, setSendJob] = useState<Job | null>(null);

  const params = {
    search: query || undefined,
    category: category || undefined,
    experienceLevel: level || undefined,
    limit: 20,
    offset: 0,
  };

  const { data, isLoading, error, refetch } = useListJobs(params, {
    query: { queryKey: getListJobsQueryKey(params) }
  });

  // Commit the search (apply to results)
  const commit = useCallback((val: string) => {
    setSearch(val);
    setQuery(val);
  }, []);

  function clearFilters() {
    setSearch(""); setQuery(""); setCategory(""); setLevel("");
  }

  const hasFilters = query || category || level;

  function handleBookmark(jobId: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleBookmark("job", jobId);
    };
  }

  function handleSendJob(job: Job) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSendJob(job);
    };
  }

  return (
    <div className="max-w-[1320px] mx-auto px-4 py-10 pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BriefcaseIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Remote Jobs</h1>
        </div>
        <p className="text-muted-foreground">Find your next remote role at forward-thinking companies.</p>
      </div>

      {/* Search bar + filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex gap-2 flex-1">
          <JobSearchBox value={search} onChange={setSearch} onCommit={commit} />
          <Button
            onClick={() => commit(search)}
            className="rounded-xl px-5 flex-shrink-0"
          >
            Search
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="flex-1 md:flex-none md:w-36 rounded-xl">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="flex-1 md:flex-none md:w-32 rounded-xl">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <XIcon className="w-4 h-4" />
            </Button>
          )}

          {/* Mobile: view toggle at end, grid+list only (no table) */}
          <div className="flex-shrink-0 md:hidden">
            <ViewToggle
              view={view === "table" ? "grid" : view}
              onChange={setView}
              options={["grid", "list"]}
            />
          </div>

          {/* Desktop: view toggle at end, includes table option */}
          <div className="hidden md:block flex-shrink-0">
            <ViewToggle view={view} onChange={setView} options={["grid", "list", "table"]} />
          </div>
        </div>
      </div>

      {/* Results */}
      {isLoading ? (
        <LoadingState message="Loading jobs..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !data?.jobs?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No jobs found</p>
          {hasFilters && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{data.total} job{data.total !== 1 ? "s" : ""} found</p>

          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  featured={job.featured}
                  isBookmarked={user ? isBookmarked("job", job.id) : undefined}
                  onBookmark={user ? handleBookmark(job.id) : undefined}
                  onSend={user ? handleSendJob(job) : undefined}
                />
              ))}
            </div>
          )}

          {view === "list" && (
            <div className="flex flex-col gap-2">
              {data.jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  bookmarked={user ? isBookmarked("job", job.id) : undefined}
                  onBookmark={user ? handleBookmark(job.id) : undefined}
                  onSend={user ? handleSendJob(job) : undefined}
                />
              ))}
            </div>
          )}

          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job, i) => (
                    <JobTableRow
                      key={job.id}
                      job={job}
                      index={i}
                      bookmarked={user ? isBookmarked("job", job.id) : undefined}
                      onBookmark={user ? handleBookmark(job.id) : undefined}
                      onSend={user ? handleSendJob(job) : undefined}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {sendJob && <JobSendModal job={sendJob} onClose={() => setSendJob(null)} />}
    </div>
  );
}

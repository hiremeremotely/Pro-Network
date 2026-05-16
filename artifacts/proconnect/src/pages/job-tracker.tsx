import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useAppAuth } from "@/contexts/app-auth";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon, PlusIcon, ListIcon, LayoutGridIcon, ExternalLinkIcon,
  MailIcon, Trash2Icon, PencilIcon, XIcon, CheckCircleIcon, TrendingUpIcon,
  CalendarIcon, ChevronRightIcon, LinkIcon, RefreshCwIcon, BuildingIcon,
  SparklesIcon, TableIcon, ChevronUpIcon, ChevronDownIcon, CheckIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
type AppStatus = "saved" | "applied" | "screening" | "interview" | "offer" | "accepted" | "rejected";

interface StatusHistoryEntry {
  status: string;
  date: string;
}

interface TrackedApp {
  uid: string; id: number; type: "external" | "native"; source: string;
  jobTitle: string; companyName: string; platform: string; jobUrl?: string | null;
  status: string; appliedDate?: string | null; location?: string | null;
  salaryMin?: number | null; salaryMax?: number | null; notes?: string | null;
  statusHistory?: StatusHistoryEntry[] | null;
  createdAt: string; nativeJobId?: number;
}

interface PlatformLinks {
  indeedUrl?: string | null; glassdoorUrl?: string | null;
  wellfoundUrl?: string | null; angellistUrl?: string | null;
  linkedinUrl?: string | null;
  gmailConnected: boolean; outlookConnected: boolean;
}

interface TrackerData {
  applications: TrackedApp[]; platformLinks: PlatformLinks | null;
}

interface EmailPreview {
  jobTitle: string; companyName: string; platform: string; status: string;
  appliedDate: string; source: string; emailSubject?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES: { value: AppStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: "saved",     label: "Saved",     color: "text-slate-700",  bg: "bg-slate-100",  dot: "bg-slate-400"  },
  { value: "applied",   label: "Applied",   color: "text-blue-700",   bg: "bg-blue-50",    dot: "bg-blue-500"   },
  { value: "screening", label: "Screening", color: "text-violet-700", bg: "bg-violet-50",  dot: "bg-violet-500" },
  { value: "interview", label: "Interview", color: "text-indigo-700", bg: "bg-indigo-50",  dot: "bg-indigo-500" },
  { value: "offer",     label: "Offer",     color: "text-amber-700",  bg: "bg-amber-50",   dot: "bg-amber-500"  },
  { value: "accepted",  label: "Accepted",  color: "text-green-700",  bg: "bg-green-50",   dot: "bg-green-500"  },
  { value: "rejected",  label: "Rejected",  color: "text-red-700",    bg: "bg-red-50",     dot: "bg-red-400"    },
];
const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const PLATFORMS: { value: string; label: string; color: string }[] = [
  { value: "linkedin",       label: "LinkedIn",         color: "bg-[#0a66c2] text-white"   },
  { value: "indeed",         label: "Indeed",           color: "bg-[#003a9b] text-white"   },
  { value: "glassdoor",      label: "Glassdoor",        color: "bg-[#0caa41] text-white"   },
  { value: "wellfound",      label: "Wellfound",        color: "bg-[#fb5c04] text-white"   },
  { value: "angellist",      label: "AngelList",        color: "bg-gray-900 text-white"    },
  { value: "weworkremotely", label: "WeWorkRemotely",   color: "bg-[#1a9b6c] text-white"   },
  { value: "hiremeremotely", label: "Hire Me Remotely", color: "bg-indigo-600 text-white"  },
  { value: "greenhouse",     label: "Greenhouse",       color: "bg-[#24a84b] text-white"   },
  { value: "lever",          label: "Lever",            color: "bg-[#4db4d4] text-white"   },
  { value: "workday",        label: "Workday",          color: "bg-[#f25900] text-white"   },
  { value: "ashby",          label: "Ashby",            color: "bg-gray-800 text-white"    },
  { value: "recruitee",      label: "Recruitee",        color: "bg-[#6434d4] text-white"   },
  { value: "other",          label: "Other",            color: "bg-gray-200 text-gray-700" },
];
const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.value, p]));

type SortField = "jobTitle" | "companyName" | "status" | "platform" | "appliedDate";
type ViewMode = "kanban" | "list" | "table";

// ── Small helpers ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100", dot: "bg-gray-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg} ${s.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const p = PLATFORM_MAP[platform] ?? { label: platform, color: "bg-gray-200 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${p.color}`}>
      {p.label}
    </span>
  );
}

function SourceIcon({ source }: { source: string }) {
  if (source === "email") return <MailIcon className="w-3 h-3 text-gray-400" title="Imported from email" />;
  if (source === "native") return <BuildingIcon className="w-3 h-3 text-indigo-400" title="Applied via Hire Me Remotely" />;
  return null;
}

// ── MultiSelect ───────────────────────────────────────────────────────────────
function MultiSelect({
  options, values, onChange, placeholder,
}: { options: { label: string; value: string }[]; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const label = values.length === 0 ? placeholder : `${placeholder} (${values.length})`;

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-sm min-w-[140px] ${
          values.length > 0 ? "border-primary bg-primary/5 text-primary" : "border-gray-200 bg-white text-gray-600"
        }`}
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <ChevronDownIcon className="w-3.5 h-3.5 flex-shrink-0" />
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-50 bg-white border border-gray-200 rounded-xl shadow-lg p-1 min-w-[160px]">
          <button onClick={() => { onChange([]); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg">
            Clear all
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const next = values.includes(opt.value) ? values.filter((v) => v !== opt.value) : [...values, opt.value];
                onChange(next);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-gray-50 text-left"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${values.includes(opt.value) ? "bg-primary border-primary" : "border-gray-300"}`}>
                {values.includes(opt.value) && <CheckIcon className="w-2.5 h-2.5 text-white" />}
              </div>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ apps }: { apps: TrackedApp[] }) {
  const total = apps.length;
  const inProgress = apps.filter((a) => ["applied", "screening", "interview"].includes(a.status)).length;
  const offers = apps.filter((a) => ["offer", "accepted"].includes(a.status)).length;
  const successRate = total > 0 ? Math.round((offers / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {[
        { label: "Total Tracked",  value: total,              icon: BriefcaseIcon,   color: "text-indigo-600", bg: "bg-indigo-50"  },
        { label: "In Progress",    value: inProgress,         icon: TrendingUpIcon,  color: "text-blue-600",   bg: "bg-blue-50"    },
        { label: "Offers / Won",   value: offers,             icon: CheckCircleIcon, color: "text-green-600",  bg: "bg-green-50"   },
        { label: "Offer Rate",     value: `${successRate}%`,  icon: SparklesIcon,    color: "text-amber-600",  bg: "bg-amber-50"   },
      ].map((s) => (
        <Card key={s.label} className="border border-gray-200 shadow-none rounded-xl bg-white">
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Platform Strip ────────────────────────────────────────────────────────────
function PlatformStrip({ links, profileId, authToken, onRefetch }: {
  links: PlatformLinks | null; profileId: number; authToken: string; onRefetch: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailModal, setEmailModal] = useState<"gmail" | "outlook" | null>(null);
  const [linksModal, setLinksModal] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const [linkForm, setLinkForm] = useState({
    indeedUrl: links?.indeedUrl ?? "", glassdoorUrl: links?.glassdoorUrl ?? "",
    wellfoundUrl: links?.wellfoundUrl ?? "", angellistUrl: links?.angellistUrl ?? "",
    linkedinUrl: links?.linkedinUrl ?? "",
  });
  const [scanning, setScanning] = useState(false);
  const [previews, setPreviews] = useState<EmailPreview[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const authHeader = { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` };

  function openOAuthPopup(authUrl: string): Promise<void> {
    return new Promise((resolve) => {
      const popup = popupRef.current;
      if (!popup || popup.closed) { resolve(); return; }
      popup.location.href = authUrl;
      const check = setInterval(() => {
        if (popup.closed) { clearInterval(check); resolve(); return; }
        try {
          if (popup.location.href.includes("email_connected=1")) {
            popup.close(); clearInterval(check); resolve();
          }
        } catch { /* cross-origin while navigating — keep polling */ }
      }, 300);
      setTimeout(() => { clearInterval(check); if (!popup.closed) popup.close(); resolve(); }, 120_000);
    });
  }

  const previewMutation = useMutation({
    mutationFn: async (provider: "gmail" | "outlook") => {
      setScanning(true);
      const initRes = await fetch(`${BASE}api/email-integration/initiate`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ provider }),
      });
      if (!initRes.ok) throw new Error("Failed to initiate email connection");
      const { authUrl, connected } = await initRes.json();
      if (!connected) await openOAuthPopup(authUrl);
      const syncRes = await fetch(`${BASE}api/email-integration/sync`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ provider }),
      });
      if (!syncRes.ok) throw new Error("Failed to scan inbox");
      return syncRes.json();
    },
    onSuccess: (data) => {
      setScanning(false);
      setEmailModal(null);
      const apps: EmailPreview[] = data.previews ?? [];
      setPreviews(apps);
      setSelected(new Set(apps.map((_, i) => i)));
      queryClient.invalidateQueries({ queryKey: ["job-tracker", profileId] });
      onRefetch();
    },
    onError: () => {
      setScanning(false);
      toast({ title: "Scan failed", variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const toImport = (previews ?? []).filter((_, i) => selected.has(i));
      const r = await fetch(`${BASE}api/email-integration/confirm-import`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ apps: toImport }),
      });
      if (!r.ok) throw new Error("Import failed");
      return r.json();
    },
    onSuccess: (data) => {
      setPreviews(null);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["job-tracker", profileId] });
      onRefetch();
      toast({ title: "Applications imported!", description: `${data.imported?.length ?? 0} applications added to your tracker.` });
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: "gmail" | "outlook") => {
      const r = await fetch(`${BASE}api/email-integration/disconnect`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({ provider }),
      });
      if (!r.ok) throw new Error("Disconnect failed");
      return r.json();
    },
    onSuccess: (_, provider) => {
      queryClient.invalidateQueries({ queryKey: ["job-tracker", profileId] });
      onRefetch();
      toast({ title: `${provider === "gmail" ? "Gmail" : "Outlook"} disconnected` });
    },
  });

  const saveLinksMutation = useMutation({
    mutationFn: async (data: typeof linkForm) => {
      const r = await fetch(`${BASE}api/profiles/${profileId}/platform-links`, {
        method: "PATCH",
        headers: authHeader,
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("Save failed");
      return r.json();
    },
    onSuccess: () => { setLinksModal(false); queryClient.invalidateQueries({ queryKey: ["job-tracker", profileId] }); onRefetch(); toast({ title: "Platform links saved" }); },
  });

  function toggleSelect(i: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  return (
    <>
      <Card className="border border-gray-200 shadow-none rounded-xl bg-white mb-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-400" /> My Platforms
            </h3>
            <button onClick={() => { setLinkForm({ indeedUrl: links?.indeedUrl ?? "", glassdoorUrl: links?.glassdoorUrl ?? "", wellfoundUrl: links?.wellfoundUrl ?? "", angellistUrl: links?.angellistUrl ?? "", linkedinUrl: links?.linkedinUrl ?? "" }); setLinksModal(true); }} className="text-xs text-primary font-medium hover:underline">
              Edit profile links
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Gmail */}
            {(["gmail", "outlook"] as const).map((provider) => {
              const connected = provider === "gmail" ? links?.gmailConnected : links?.outlookConnected;
              const label = provider === "gmail" ? "Gmail" : "Outlook";
              return (
                <div key={provider} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
                  <div className="w-5 h-5 flex-shrink-0">
                    {provider === "gmail" ? (
                      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335" /><path d="M22 6L12 13L2 6" stroke="white" strokeWidth="2" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-5 h-5"><rect width="24" height="24" rx="2" fill="#0078d4" /><text x="3" y="17" fontSize="14" fill="white" fontWeight="bold">O</text></svg>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                  {connected ? (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] text-green-600 font-semibold">Connected</span>
                      <button onClick={() => disconnectMutation.mutate(provider)} className="ml-1 text-[10px] text-gray-400 hover:text-red-500">Disconnect</button>
                    </span>
                  ) : (
                    <button onClick={() => setEmailModal(provider)} className="text-[11px] text-primary font-semibold hover:underline">Connect</button>
                  )}
                </div>
              );
            })}

            <div className="h-8 w-px bg-gray-200 self-center" />

            {/* Profile links */}
            {[
              { key: "linkedinUrl",  label: "LinkedIn",  url: links?.linkedinUrl  },
              { key: "indeedUrl",    label: "Indeed",    url: links?.indeedUrl    },
              { key: "glassdoorUrl", label: "Glassdoor", url: links?.glassdoorUrl },
              { key: "wellfoundUrl", label: "Wellfound", url: links?.wellfoundUrl },
              { key: "angellistUrl", label: "AngelList", url: links?.angellistUrl },
            ].map(({ label, url }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white">
                <span className="text-xs font-medium text-gray-600">{label}</span>
                {url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-indigo-800">
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-[10px] text-gray-400">not set</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: email connect info modal */}
      <Dialog open={emailModal !== null} onOpenChange={() => setEmailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-primary" />
              Connect {emailModal === "gmail" ? "Gmail" : "Outlook"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-sm text-indigo-800 font-semibold mb-2">What happens when you connect?</p>
              <ul className="text-sm text-indigo-700 space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> Your inbox is scanned for job application emails</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> Matches are shown for your review before import</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> You choose which applications to add</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500">This demo simulates a real inbox scan with sample applications.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModal(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!emailModal) return;
                const left = Math.round(window.screenX + (window.outerWidth - 500) / 2);
                const top = Math.round(window.screenY + (window.outerHeight - 600) / 2);
                popupRef.current = window.open("about:blank", "email_oauth", `width=500,height=600,left=${left},top=${top}`);
                previewMutation.mutate(emailModal);
              }}
              disabled={scanning}
            >
              {scanning ? <><RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" />Scanning inbox…</> : "Scan Inbox"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step 2: review + select which apps to import */}
      <Dialog open={previews !== null} onOpenChange={() => { setPreviews(null); setSelected(new Set()); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-primary" />
              Review Import — {previews?.length ?? 0} applications found
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-3">
            Select the applications you want to add to your tracker. Uncheck any duplicates or false positives.
          </p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(previews ?? []).map((app, i) => (
              <label key={i} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selected.has(i) ? "border-primary bg-indigo-50/50" : "border-gray-200 bg-gray-50"}`}>
                <div
                  onClick={() => toggleSelect(i)}
                  className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 cursor-pointer ${selected.has(i) ? "bg-primary border-primary" : "border-gray-300"}`}
                >
                  {selected.has(i) && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900">{app.jobTitle}</p>
                    <StatusBadge status={app.status} />
                    <PlatformBadge platform={app.platform} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{app.companyName}{app.appliedDate ? ` · ${app.appliedDate}` : ""}</p>
                  {app.emailSubject && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate italic">{app.emailSubject}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setPreviews(null); setSelected(new Set()); }}>Cancel</Button>
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={selected.size === 0 || confirmMutation.isPending}
            >
              {confirmMutation.isPending ? "Importing…" : `Import ${selected.size} Application${selected.size !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Platform links edit modal */}
      <Dialog open={linksModal} onOpenChange={setLinksModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Platform Profile Links</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            {([
              { key: "linkedinUrl" as const,  label: "LinkedIn Profile URL"  },
              { key: "indeedUrl" as const,    label: "Indeed Profile URL"    },
              { key: "glassdoorUrl" as const, label: "Glassdoor Profile URL" },
              { key: "wellfoundUrl" as const, label: "Wellfound Profile URL" },
              { key: "angellistUrl" as const, label: "AngelList Profile URL" },
            ]).map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{label}</label>
                <Input placeholder="https://..." value={linkForm[key]} onChange={(e) => setLinkForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinksModal(false)}>Cancel</Button>
            <Button onClick={() => saveLinksMutation.mutate(linkForm)} disabled={saveLinksMutation.isPending}>Save Links</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
interface AppForm {
  jobTitle: string; companyName: string; platform: string; jobUrl: string;
  status: string; appliedDate: string; location: string; salaryMin: string; salaryMax: string; notes: string;
}
const BLANK_FORM: AppForm = {
  jobTitle: "", companyName: "", platform: "other", jobUrl: "",
  status: "applied", appliedDate: new Date().toISOString().split("T")[0],
  location: "", salaryMin: "", salaryMax: "", notes: "",
};

function AppModal({ open, onClose, initial, profileId, authToken, editId, onSaved }: {
  open: boolean; onClose: () => void; initial?: Partial<AppForm>; profileId: number; authToken: string; editId?: number; onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AppForm>({ ...BLANK_FORM, ...initial });
  const [errors, setErrors] = useState<{ jobTitle?: string; companyName?: string }>({});

  function field(k: keyof AppForm) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
      onInput: (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: (e.target as HTMLInputElement).value })),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const jobTitle = form.jobTitle.trim();
      const companyName = form.companyName.trim();
      const errs: { jobTitle?: string; companyName?: string } = {};
      if (!jobTitle) errs.jobTitle = "Required";
      if (!companyName) errs.companyName = "Required";
      if (Object.keys(errs).length) { setErrors(errs); throw new Error("validation"); }
      setErrors({});
      const payload = {
        jobTitle, companyName,
        platform: form.platform, jobUrl: form.jobUrl || null, status: form.status,
        appliedDate: form.appliedDate || null, location: form.location || null,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin, 10) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax, 10) : null,
        notes: form.notes || null, source: "manual",
      };
      const url = editId ? `${BASE}api/external-applications/${editId}` : `${BASE}api/external-applications`;
      const r = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify(payload),
      });
      if (!r.ok) { const err = await r.json().catch(() => ({})); throw new Error(err.error ?? "Failed to save"); }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: editId ? "Application updated" : "Application added" });
      queryClient.invalidateQueries({ queryKey: ["job-tracker", profileId] });
      onSaved();
      onClose();
    },
    onError: (err: Error) => {
      if (err.message !== "validation") toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editId ? "Edit Application" : "Track New Application"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3 py-1">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">Job Title *</label>
              <Input placeholder="e.g. Senior Frontend Engineer" {...field("jobTitle")} aria-label="Job Title" />
              {errors.jobTitle && <p className="text-xs text-red-500 mt-0.5">{errors.jobTitle}</p>}
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">Company *</label>
              <Input placeholder="e.g. Stripe" {...field("companyName")} aria-label="Company" />
              {errors.companyName && <p className="text-xs text-red-500 mt-0.5">{errors.companyName}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Platform</label>
              <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Applied Date</label>
              <Input type="date" {...field("appliedDate")} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Location</label>
              <Input placeholder="Remote / New York" {...field("location")} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Min Salary (USD)</label>
              <Input type="number" placeholder="80000" {...field("salaryMin")} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Max Salary (USD)</label>
              <Input type="number" placeholder="120000" {...field("salaryMax")} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">Job URL</label>
              <Input placeholder="https://..." {...field("jobUrl")} />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-700 block mb-1">Notes</label>
              <Textarea placeholder="Cover letter snippets, interview notes…" rows={3} {...field("notes")} />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving…" : editId ? "Save Changes" : "Add Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Card Drawer ───────────────────────────────────────────────────────────────
function CardDrawer({ app, onClose, onEdit, onDelete, onStatusChange }: {
  app: TrackedApp | null; onClose: () => void; onEdit: (a: TrackedApp) => void;
  onDelete: (a: TrackedApp) => void; onStatusChange: (a: TrackedApp, status: string) => void;
}) {
  if (!app) return null;
  const salary = app.salaryMin && app.salaryMax
    ? `$${(app.salaryMin / 1000).toFixed(0)}k – $${(app.salaryMax / 1000).toFixed(0)}k` : null;

  return (
    <div className="fixed inset-0 z-[600] flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[420px] max-w-full bg-white shadow-2xl flex flex-col overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{app.jobTitle}</p>
            <p className="text-sm text-gray-500 mt-0.5">{app.companyName}</p>
          </div>
          <button onClick={onClose} className="ml-3 p-1 rounded-full hover:bg-gray-100 transition-colors">
            <XIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={app.status} />
            <PlatformBadge platform={app.platform} />
            {app.source === "email" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                <MailIcon className="w-3 h-3" /> Email import
              </span>
            )}
            {app.type === "native" && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                <BuildingIcon className="w-3 h-3" /> Applied here
              </span>
            )}
          </div>
          {app.type === "external" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Change Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button key={s.value} onClick={() => onStatusChange(app, s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${app.status === s.value ? `${s.bg} ${s.color} border-transparent` : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {app.appliedDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Applied</p>
                <p className="font-medium text-gray-800 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />{app.appliedDate}
                </p>
              </div>
            )}
            {app.location && (<div><p className="text-xs text-gray-400 font-medium mb-0.5">Location</p><p className="font-medium text-gray-800">{app.location}</p></div>)}
            {salary && (<div><p className="text-xs text-gray-400 font-medium mb-0.5">Salary Range</p><p className="font-medium text-gray-800">{salary}</p></div>)}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Added</p>
              <p className="font-medium text-gray-800">{formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}</p>
            </div>
          </div>
          {app.notes && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">{app.notes}</p>
            </div>
          )}
          {/* Status History Timeline */}
          {app.statusHistory && app.statusHistory.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-2">Status History</p>
              <ol className="relative border-l border-gray-200 ml-2 space-y-3">
                {app.statusHistory.map((entry, i) => {
                  const s = STATUSES.find((x) => x.value === entry.status);
                  return (
                    <li key={i} className="ml-4">
                      <span className={`absolute -left-[7px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${s?.dot ?? "bg-gray-400"}`} />
                      <p className={`text-xs font-semibold ${s?.color ?? "text-gray-700"}`}>{s?.label ?? entry.status}</p>
                      <p className="text-[10px] text-gray-400">{new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    </li>
                  );
                })}
                <li className="ml-4">
                  <span className="absolute -left-[7px] mt-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-gray-200" />
                  <p className="text-xs text-gray-400">Added {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}</p>
                </li>
              </ol>
            </div>
          )}
          {app.jobUrl && (
            <a href={app.jobUrl} target={app.type === "native" ? "_self" : "_blank"} rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline">
              <ExternalLinkIcon className="w-4 h-4" />
              {app.type === "native" ? "View Job Posting" : "View Original Posting"}
            </a>
          )}
        </div>
        {app.type === "external" && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(app)}>
              <PencilIcon className="w-4 h-4" /> Edit
            </Button>
            <Button variant="outline" className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600" onClick={() => onDelete(app)}>
              <Trash2Icon className="w-4 h-4" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Application Card ──────────────────────────────────────────────────────────
function AppCard({ app, onClick }: { app: TrackedApp; onClick: () => void }) {
  const salary = app.salaryMin && app.salaryMax
    ? `$${(app.salaryMin / 1000).toFixed(0)}k–$${(app.salaryMax / 1000).toFixed(0)}k` : null;
  return (
    <div onClick={onClick} className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">{app.jobTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{app.companyName}</p>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <PlatformBadge platform={app.platform} />
        {salary && <span className="text-[10px] text-gray-400 font-medium">{salary}</span>}
        <SourceIcon source={app.source} />
      </div>
      {app.appliedDate && (
        <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" />{app.appliedDate}
        </p>
      )}
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({ apps, activeStatuses, onCardClick, onAddClick }: {
  apps: TrackedApp[]; activeStatuses: string[]; onCardClick: (a: TrackedApp) => void; onAddClick: (status: AppStatus) => void;
}) {
  const colsToShow = activeStatuses.length > 0 ? STATUSES.filter((s) => activeStatuses.includes(s.value)) : STATUSES;
  const grouped = Object.fromEntries(STATUSES.map((s) => [s.value, [] as TrackedApp[]]));
  for (const app of apps) {
    const key = app.status in grouped ? app.status : "applied";
    grouped[key].push(app);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {colsToShow.map((col) => {
        const colApps = grouped[col.value] ?? [];
        return (
          <div key={col.value} className="flex-shrink-0 w-[220px] flex flex-col">
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-bold ${col.color}`}>{col.label}</span>
              </div>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${col.bg} ${col.color}`}>{colApps.length}</span>
            </div>
            <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px] bg-gray-50/80 rounded-b-xl border border-t-0 border-gray-200">
              {colApps.map((app) => <AppCard key={app.uid} app={app} onClick={() => onCardClick(app)} />)}
              <button onClick={() => onAddClick(col.value as AppStatus)}
                className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary px-2 py-1.5 rounded-lg hover:bg-white transition-all border border-dashed border-gray-200 hover:border-primary/30">
                <PlusIcon className="w-3.5 h-3.5" /> Add here
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({ apps, onCardClick }: { apps: TrackedApp[]; onCardClick: (a: TrackedApp) => void }) {
  if (apps.length === 0) return (
    <div className="text-center py-20">
      <BriefcaseIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No applications match your filters</p>
    </div>
  );
  return (
    <div className="flex flex-col gap-2">
      {apps.map((app) => {
        const salary = app.salaryMin && app.salaryMax ? `$${(app.salaryMin / 1000).toFixed(0)}k – $${(app.salaryMax / 1000).toFixed(0)}k` : null;
        return (
          <div key={app.uid} onClick={() => onCardClick(app)}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BriefcaseIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{app.jobTitle}</p>
                <SourceIcon source={app.source} />
              </div>
              <p className="text-xs text-gray-500 truncate">{app.companyName}{app.location ? ` · ${app.location}` : ""}</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {salary && <span className="text-xs text-gray-400">{salary}</span>}
              {app.appliedDate && <span className="text-xs text-gray-400 flex items-center gap-1"><CalendarIcon className="w-3 h-3" />{app.appliedDate}</span>}
              <PlatformBadge platform={app.platform} />
              <StatusBadge status={app.status} />
            </div>
            <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
        );
      })}
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────
const TABLE_COLS: { key: SortField; label: string }[] = [
  { key: "jobTitle",     label: "Role"      },
  { key: "companyName",  label: "Company"   },
  { key: "platform",     label: "Platform"  },
  { key: "status",       label: "Status"    },
  { key: "appliedDate",  label: "Applied"   },
];

function TableView({ apps, onCardClick, sort, onSort }: {
  apps: TrackedApp[]; onCardClick: (a: TrackedApp) => void;
  sort: { field: SortField; dir: "asc" | "desc" }; onSort: (f: SortField) => void;
}) {
  const sorted = [...apps].sort((a, b) => {
    const av = (a[sort.field] ?? "") as string;
    const bv = (b[sort.field] ?? "") as string;
    const cmp = av.localeCompare(bv);
    return sort.dir === "asc" ? cmp : -cmp;
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-none">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {TABLE_COLS.map((col) => (
              <th key={col.key} onClick={() => onSort(col.key)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-800 select-none">
                <span className="flex items-center gap-1">
                  {col.label}
                  {sort.field === col.key
                    ? sort.dir === "asc" ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />
                    : <ChevronUpIcon className="w-3 h-3 opacity-0 group-hover:opacity-50" />}
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Location</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No applications match your filters</td>
            </tr>
          )}
          {sorted.map((app) => (
            <tr key={app.uid} onClick={() => onCardClick(app)}
              className="border-b border-gray-50 hover:bg-gray-50/80 cursor-pointer transition-colors group">
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900 group-hover:text-primary transition-colors">{app.jobTitle}</p>
                  <SourceIcon source={app.source} />
                </div>
              </td>
              <td className="px-4 py-3 text-gray-600">{app.companyName}</td>
              <td className="px-4 py-3"><PlatformBadge platform={app.platform} /></td>
              <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
              <td className="px-4 py-3 text-gray-400 text-xs">{app.appliedDate ?? "—"}</td>
              <td className="px-4 py-3 text-gray-400 text-xs">{app.location ?? "—"}</td>
              <td className="px-4 py-3">
                <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function JobTracker() {
  const { user } = useAppAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("kanban");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState<{ field: SortField; dir: "asc" | "desc" }>({ field: "appliedDate", dir: "desc" });
  const [addModal, setAddModal] = useState<{ open: boolean; initialStatus?: string }>({ open: false });
  const [editApp, setEditApp] = useState<TrackedApp | null>(null);
  const [drawerApp, setDrawerApp] = useState<TrackedApp | null>(null);

  const authToken = user?.authToken ?? "";

  const { data, isLoading, error, refetch } = useQuery<TrackerData>({
    queryKey: ["job-tracker", user?.id],
    queryFn: () => fetch(`${BASE}api/job-tracker/${user!.id}`, {
      headers: { "Authorization": `Bearer ${authToken}` },
    }).then((r) => r.json()),
    enabled: !!user?.id && !!authToken,
    staleTime: 0,
  });

  const apps = data?.applications ?? [];
  const platformLinks = data?.platformLinks ?? null;

  const filtered = apps.filter((a) => {
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(a.status)) return false;
    if (selectedPlatforms.length > 0 && !selectedPlatforms.includes(a.platform)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.jobTitle.toLowerCase().includes(q) && !a.companyName.toLowerCase().includes(q)) return false;
    }
    if (fromDate && a.appliedDate && a.appliedDate < fromDate) return false;
    if (toDate && a.appliedDate && a.appliedDate > toDate) return false;
    return true;
  });

  function handleSort(field: SortField) {
    setSort((prev) => prev.field === field ? { field, dir: prev.dir === "asc" ? "desc" : "asc" } : { field, dir: "asc" });
  }

  const deleteMutation = useMutation({
    mutationFn: async (app: TrackedApp) => {
      const r = await fetch(`${BASE}api/external-applications/${app.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${authToken}` },
      });
      if (!r.ok && r.status !== 204) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? `Delete failed (${r.status})`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-tracker", user?.id] });
      refetch(); setDrawerApp(null); toast({ title: "Application removed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`${BASE}api/external-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Status update failed");
      return r.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["job-tracker", user?.id] });
      refetch();
      setDrawerApp((prev) => prev ? { ...prev, status: updated.status } : null);
    },
  });

  const hasFilters = selectedStatuses.length > 0 || selectedPlatforms.length > 0 || search || fromDate || toDate;

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8 pb-24 max-w-[1300px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BriefcaseIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Job Tracker</h1>
          </div>
          <p className="text-sm text-gray-500">Track every application across all platforms in one place</p>
        </div>
        <Button onClick={() => setAddModal({ open: true })} className="gap-2 rounded-full px-5 shadow-sm">
          <PlusIcon className="w-4 h-4" /> Add Application
        </Button>
      </div>

      {isLoading && <LoadingState message="Loading your applications…" />}
      {error && <ErrorState message="Failed to load job tracker" onRetry={refetch} />}

      {!isLoading && !error && (
        <>
          <StatsBar apps={apps} />
          <PlatformStrip links={platformLinks} profileId={user.id} authToken={authToken} onRefetch={refetch} />

          {/* Filter + view toggle */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <input type="text" placeholder="Search role or company…" value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status multiselect */}
            <MultiSelect
              options={STATUSES.map((s) => ({ label: s.label, value: s.value }))}
              values={selectedStatuses}
              onChange={setSelectedStatuses}
              placeholder="Status"
            />

            {/* Platform multiselect */}
            <MultiSelect
              options={PLATFORMS.map((p) => ({ label: p.label, value: p.value }))}
              values={selectedPlatforms}
              onChange={setSelectedPlatforms}
              placeholder="Platform"
            />

            {/* Date range */}
            <div className="flex items-center gap-1.5">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
                title="From date"
                className={`h-9 px-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 ${fromDate ? "border-primary text-primary" : "border-gray-200 text-gray-500"}`}
                style={{ width: 130 }} />
              <span className="text-gray-400 text-xs">–</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
                title="To date"
                className={`h-9 px-2 rounded-lg border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 ${toDate ? "border-primary text-primary" : "border-gray-200 text-gray-500"}`}
                style={{ width: 130 }} />
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <button onClick={() => { setSearch(""); setSelectedStatuses([]); setSelectedPlatforms([]); setFromDate(""); setToDate(""); }}
                className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                <XIcon className="w-3.5 h-3.5" /> Clear
              </button>
            )}

            {/* View toggle */}
            <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { mode: "kanban" as ViewMode, icon: LayoutGridIcon, title: "Kanban" },
                { mode: "list" as ViewMode, icon: ListIcon, title: "List" },
                { mode: "table" as ViewMode, icon: TableIcon, title: "Table" },
              ]).map(({ mode, icon: Icon, title }) => (
                <button key={mode} onClick={() => setView(mode)} title={title}
                  className={`p-1.5 rounded-md transition-all ${view === mode ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {hasFilters && (
            <p className="text-xs text-gray-400 mb-3">{filtered.length} of {apps.length} applications</p>
          )}

          {/* Board */}
          {view === "kanban" && (
            <KanbanBoard apps={filtered} activeStatuses={selectedStatuses} onCardClick={setDrawerApp} onAddClick={(status) => setAddModal({ open: true, initialStatus: status })} />
          )}
          {view === "list" && <ListView apps={filtered} onCardClick={setDrawerApp} />}
          {view === "table" && <TableView apps={filtered} onCardClick={setDrawerApp} sort={sort} onSort={handleSort} />}
        </>
      )}

      {addModal.open && (
        <AppModal open onClose={() => setAddModal({ open: false })}
          initial={addModal.initialStatus ? { status: addModal.initialStatus } : undefined}
          profileId={user.id} authToken={authToken} onSaved={() => refetch()} />
      )}
      {editApp && (
        <AppModal open onClose={() => setEditApp(null)}
          initial={{
            jobTitle: editApp.jobTitle, companyName: editApp.companyName, platform: editApp.platform,
            jobUrl: editApp.jobUrl ?? "", status: editApp.status, appliedDate: editApp.appliedDate ?? "",
            location: editApp.location ?? "", salaryMin: editApp.salaryMin?.toString() ?? "",
            salaryMax: editApp.salaryMax?.toString() ?? "", notes: editApp.notes ?? "",
          }}
          profileId={user.id} authToken={authToken} editId={editApp.id}
          onSaved={() => { refetch(); setDrawerApp(null); }}
        />
      )}
      <CardDrawer app={drawerApp} onClose={() => setDrawerApp(null)}
        onEdit={(a) => { setDrawerApp(null); setEditApp(a); }}
        onDelete={(a) => deleteMutation.mutate(a)}
        onStatusChange={(a, status) => statusMutation.mutate({ id: a.id, status })}
      />
    </div>
  );
}

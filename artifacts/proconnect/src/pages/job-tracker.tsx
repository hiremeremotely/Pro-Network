import { useState, useRef } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useAppAuth } from "@/contexts/app-auth";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon,
  PlusIcon,
  ListIcon,
  LayoutGridIcon,
  ExternalLinkIcon,
  MailIcon,
  Trash2Icon,
  PencilIcon,
  XIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  CalendarIcon,
  ChevronRightIcon,
  LinkIcon,
  RefreshCwIcon,
  BuildingIcon,
  SparklesIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

// ── Types ─────────────────────────────────────────────────────────────────────
type AppStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "accepted"
  | "rejected";

type AppPlatform =
  | "linkedin"
  | "indeed"
  | "glassdoor"
  | "wellfound"
  | "angellist"
  | "weworkremotely"
  | "hiremeremotely"
  | "other";

interface TrackedApp {
  uid: string;
  id: number;
  type: "external" | "native";
  source: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  jobUrl?: string | null;
  status: string;
  appliedDate?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  notes?: string | null;
  createdAt: string;
  nativeJobId?: number;
}

interface PlatformLinks {
  indeedUrl?: string | null;
  glassdoorUrl?: string | null;
  wellfoundUrl?: string | null;
  angellistUrl?: string | null;
  gmailConnected: boolean;
  outlookConnected: boolean;
}

interface TrackerData {
  applications: TrackedApp[];
  platformLinks: PlatformLinks | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUSES: { value: AppStatus; label: string; color: string; bg: string; dot: string }[] = [
  { value: "saved",     label: "Saved",     color: "text-slate-700",  bg: "bg-slate-100",    dot: "bg-slate-400"  },
  { value: "applied",   label: "Applied",   color: "text-blue-700",   bg: "bg-blue-50",      dot: "bg-blue-500"   },
  { value: "screening", label: "Screening", color: "text-violet-700", bg: "bg-violet-50",    dot: "bg-violet-500" },
  { value: "interview", label: "Interview", color: "text-indigo-700", bg: "bg-indigo-50",    dot: "bg-indigo-500" },
  { value: "offer",     label: "Offer",     color: "text-amber-700",  bg: "bg-amber-50",     dot: "bg-amber-500"  },
  { value: "accepted",  label: "Accepted",  color: "text-green-700",  bg: "bg-green-50",     dot: "bg-green-500"  },
  { value: "rejected",  label: "Rejected",  color: "text-red-700",    bg: "bg-red-50",       dot: "bg-red-400"    },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map((s) => [s.value, s]));

const PLATFORMS: { value: AppPlatform; label: string; color: string }[] = [
  { value: "linkedin",       label: "LinkedIn",         color: "bg-[#0a66c2] text-white"    },
  { value: "indeed",         label: "Indeed",           color: "bg-[#003a9b] text-white"    },
  { value: "glassdoor",      label: "Glassdoor",        color: "bg-[#0caa41] text-white"    },
  { value: "wellfound",      label: "Wellfound",        color: "bg-[#fb5c04] text-white"    },
  { value: "angellist",      label: "AngelList",        color: "bg-gray-900 text-white"     },
  { value: "weworkremotely", label: "WeWorkRemotely",   color: "bg-[#1a9b6c] text-white"    },
  { value: "hiremeremotely", label: "Hire Me Remotely", color: "bg-indigo-600 text-white"   },
  { value: "other",          label: "Other",            color: "bg-gray-200 text-gray-700"  },
];

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((p) => [p.value, p]));

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

// ── Stats Bar ─────────────────────────────────────────────────────────────────
function StatsBar({ apps }: { apps: TrackedApp[] }) {
  const total = apps.length;
  const inProgress = apps.filter((a) => ["applied", "screening", "interview"].includes(a.status)).length;
  const offers = apps.filter((a) => ["offer", "accepted"].includes(a.status)).length;
  const rejected = apps.filter((a) => a.status === "rejected").length;
  const successRate = total > 0 ? Math.round(((offers) / total) * 100) : 0;

  const stats = [
    { label: "Total Tracked",  value: total,       icon: BriefcaseIcon,    color: "text-indigo-600", bg: "bg-indigo-50"  },
    { label: "In Progress",    value: inProgress,  icon: TrendingUpIcon,   color: "text-blue-600",   bg: "bg-blue-50"    },
    { label: "Offers / Won",   value: offers,      icon: CheckCircleIcon,  color: "text-green-600",  bg: "bg-green-50"   },
    { label: "Offer Rate",     value: `${successRate}%`, icon: SparklesIcon, color: "text-amber-600", bg: "bg-amber-50"  },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {stats.map((s) => (
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
function PlatformStrip({
  links,
  profileId,
  onRefetch,
}: {
  links: PlatformLinks | null;
  profileId: number;
  onRefetch: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [emailModal, setEmailModal] = useState<"gmail" | "outlook" | null>(null);
  const [linksModal, setLinksModal] = useState(false);
  const [linkForm, setLinkForm] = useState({
    indeedUrl: links?.indeedUrl ?? "",
    glassdoorUrl: links?.glassdoorUrl ?? "",
    wellfoundUrl: links?.wellfoundUrl ?? "",
    angellistUrl: links?.angellistUrl ?? "",
  });
  const [connecting, setConnecting] = useState(false);
  const [importReview, setImportReview] = useState<TrackedApp[] | null>(null);

  const connectMutation = useMutation({
    mutationFn: async (provider: "gmail" | "outlook") => {
      setConnecting(true);
      const r = await fetch(`${BASE}api/email-integration/simulate-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, provider }),
      });
      return r.json();
    },
    onSuccess: (data) => {
      setConnecting(false);
      setEmailModal(null);
      if (data.imported?.length) {
        setImportReview(
          data.imported.map((a: ExternalApplication) => ({
            uid: `ext-${a.id}`,
            id: a.id,
            type: "external" as const,
            source: a.source,
            jobTitle: a.jobTitle,
            companyName: a.companyName,
            platform: a.platform,
            status: a.status,
            appliedDate: a.appliedDate,
            createdAt: a.createdAt,
          }))
        );
      }
      onRefetch();
      toast({ title: "Email connected!", description: `${data.imported?.length ?? 0} applications imported from your inbox.` });
    },
    onError: () => {
      setConnecting(false);
      toast({ title: "Connection failed", description: "Could not connect email.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async (provider: "gmail" | "outlook") => {
      const r = await fetch(`${BASE}api/email-integration/disconnect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, provider }),
      });
      return r.json();
    },
    onSuccess: (_, provider) => {
      onRefetch();
      toast({ title: `${provider === "gmail" ? "Gmail" : "Outlook"} disconnected` });
    },
  });

  const saveLinksMutation = useMutation({
    mutationFn: async (data: typeof linkForm) => {
      const r = await fetch(`${BASE}api/profiles/${profileId}/platform-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return r.json();
    },
    onSuccess: () => {
      setLinksModal(false);
      onRefetch();
      toast({ title: "Platform links saved" });
    },
  });

  return (
    <>
      <Card className="border border-gray-200 shadow-none rounded-xl bg-white mb-5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-gray-400" /> My Platforms
            </h3>
            <button onClick={() => { setLinkForm({ indeedUrl: links?.indeedUrl ?? "", glassdoorUrl: links?.glassdoorUrl ?? "", wellfoundUrl: links?.wellfoundUrl ?? "", angellistUrl: links?.angellistUrl ?? "" }); setLinksModal(true); }} className="text-xs text-primary font-medium hover:underline">
              Edit profile links
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {/* Gmail */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
              <div className="w-5 h-5 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none"><path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6Z" fill="#EA4335" /><path d="M22 6L12 13L2 6" stroke="white" strokeWidth="2" /></svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Gmail</span>
              {links?.gmailConnected ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-green-600 font-semibold">Connected</span>
                  <button onClick={() => disconnectMutation.mutate("gmail")} className="ml-1 text-[10px] text-gray-400 hover:text-red-500">Disconnect</button>
                </span>
              ) : (
                <button onClick={() => setEmailModal("gmail")} className="text-[11px] text-primary font-semibold hover:underline">Connect</button>
              )}
            </div>

            {/* Outlook */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white">
              <div className="w-5 h-5 flex-shrink-0">
                <svg viewBox="0 0 24 24" className="w-5 h-5"><rect width="24" height="24" rx="2" fill="#0078d4" /><text x="3" y="17" fontSize="14" fill="white" fontWeight="bold">O</text></svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Outlook</span>
              {links?.outlookConnected ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-[11px] text-green-600 font-semibold">Connected</span>
                  <button onClick={() => disconnectMutation.mutate("outlook")} className="ml-1 text-[10px] text-gray-400 hover:text-red-500">Disconnect</button>
                </span>
              ) : (
                <button onClick={() => setEmailModal("outlook")} className="text-[11px] text-primary font-semibold hover:underline">Connect</button>
              )}
            </div>

            <div className="h-8 w-px bg-gray-200 self-center" />

            {/* Profile links */}
            {[
              { key: "indeedUrl", label: "Indeed", url: links?.indeedUrl },
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

      {/* Email connect modal */}
      <Dialog open={emailModal !== null} onOpenChange={() => setEmailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MailIcon className="w-5 h-5 text-primary" />
              Connect {emailModal === "gmail" ? "Gmail" : "Outlook"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-sm text-indigo-800 font-medium mb-2">What happens when you connect?</p>
              <ul className="text-sm text-indigo-700 space-y-1.5">
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> We scan your inbox for job application confirmation emails</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> Matching applications are imported automatically</li>
                <li className="flex items-start gap-2"><CheckCircleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" /> You review before anything is saved</li>
              </ul>
            </div>
            <p className="text-xs text-gray-500">
              This demo simulates an email scan and imports sample applications so you can explore the feature.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEmailModal(null)}>Cancel</Button>
            <Button
              onClick={() => emailModal && connectMutation.mutate(emailModal)}
              disabled={connecting}
              className="bg-primary hover:bg-primary/90"
            >
              {connecting ? (
                <span className="flex items-center gap-2">
                  <RefreshCwIcon className="w-4 h-4 animate-spin" /> Scanning inbox…
                </span>
              ) : (
                <>Connect & Scan Inbox</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import review modal */}
      <Dialog open={importReview !== null} onOpenChange={() => setImportReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Imported Applications</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-3">
            {importReview?.length} application{importReview?.length !== 1 ? "s" : ""} found in your inbox. They've been added to your tracker.
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {importReview?.map((a) => (
              <div key={a.uid} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BriefcaseIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.jobTitle}</p>
                  <p className="text-xs text-gray-500">{a.companyName}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setImportReview(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Platform links edit modal */}
      <Dialog open={linksModal} onOpenChange={setLinksModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Platform Profile Links</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            {[
              { key: "indeedUrl" as const, label: "Indeed Profile URL" },
              { key: "glassdoorUrl" as const, label: "Glassdoor Profile URL" },
              { key: "wellfoundUrl" as const, label: "Wellfound Profile URL" },
              { key: "angellistUrl" as const, label: "AngelList Profile URL" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-gray-700 block mb-1">{label}</label>
                <Input
                  placeholder="https://..."
                  value={linkForm[key]}
                  onChange={(e) => setLinkForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinksModal(false)}>Cancel</Button>
            <Button onClick={() => saveLinksMutation.mutate(linkForm)} disabled={saveLinksMutation.isPending}>
              Save Links
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
interface AppForm {
  jobTitle: string;
  companyName: string;
  platform: string;
  jobUrl: string;
  status: string;
  appliedDate: string;
  location: string;
  salaryMin: string;
  salaryMax: string;
  notes: string;
}

const BLANK_FORM: AppForm = {
  jobTitle: "", companyName: "", platform: "other", jobUrl: "",
  status: "applied", appliedDate: new Date().toISOString().split("T")[0],
  location: "", salaryMin: "", salaryMax: "", notes: "",
};

function AppModal({
  open,
  onClose,
  initial,
  profileId,
  editId,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Partial<AppForm>;
  profileId: number;
  editId?: number;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<AppForm>({ ...BLANK_FORM, ...initial });

  function field(k: keyof AppForm) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        profileId,
        jobTitle: form.jobTitle.trim(),
        companyName: form.companyName.trim(),
        platform: form.platform,
        jobUrl: form.jobUrl || null,
        status: form.status,
        appliedDate: form.appliedDate || null,
        location: form.location || null,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin, 10) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax, 10) : null,
        notes: form.notes || null,
        source: "manual",
      };
      if (editId) {
        const r = await fetch(`${BASE}api/external-applications/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return r.json();
      } else {
        const r = await fetch(`${BASE}api/external-applications`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return r.json();
      }
    },
    onSuccess: () => {
      toast({ title: editId ? "Application updated" : "Application added" });
      onSaved();
      onClose();
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editId ? "Edit Application" : "Track New Application"}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-700 block mb-1">Job Title *</label>
            <Input placeholder="e.g. Senior Frontend Engineer" {...field("jobTitle")} />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-gray-700 block mb-1">Company *</label>
            <Input placeholder="e.g. Stripe" {...field("companyName")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Platform</label>
            <Select value={form.platform} onValueChange={(v) => setForm((f) => ({ ...f, platform: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.jobTitle.trim() || !form.companyName.trim()}
          >
            {saveMutation.isPending ? "Saving…" : editId ? "Save Changes" : "Add Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card Drawer ───────────────────────────────────────────────────────────────
function CardDrawer({
  app,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  app: TrackedApp | null;
  onClose: () => void;
  onEdit: (a: TrackedApp) => void;
  onDelete: (a: TrackedApp) => void;
  onStatusChange: (a: TrackedApp, status: string) => void;
}) {
  if (!app) return null;
  const salary =
    app.salaryMin && app.salaryMax
      ? `$${(app.salaryMin / 1000).toFixed(0)}k – $${(app.salaryMax / 1000).toFixed(0)}k`
      : null;

  return (
    <div className="fixed inset-0 z-[200] flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="w-[420px] max-w-full bg-white shadow-2xl flex flex-col overflow-y-auto">
        {/* Header */}
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
          {/* Status + badges */}
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

          {/* Change status (only external apps) */}
          {app.type === "external" && (
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5">Change Status</label>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onStatusChange(app, s.value)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                      app.status === s.value
                        ? `${s.bg} ${s.color} border-transparent`
                        : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {app.appliedDate && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Applied</p>
                <p className="font-medium text-gray-800 flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                  {app.appliedDate}
                </p>
              </div>
            )}
            {app.location && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Location</p>
                <p className="font-medium text-gray-800">{app.location}</p>
              </div>
            )}
            {salary && (
              <div>
                <p className="text-xs text-gray-400 font-medium mb-0.5">Salary Range</p>
                <p className="font-medium text-gray-800">{salary}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-400 font-medium mb-0.5">Added</p>
              <p className="font-medium text-gray-800">
                {formatDistanceToNow(new Date(app.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {app.notes && (
            <div>
              <p className="text-xs text-gray-400 font-semibold mb-1.5">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
                {app.notes}
              </p>
            </div>
          )}

          {app.jobUrl && (
            <a
              href={app.type === "native" ? app.jobUrl : app.jobUrl}
              target={app.type === "native" ? "_self" : "_blank"}
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary font-medium hover:underline"
            >
              <ExternalLinkIcon className="w-4 h-4" />
              {app.type === "native" ? "View Job Posting" : "View Original Posting"}
            </a>
          )}
        </div>

        {/* Footer actions — only external apps can be edited/deleted */}
        {app.type === "external" && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(app)}>
              <PencilIcon className="w-4 h-4" /> Edit
            </Button>
            <Button
              variant="outline"
              className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              onClick={() => onDelete(app)}
            >
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
  const salary =
    app.salaryMin && app.salaryMax
      ? `$${(app.salaryMin / 1000).toFixed(0)}k–$${(app.salaryMax / 1000).toFixed(0)}k`
      : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {app.jobTitle}
          </p>
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
          <CalendarIcon className="w-3 h-3" />
          {app.appliedDate}
        </p>
      )}
    </div>
  );
}

// ── Kanban Board ──────────────────────────────────────────────────────────────
function KanbanBoard({
  apps,
  onCardClick,
  onAddClick,
}: {
  apps: TrackedApp[];
  onCardClick: (a: TrackedApp) => void;
  onAddClick: (status: AppStatus) => void;
}) {
  const grouped = Object.fromEntries(STATUSES.map((s) => [s.value, [] as TrackedApp[]]));
  for (const app of apps) {
    const key = app.status in grouped ? app.status : "applied";
    grouped[key].push(app);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
      {STATUSES.map((col) => {
        const colApps = grouped[col.value] ?? [];
        return (
          <div
            key={col.value}
            className="flex-shrink-0 w-[220px] flex flex-col"
          >
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <span className={`text-xs font-bold ${col.color}`}>{col.label}</span>
              </div>
              <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${col.bg} ${col.color} bg-opacity-70`}>
                {colApps.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 flex flex-col gap-2 p-2 min-h-[120px] bg-gray-50/80 rounded-b-xl border border-t-0 border-gray-200">
              {colApps.map((app) => (
                <AppCard key={app.uid} app={app} onClick={() => onCardClick(app)} />
              ))}

              {/* Add button — only for external-only statuses */}
              {col.value !== "hiremeremotely" && (
                <button
                  onClick={() => onAddClick(col.value as AppStatus)}
                  className="mt-1 flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary px-2 py-1.5 rounded-lg hover:bg-white transition-all border border-dashed border-gray-200 hover:border-primary/30"
                >
                  <PlusIcon className="w-3.5 h-3.5" /> Add here
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── List View ─────────────────────────────────────────────────────────────────
function ListView({ apps, onCardClick }: { apps: TrackedApp[]; onCardClick: (a: TrackedApp) => void }) {
  if (apps.length === 0) {
    return (
      <div className="text-center py-20">
        <BriefcaseIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No applications yet</p>
        <p className="text-gray-400 text-sm">Add your first application above</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {apps.map((app) => {
        const salary =
          app.salaryMin && app.salaryMax
            ? `$${(app.salaryMin / 1000).toFixed(0)}k – $${(app.salaryMax / 1000).toFixed(0)}k`
            : null;
        return (
          <div
            key={app.uid}
            onClick={() => onCardClick(app)}
            className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center gap-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BriefcaseIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                  {app.jobTitle}
                </p>
                <SourceIcon source={app.source} />
              </div>
              <p className="text-xs text-gray-500 truncate">{app.companyName}{app.location ? ` · ${app.location}` : ""}</p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              {salary && <span className="text-xs text-gray-400">{salary}</span>}
              {app.appliedDate && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />{app.appliedDate}
                </span>
              )}
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function JobTracker() {
  const { user } = useAppAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [addModal, setAddModal] = useState<{ open: boolean; initialStatus?: string }>({ open: false });
  const [editApp, setEditApp] = useState<TrackedApp | null>(null);
  const [drawerApp, setDrawerApp] = useState<TrackedApp | null>(null);

  const { data, isLoading, error, refetch } = useQuery<TrackerData>({
    queryKey: ["job-tracker", user?.id],
    queryFn: () =>
      fetch(`${BASE}api/job-tracker/${user!.id}`).then((r) => r.json()),
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  const apps = data?.applications ?? [];
  const platformLinks = data?.platformLinks ?? null;

  const filtered = apps.filter((a) => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (filterPlatform !== "all" && a.platform !== filterPlatform) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.jobTitle.toLowerCase().includes(q) && !a.companyName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${BASE}api/external-applications/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      refetch();
      setDrawerApp(null);
      toast({ title: "Application removed" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const r = await fetch(`${BASE}api/external-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return r.json();
    },
    onSuccess: (updated) => {
      refetch();
      setDrawerApp((prev) => prev ? { ...prev, status: updated.status } : null);
    },
  });

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
          {/* Stats */}
          <StatsBar apps={apps} />

          {/* Platform strip */}
          <PlatformStrip
            links={platformLinks}
            profileId={user.id}
            onRefetch={refetch}
          />

          {/* Filter + view toggle bar */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <input
                type="text"
                placeholder="Search title or company…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 pl-3 pr-8 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <XIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[140px] h-9 text-sm">
                <SelectValue placeholder="All platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView("kanban")}
                title="Kanban"
                className={`p-1.5 rounded-md transition-all ${view === "kanban" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              >
                <LayoutGridIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                title="List"
                className={`p-1.5 rounded-md transition-all ${view === "list" ? "bg-white text-primary shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Board / List */}
          {view === "kanban" ? (
            <KanbanBoard
              apps={filtered}
              onCardClick={setDrawerApp}
              onAddClick={(status) => setAddModal({ open: true, initialStatus: status })}
            />
          ) : (
            <ListView apps={filtered} onCardClick={setDrawerApp} />
          )}
        </>
      )}

      {/* Add modal */}
      {addModal.open && (
        <AppModal
          open
          onClose={() => setAddModal({ open: false })}
          initial={addModal.initialStatus ? { status: addModal.initialStatus } : undefined}
          profileId={user.id}
          onSaved={() => refetch()}
        />
      )}

      {/* Edit modal */}
      {editApp && (
        <AppModal
          open
          onClose={() => setEditApp(null)}
          initial={{
            jobTitle: editApp.jobTitle,
            companyName: editApp.companyName,
            platform: editApp.platform,
            jobUrl: editApp.jobUrl ?? "",
            status: editApp.status,
            appliedDate: editApp.appliedDate ?? "",
            location: editApp.location ?? "",
            salaryMin: editApp.salaryMin?.toString() ?? "",
            salaryMax: editApp.salaryMax?.toString() ?? "",
            notes: editApp.notes ?? "",
          }}
          profileId={user.id}
          editId={editApp.id}
          onSaved={() => { refetch(); setDrawerApp(null); }}
        />
      )}

      {/* Card drawer */}
      <CardDrawer
        app={drawerApp}
        onClose={() => setDrawerApp(null)}
        onEdit={(a) => { setDrawerApp(null); setEditApp(a); }}
        onDelete={(a) => deleteMutation.mutate(a.id)}
        onStatusChange={(a, status) => statusMutation.mutate({ id: a.id, status })}
      />
    </div>
  );
}

// ── type alias for the email import response ──────────────────────────────────
interface ExternalApplication {
  id: number;
  source: string;
  jobTitle: string;
  companyName: string;
  platform: string;
  status: string;
  appliedDate: string | null;
  createdAt: string;
}

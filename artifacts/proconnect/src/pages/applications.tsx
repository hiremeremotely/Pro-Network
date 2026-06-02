import { useState, useCallback, useEffect } from "react";
import { Link, Redirect } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useListProfileApplications, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon, CalendarIcon, BuildingIcon, ArrowRightIcon, MapPinIcon,
  UsersIcon, UserPlusIcon, CheckCircleIcon, ClockIcon, XCircleIcon,
  CopyIcon, SendIcon, FileTextIcon, ChevronLeftIcon, ChevronRightIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

// ── Status maps ───────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  reviewing: "bg-blue-50 text-blue-700 border-blue-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  accepted:  "bg-green-50 text-green-700 border-green-200",
  interview: "bg-purple-50 text-purple-700 border-purple-200",
  offer:     "bg-indigo-50 text-indigo-700 border-indigo-200",
};
const STATUS_DOT: Record<string, string> = {
  pending:   "bg-yellow-400",
  reviewing: "bg-blue-400",
  rejected:  "bg-red-400",
  accepted:  "bg-green-400",
  interview: "bg-purple-400",
  offer:     "bg-indigo-400",
};
const STATUS_OPTIONS = ["pending", "reviewing", "interview", "offer", "accepted", "rejected"];

// ── Minimal offer-letter template utilities ───────────────────────────────────
interface EditableTemplate { id: string; name: string; content: string; }
interface OfferData { employeeName: string; role: string; salary: number | null; currency: string; startDate: string; companyName: string; }
interface TemplateRenderData { [key: string]: string; }

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildRenderData(d: OfferData, salaryNote = " per year"): TemplateRenderData {
  const fmtSalary = d.salary
    ? `${d.currency} ${new Intl.NumberFormat("en-US").format(d.salary)}${salaryNote}`
    : "To be discussed";
  return {
    employeeName: escapeHtml(d.employeeName),
    role: escapeHtml(d.role),
    salary: escapeHtml(fmtSalary),
    startDate: escapeHtml(d.startDate),
    companyName: escapeHtml(d.companyName),
    currentDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  };
}

function renderTemplate(content: string, rd: TemplateRenderData): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => rd[key] ?? "");
}

const DEFAULT_TEMPLATES: EditableTemplate[] = [
  {
    id: "full-time",
    name: "Full-Time Employment",
    content: `<div style="max-width:680px;margin:0 auto;font-family:Georgia,serif;font-size:14px;line-height:1.8;color:#1a1a1a"><p style="text-align:right;color:#888;font-size:12px">{{currentDate}}</p><h2 style="font-size:20px;font-weight:700;margin:24px 0 4px">Offer of Employment</h2><p>Dear <strong>{{employeeName}}</strong>,</p><p>We are pleased to offer you the full-time position of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, commencing on <strong>{{startDate}}</strong>.</p><p>Your compensation will be <strong>{{salary}}</strong>, paid monthly via direct deposit.</p><p>This is a remote-first role. Details regarding your equipment, onboarding schedule, and team contacts will follow in a separate communication.</p><p>Please sign below to indicate your acceptance of this offer.</p><br/><p style="margin-top:40px">___________________________<br/><strong>{{employeeName}}</strong><br/>Date: ___________</p><p style="margin-top:24px">Sincerely,<br/><strong>{{companyName}}</strong></p></div>`,
  },
  {
    id: "contractor",
    name: "Contractor Agreement",
    content: `<div style="max-width:680px;margin:0 auto;font-family:Georgia,serif;font-size:14px;line-height:1.8;color:#1a1a1a"><p style="text-align:right;color:#888;font-size:12px">{{currentDate}}</p><h2 style="font-size:20px;font-weight:700;margin:24px 0 4px">Independent Contractor Agreement</h2><p>Dear <strong>{{employeeName}}</strong>,</p><p>We are pleased to engage you as an Independent Contractor for the role of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, effective <strong>{{startDate}}</strong>.</p><p>Your agreed compensation is <strong>{{salary}}</strong>. Invoices should be submitted monthly.</p><p>As an independent contractor you will not be entitled to employee benefits. All work product created under this engagement will be the property of {{companyName}}.</p><p>Please sign to confirm your acceptance.</p><br/><p style="margin-top:40px">___________________________<br/><strong>{{employeeName}}</strong><br/>Date: ___________</p><p style="margin-top:24px">Sincerely,<br/><strong>{{companyName}}</strong></p></div>`,
  },
  {
    id: "freelance",
    name: "Freelance Engagement",
    content: `<div style="max-width:680px;margin:0 auto;font-family:Georgia,serif;font-size:14px;line-height:1.8;color:#1a1a1a"><p style="text-align:right;color:#888;font-size:12px">{{currentDate}}</p><h2 style="font-size:20px;font-weight:700;margin:24px 0 4px">Freelance Engagement Letter</h2><p>Dear <strong>{{employeeName}}</strong>,</p><p>We would like to engage your freelance services as <strong>{{role}}</strong> for <strong>{{companyName}}</strong>, beginning <strong>{{startDate}}</strong>.</p><p>Compensation: <strong>{{salary}}</strong>. Scope, milestones, and deliverables will be agreed upon in a separate Statement of Work.</p><p>We look forward to working with you on this project. Please confirm acceptance by signing below.</p><br/><p style="margin-top:40px">___________________________<br/><strong>{{employeeName}}</strong><br/>Date: ___________</p><p style="margin-top:24px">Sincerely,<br/><strong>{{companyName}}</strong></p></div>`,
  },
];

const LS_TEMPLATES_KEY = "hmr_offer_templates_v1";

function useOfferTemplates() {
  const [templates, setTemplates] = useState<EditableTemplate[]>(() => {
    try {
      const stored = localStorage.getItem(LS_TEMPLATES_KEY);
      if (stored) return JSON.parse(stored) as EditableTemplate[];
    } catch { /* ignore */ }
    return DEFAULT_TEMPLATES;
  });
  return { templates };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface CompanyApplication {
  id: number;
  jobId: number;
  profileId: number;
  coverLetter?: string | null;
  status: string;
  appliedAt: string;
  profile: {
    id: number;
    name: string;
    headline?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
  } | null;
  job: {
    id: number;
    title: string;
    company: string;
    location?: string | null;
  } | null;
}

interface HireDetails {
  role: string;
  startDate: string;
  rate: string;
  ratePeriod: "year" | "hour";
  currency: string;
  contractType: string;
}

// ── Company hiring pipeline view ──────────────────────────────────────────────
function CompanyApplicationsView() {
  const { user } = useAppAuth();
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>(() =>
    typeof window !== "undefined" && window.innerWidth >= 768 ? "table" : "list"
  );
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [convertedAppIds, setConvertedAppIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const { templates } = useOfferTemplates();

  // Offer delivery modal
  const [offerDeliveryApp, setOfferDeliveryApp] = useState<CompanyApplication | null>(null);
  const [offerTemplate, setOfferTemplate] = useState("full-time");
  const [offerSentInfo, setOfferSentInfo] = useState<{ url: string; via: "link" | "platform" } | null>(null);
  const [sendingOffer, setSendingOffer] = useState(false);

  // Hire wizard
  const [hireWizardApp, setHireWizardApp] = useState<CompanyApplication | null>(null);
  const [hireStep, setHireStep] = useState<1 | 2 | 3>(1);
  const [hireDetails, setHireDetails] = useState<HireDetails>({
    role: "", startDate: "", rate: "", ratePeriod: "year", currency: "USD", contractType: "full-time",
  });
  const [existingOfferHtml, setExistingOfferHtml] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}api/companies/${user.id}/applications`);
      if (!res.ok) throw new Error("Failed to load applications");
      setApplications(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (appId: number, status: string) => {
    setUpdatingStatus(appId);
    try {
      const res = await fetch(`${BASE}api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, companyProfileId: user?.id }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: updated.status } : a));
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // ── Offer delivery ─────────────────────────────────────────────────────────
  const openOfferDelivery = (app: CompanyApplication) => {
    setOfferDeliveryApp(app);
    setOfferTemplate("full-time");
    setOfferSentInfo(null);
    setSendingOffer(false);
  };

  const sendOffer = async (via: "link" | "platform") => {
    if (!offerDeliveryApp || !user?.id) return;
    setSendingOffer(true);
    try {
      const tmpl = templates.find(t => t.id === offerTemplate) ?? templates[0];
      const offerData: OfferData = {
        employeeName: offerDeliveryApp.profile?.name ?? "Candidate",
        role: offerDeliveryApp.job?.title ?? "the position",
        salary: null,
        currency: "USD",
        startDate: "TBD",
        companyName: offerDeliveryApp.job?.company ?? "The Company",
      };
      const rd = buildRenderData(offerData);
      const renderedHtml = renderTemplate(tmpl.content, rd);
      const token = crypto.randomUUID();
      const offerUrl = `${window.location.origin}/offer/${token}`;
      const res = await fetch(`${BASE}api/offer-letters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: offerDeliveryApp.id,
          companyProfileId: user.id,
          candidateProfileId: offerDeliveryApp.profileId,
          templateName: tmpl.id,
          renderedHtml,
          token,
          offerUrl,
          sendViaMessage: via === "platform",
        }),
      });
      if (!res.ok) throw new Error("Failed to create offer letter");
      if (via === "link") {
        try { await navigator.clipboard.writeText(offerUrl); } catch { /* clipboard not available */ }
      }
      setOfferSentInfo({ url: offerUrl, via });
      if (offerDeliveryApp.status === "interview") await updateStatus(offerDeliveryApp.id, "offer");
    } catch {
      toast({ title: "Error", description: "Could not send offer letter.", variant: "destructive" });
    } finally {
      setSendingOffer(false);
    }
  };

  // ── Hire wizard ────────────────────────────────────────────────────────────
  const openHireWizard = async (app: CompanyApplication) => {
    setHireWizardApp(app);
    setHireStep(1);
    setHireDetails({
      role: app.job?.title ?? "Employee",
      startDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      rate: "",
      ratePeriod: "year",
      currency: "USD",
      contractType: "full-time",
    });
    setExistingOfferHtml(null);
    setConfirming(false);
    try {
      const res = await fetch(`${BASE}api/applications/${app.id}/offer-letter`);
      if (res.ok) {
        const data = await res.json();
        setExistingOfferHtml(data.renderedHtml ?? null);
      }
    } catch { /* no offer yet — that's fine */ }
  };

  const confirmHire = async () => {
    if (!hireWizardApp || !user?.id) return;
    setConfirming(true);
    try {
      const empRes = await fetch(`${BASE}api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfileId: user.id,
          individualProfileId: hireWizardApp.profileId,
          jobId: hireWizardApp.jobId,
          role: hireDetails.role || hireWizardApp.job?.title || "Employee",
          salary: hireDetails.rate ? Number(hireDetails.rate) : null,
          currency: hireDetails.currency,
          startDate: hireDetails.startDate
            ? new Date(hireDetails.startDate).toISOString()
            : new Date().toISOString(),
          status:
            hireDetails.contractType === "contractor" || hireDetails.contractType === "freelancer"
              ? "contractor"
              : "active",
        }),
      });
      if (!empRes.ok) throw new Error("Failed to create employee");
      const emp = await empRes.json();
      // Auto-assign default onboarding checklist
      await fetch(`${BASE}api/employees/${emp.id}/onboarding/init`, { method: "POST" });
      // Move application status to accepted
      if (hireWizardApp.status !== "accepted") await updateStatus(hireWizardApp.id, "accepted");
      setConvertedAppIds(prev => new Set(prev).add(hireWizardApp.id));
      setHireWizardApp(null);
      toast({
        title: "Hired! 🎉",
        description: `${hireWizardApp.profile?.name ?? "Candidate"} has been added to your team with an onboarding checklist.`,
      });
    } catch {
      toast({ title: "Error", description: "Could not complete hire.", variant: "destructive" });
    } finally {
      setConfirming(false);
    }
  };

  // ── Action button renderer (pipeline-aware) ────────────────────────────────
  const renderActionBtn = (app: CompanyApplication) => {
    if (convertedAppIds.has(app.id)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
          <CheckCircleIcon className="w-3.5 h-3.5" /> Hired
        </span>
      );
    }
    const map: Record<string, { label: string; cls: string; fn: () => void } | null> = {
      pending:   { label: "Review",      cls: "bg-blue-100 text-blue-700 hover:bg-blue-200",     fn: () => updateStatus(app.id, "reviewing") },
      reviewing: { label: "Interview",   cls: "bg-purple-100 text-purple-700 hover:bg-purple-200", fn: () => updateStatus(app.id, "interview") },
      interview: { label: "Make Offer",  cls: "bg-indigo-100 text-indigo-700 hover:bg-indigo-200", fn: () => updateStatus(app.id, "offer") },
      offer:     { label: "✉ Send Offer", cls: "bg-green-600 text-white hover:bg-green-700",       fn: () => openOfferDelivery(app) },
      accepted:  { label: "Hire",        cls: "bg-primary text-white hover:bg-primary/90",        fn: () => openHireWizard(app) },
      rejected:  null,
    };
    const a = map[app.status] ?? null;
    if (!a) return <span className="text-xs text-gray-300">—</span>;
    return (
      <button
        onClick={a.fn}
        disabled={updatingStatus === app.id}
        className={`text-[11px] font-semibold rounded-full px-3 py-1.5 transition-colors flex-shrink-0 disabled:opacity-50 cursor-pointer ${a.cls}`}
      >
        {updatingStatus === app.id ? "…" : a.label}
      </button>
    );
  };

  if (loading) return <LoadingState message="Loading applications…" />;
  if (error) return <ErrorState error={new Error(error)} retry={fetchApplications} />;

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Pre-render the preview HTML for the offer delivery modal
  const previewHtml = (() => {
    if (!offerDeliveryApp) return "";
    const tmpl = templates.find(t => t.id === offerTemplate) ?? templates[0];
    const rd = buildRenderData({
      employeeName: offerDeliveryApp.profile?.name ?? "Candidate",
      role: offerDeliveryApp.job?.title ?? "the position",
      salary: null,
      currency: "USD",
      startDate: "TBD",
      companyName: offerDeliveryApp.job?.company ?? "The Company",
    });
    return renderTemplate(tmpl.content, rd);
  })();

  // Preview HTML for wizard step 1
  const wizardPreviewHtml = (() => {
    if (existingOfferHtml) return existingOfferHtml;
    if (!hireWizardApp) return "";
    const tmpl = templates[0];
    const rd = buildRenderData({
      employeeName: hireWizardApp.profile?.name ?? "Candidate",
      role: hireWizardApp.job?.title ?? "the position",
      salary: null,
      currency: "USD",
      startDate: "TBD",
      companyName: hireWizardApp.job?.company ?? "The Company",
    });
    return renderTemplate(tmpl.content, rd);
  })();

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UsersIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">Applications</h1>
          </div>
          <p className="text-muted-foreground">Manage your hiring pipeline.</p>
        </div>
        {applications.length > 0 && (
          <div className="flex-shrink-0 mt-1">
            <ViewToggle view={view} onChange={setView} options={["list", "grid", "table"]} />
          </div>
        )}
      </div>

      {/* Funnel pills */}
      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_OPTIONS.map(s => counts[s] > 0 && (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[s] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s] ?? "bg-gray-400"}`} />
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </div>
          ))}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm text-center max-w-sm">Post jobs to start receiving candidate applications.</p>
          <Link href="/jobs">
            <Button className="gap-2">Post a Job <ArrowRightIcon className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>

          {/* LIST VIEW */}
          {view === "list" && (
            <div className="flex flex-col gap-2">
              {applications.map((app) => {
                const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                return (
                  <div key={app.id} className="bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4 px-4 py-3.5 flex-wrap md:flex-nowrap">
                      <Link href={`/profiles/${app.profileId}`}>
                        <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity">
                          <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profiles/${app.profileId}`}>
                          <p className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors truncate">{app.profile?.name ?? "Unknown"}</p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <BriefcaseIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{app.job?.title}</span>
                          {app.profile?.location && <><span>·</span><MapPinIcon className="w-3 h-3 flex-shrink-0" /><span>{app.profile.location.split(",")[0]}</span></>}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                      </div>
                      <select
                        value={app.status}
                        disabled={updatingStatus === app.id}
                        onChange={e => updateStatus(app.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none bg-white cursor-pointer flex-shrink-0 ${STATUS_STYLES[app.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {renderActionBtn(app)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID VIEW */}
          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => {
                const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                return (
                  <Card key={app.id} className="hover:border-primary/30 transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Link href={`/profiles/${app.profileId}`}>
                          <Avatar className="w-11 h-11 border border-gray-100 flex-shrink-0">
                            <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profiles/${app.profileId}`} className="hover:underline">
                            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">{app.profile?.name ?? "Unknown"}</h3>
                          </Link>
                          {app.profile?.headline && <p className="text-xs text-muted-foreground truncate mt-0.5">{app.profile.headline}</p>}
                        </div>
                        <select
                          value={app.status}
                          disabled={updatingStatus === app.id}
                          onChange={e => updateStatus(app.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full border px-2 py-0.5 focus:outline-none bg-white cursor-pointer flex-shrink-0 ${STATUS_STYLES[app.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BriefcaseIcon className="w-3.5 h-3.5" />
                        {app.job?.title}
                      </div>
                      {app.coverLetter && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Cover Letter</p>
                          <p className="text-sm line-clamp-2">{app.coverLetter}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </div>
                        {renderActionBtn(app)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Stage</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => {
                    const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                    return (
                      <tr key={app.id} className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                              <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <Link href={`/profiles/${app.profileId}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">
                              {app.profile?.name ?? "Unknown"}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">{app.job?.title ?? "—"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={app.status}
                            disabled={updatingStatus === app.id}
                            onChange={e => updateStatus(app.id, e.target.value)}
                            className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none bg-white cursor-pointer ${STATUS_STYLES[app.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                          {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3">
                          {renderActionBtn(app)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── OFFER DELIVERY MODAL ────────────────────────────────────────────── */}
      <Dialog open={!!offerDeliveryApp} onOpenChange={open => { if (!open) setOfferDeliveryApp(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5 text-primary" />
              Send Offer Letter
            </DialogTitle>
            {offerDeliveryApp && (
              <p className="text-sm text-muted-foreground">
                To <strong>{offerDeliveryApp.profile?.name}</strong> · {offerDeliveryApp.job?.title}
              </p>
            )}
          </DialogHeader>

          {offerSentInfo ? (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="text-5xl">{offerSentInfo.via === "link" ? "🔗" : "✉️"}</div>
              <div className="text-center">
                <h3 className="font-bold text-lg text-gray-900 mb-1">
                  {offerSentInfo.via === "link" ? "Link copied to clipboard!" : "Offer sent via platform message!"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {offerSentInfo.via === "link"
                    ? "Share this link with the candidate to review and sign the offer."
                    : `${offerDeliveryApp?.profile?.name} has received a message with the offer link.`}
                </p>
              </div>
              <div className="w-full bg-gray-50 rounded-xl border border-gray-200 p-3 flex items-center gap-2">
                <span className="flex-1 text-xs text-gray-600 font-mono truncate">{offerSentInfo.url}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(offerSentInfo.url)}
                  className="flex-shrink-0 text-xs text-primary hover:underline font-medium"
                >
                  Copy
                </button>
              </div>
              <Button variant="outline" onClick={() => setOfferDeliveryApp(null)} className="w-full">
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 overflow-y-auto flex-1 min-h-0 py-1">
              {/* Template picker */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Template</p>
                <div className="flex gap-2 flex-wrap">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setOfferTemplate(t.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                        offerTemplate === t.id
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Letter preview */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
                <div
                  className="bg-white border border-gray-200 rounded-xl p-5 overflow-y-auto max-h-[280px] text-sm"
                  style={{ fontFamily: "Georgia, serif" }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>

              {/* Note: salary TBD */}
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Salary and start date are marked as TBD — use the Hire wizard after acceptance to set final terms.
              </p>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1 flex-col sm:flex-row">
                <button
                  onClick={() => sendOffer("link")}
                  disabled={sendingOffer}
                  className="flex-1 flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-primary text-gray-700 hover:text-primary font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-60 text-sm"
                >
                  <CopyIcon className="w-4 h-4" />
                  {sendingOffer ? "Generating…" : "Copy Shareable Link"}
                </button>
                <button
                  onClick={() => sendOffer("platform")}
                  disabled={sendingOffer}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-60 text-sm"
                >
                  <SendIcon className="w-4 h-4" />
                  {sendingOffer ? "Sending…" : "Send via Platform"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── HIRE WIZARD MODAL ───────────────────────────────────────────────── */}
      <Dialog open={!!hireWizardApp} onOpenChange={open => { if (!open) setHireWizardApp(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <UserPlusIcon className="w-5 h-5 text-primary" />
              Hire {hireWizardApp?.profile?.name ?? "Candidate"}
            </DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-2">
              {[1, 2, 3].map(n => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    hireStep === n ? "bg-primary text-white" :
                    hireStep > n  ? "bg-green-500 text-white" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {hireStep > n ? "✓" : n}
                  </div>
                  <span className={`text-xs font-medium ${hireStep >= n ? "text-gray-700" : "text-gray-400"}`}>
                    {n === 1 ? "Offer" : n === 2 ? "Details" : "Confirm"}
                  </span>
                  {n < 3 && <ChevronRightIcon className="w-3 h-3 text-gray-300" />}
                </div>
              ))}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 py-2">
            {/* Step 1: Offer preview */}
            {hireStep === 1 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  {existingOfferHtml
                    ? "An offer letter was already sent to this candidate."
                    : "No offer letter was sent yet. You can send one from the pipeline, or continue directly to hire."}
                </p>
                <div
                  className="bg-white border border-gray-200 rounded-xl p-5 overflow-y-auto max-h-[320px] text-sm"
                  style={{ fontFamily: "Georgia, serif" }}
                  dangerouslySetInnerHTML={{ __html: wizardPreviewHtml || "<p class='text-gray-400 text-center py-8'>No offer letter preview available.</p>" }}
                />
              </div>
            )}

            {/* Step 2: Employment details */}
            {hireStep === 2 && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Set the employment terms for {hireWizardApp?.profile?.name}.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Role Title</label>
                    <input
                      type="text"
                      value={hireDetails.role}
                      onChange={e => setHireDetails(d => ({ ...d, role: e.target.value }))}
                      placeholder="e.g. Senior Engineer"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Start Date</label>
                    <input
                      type="date"
                      value={hireDetails.startDate}
                      onChange={e => setHireDetails(d => ({ ...d, startDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Compensation</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={hireDetails.rate}
                        onChange={e => setHireDetails(d => ({ ...d, rate: e.target.value }))}
                        placeholder="85000"
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <div className="flex rounded-lg overflow-hidden border border-gray-200">
                        {(["year", "hour"] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setHireDetails(d => ({ ...d, ratePeriod: p }))}
                            className={`px-2.5 py-2 text-xs font-semibold transition-colors ${hireDetails.ratePeriod === p ? "bg-primary text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                          >
                            / {p === "year" ? "yr" : "hr"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Currency</label>
                    <select
                      value={hireDetails.currency}
                      onChange={e => setHireDetails(d => ({ ...d, currency: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                    >
                      {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Contract Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {(["full-time", "part-time", "contractor", "freelancer"] as const).map(ct => (
                        <button
                          key={ct}
                          type="button"
                          onClick={() => setHireDetails(d => ({ ...d, contractType: ct }))}
                          className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors capitalize ${
                            hireDetails.contractType === ct
                              ? "bg-primary text-white border-primary"
                              : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"
                          }`}
                        >
                          {ct}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {hireStep === 3 && hireWizardApp && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Review the details below and confirm to complete the hire.</p>
                <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-200">
                  {[
                    ["Candidate", hireWizardApp.profile?.name ?? "—"],
                    ["Role", hireDetails.role || hireWizardApp.job?.title || "—"],
                    ["Start Date", hireDetails.startDate ? new Date(hireDetails.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"],
                    ["Compensation", hireDetails.rate ? `${hireDetails.currency} ${Number(hireDetails.rate).toLocaleString()} / ${hireDetails.ratePeriod === "year" ? "yr" : "hr"}` : "—"],
                    ["Contract", hireDetails.contractType || "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                      <span className="text-sm font-medium text-gray-800 capitalize">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700 flex items-start gap-2">
                  <span className="text-base">⚠️</span>
                  <span>
                    This will add <strong>{hireWizardApp.profile?.name}</strong> to your team and automatically assign a default <strong>7-task onboarding checklist</strong>. You can customise it in the HR dashboard.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Wizard navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => hireStep > 1 ? setHireStep(s => (s - 1) as 1 | 2 | 3) : setHireWizardApp(null)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 font-medium px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              {hireStep === 1 ? "Cancel" : "Back"}
            </button>
            {hireStep < 3 ? (
              <button
                onClick={() => setHireStep(s => (s + 1) as 2 | 3)}
                className="flex items-center gap-1.5 bg-primary text-white font-semibold px-5 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                Next <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={confirmHire}
                disabled={confirming}
                className="flex items-center gap-1.5 bg-green-600 text-white font-semibold px-5 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-60"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {confirming ? "Hiring…" : "Confirm Hire"}
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Individual job-seeker applications view ───────────────────────────────────
function IndividualApplicationsView({ userId }: { userId: number }) {
  const [view, setView] = useState<ViewMode>("list");

  const { data: applications, isLoading, error, refetch } = useListProfileApplications(userId, {
    query: { queryKey: getListProfileApplicationsQueryKey(userId) }
  });

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BriefcaseIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">My Applications</h1>
          </div>
          <p className="text-muted-foreground">Track the status of your job applications.</p>
        </div>
        {applications && applications.length > 0 && (
          <div className="flex-shrink-0 mt-1">
            <ViewToggle view={view} onChange={setView} options={["list", "grid", "table"]} />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading applications…" />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !applications?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm text-center max-w-sm">Start browsing remote jobs and apply to opportunities that match your skills.</p>
          <Link href="/jobs">
            <Button className="gap-2">Browse Jobs <ArrowRightIcon className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>

          {view === "list" && (
            <div className="flex flex-col gap-2">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${app.jobId}`}>
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{app.job?.title}</p>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <BuildingIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{app.job?.company}</span>
                      {app.job?.location && <><span>·</span><MapPinIcon className="w-3 h-3 flex-shrink-0" /><span>{app.job.location}</span></>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                  </div>
                  <Badge className={`capitalize text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 border ${STATUS_STYLES[app.status] ?? "bg-gray-100 text-gray-500"}`}>
                    {app.status === "accepted"  && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                    {app.status === "rejected"  && <XCircleIcon className="w-3 h-3 mr-1" />}
                    {app.status === "reviewing" && <ClockIcon className="w-3 h-3 mr-1" />}
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => (
                <Card key={app.id} className="hover:border-primary/40 transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BriefcaseIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <Link href={`/jobs/${app.jobId}`} className="hover:underline">
                            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">{app.job?.title}</h3>
                          </Link>
                          <p className="text-xs text-muted-foreground mt-0.5">{app.job?.company}</p>
                        </div>
                      </div>
                      <Badge className={`capitalize text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0 ${STATUS_STYLES[app.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                    </div>
                    {app.job?.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPinIcon className="w-3.5 h-3.5" />
                        {app.job.location}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Job</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr key={app.id} className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${app.jobId}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">
                          {app.job?.title ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.job?.company ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[app.status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[app.status] ?? "bg-gray-400"}`} />
                          {app.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function Applications() {
  const { user } = useAppAuth();
  if (!user) return <Redirect to="/login" />;
  if (user.accountType === "company") return <CompanyApplicationsView />;
  return <IndividualApplicationsView userId={user.id} />;
}

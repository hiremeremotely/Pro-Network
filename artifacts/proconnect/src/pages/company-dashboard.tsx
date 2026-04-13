import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { useEffect, useState, useCallback, useRef } from "react";
import { HRInsightsWidget } from "@/components/hr-insights-widget";
import {
  useListJobs, getListJobsQueryKey,
  useListProfiles, getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import {
  BriefcaseIcon,
  UsersIcon,
  PlusCircleIcon,
  SearchIcon,
  ClipboardListIcon,
  PencilIcon,
  MapPinIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  DollarSignIcon,
  UserCheckIcon,
  ClockIcon,
  XIcon,
  SaveIcon,
  UserMinusIcon,
  EyeIcon,
  FileTextIcon,
  DownloadIcon,
  UploadIcon,
  TrashIcon,
  FileIcon,
  Square,
  CheckSquare,
  CalendarIcon,
  AlertCircleIcon,
  TimerIcon,
  PlusIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

type EmployeeStatus = "active" | "contractor" | "on-leave";

interface EmployeeProfile {
  id: number;
  name: string;
  headline: string;
  avatarUrl?: string | null;
  location?: string | null;
}

interface EmployeeRecord {
  id: number;
  companyProfileId: number;
  individualProfileId: number;
  jobId?: number | null;
  role: string;
  salary?: number | null;
  currency: string;
  startDate?: string | null;
  status: EmployeeStatus;
  createdAt: string;
  profile: EmployeeProfile | null;
  job: { title: string; company: string } | null;
}

interface OnboardingTask {
  id: number;
  employeeId: number;
  title: string;
  completed: boolean;
  completedAt?: string | null;
  order: number;
}

interface EmployeeDocument {
  id: number;
  employeeId: number;
  fileName: string;
  objectPath: string;
  uploadedAt: string;
  documentType: string;
}

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  active:      "bg-green-50 text-green-700 border-green-200",
  contractor:  "bg-blue-50 text-blue-700 border-blue-200",
  "on-leave":  "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_DOT: Record<EmployeeStatus, string> = {
  active:      "bg-green-500",
  contractor:  "bg-blue-500",
  "on-leave":  "bg-amber-500",
};

interface OfferData {
  employeeName: string;
  role: string;
  salary: number | null;
  currency: string;
  startDate: string;
  companyName: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeData(d: OfferData): OfferData {
  return {
    employeeName: escapeHtml(d.employeeName),
    role: escapeHtml(d.role),
    salary: d.salary,
    currency: escapeHtml(d.currency),
    startDate: escapeHtml(d.startDate),
    companyName: escapeHtml(d.companyName),
  };
}

const OFFER_TEMPLATES = [
  {
    id: "full-time",
    label: "Remote Full-Time",
    desc: "Permanent salaried employment",
    color: "border-indigo-200 bg-indigo-50",
    badge: "text-indigo-700 bg-indigo-100",
    render: (d: OfferData) => {
      const salaryLine = d.salary ? `an annual salary of ${d.currency} ${d.salary.toLocaleString()}` : "a competitive salary to be agreed upon";
      return `
<div style="text-align:center;border-bottom:2px solid #6366f1;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#6366f1">${d.companyName}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
</div>
<p>Dear <strong>${d.employeeName}</strong>,</p>
<p>We are pleased to extend this formal offer of employment for the position of <strong>${d.role}</strong> at <strong>${d.companyName}</strong>, effective <strong>${d.startDate}</strong>.</p>
<h3>Position Details</h3>
<ul>
  <li><strong>Title:</strong> ${d.role}</li>
  <li><strong>Type:</strong> Full-Time, Remote</li>
  <li><strong>Start Date:</strong> ${d.startDate}</li>
  <li><strong>Compensation:</strong> ${salaryLine} per year</li>
</ul>
<h3>Employment Terms</h3>
<p>This offer is contingent upon satisfactory completion of any required background or reference checks. You will receive a comprehensive benefits package including health insurance, paid time off, and remote work allowance in accordance with our remote-first policy.</p>
<p>Please confirm your acceptance of this offer by signing and returning this letter within <strong>5 business days</strong>.</p>
<div style="margin-top:60px">
  <p>Sincerely,</p>
  <p><strong>${d.companyName}</strong></p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Accepted by: _________________________ &nbsp; Date: _____________</p>
</div>`;
    },
  },
  {
    id: "contractor",
    label: "Contractor",
    desc: "Fixed-term contract engagement",
    color: "border-blue-200 bg-blue-50",
    badge: "text-blue-700 bg-blue-100",
    render: (d: OfferData) => {
      const salaryLine = d.salary ? `${d.currency} ${d.salary.toLocaleString()} per year (pro-rated for the contract period)` : "an agreed-upon rate to be documented in the accompanying Schedule A";
      return `
<div style="text-align:center;border-bottom:2px solid #3b82f6;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#3b82f6">${d.companyName}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
</div>
<p>Dear <strong>${d.employeeName}</strong>,</p>
<p>We are pleased to offer you an engagement as a <strong>Contractor</strong> for the role of <strong>${d.role}</strong> at <strong>${d.companyName}</strong>, commencing <strong>${d.startDate}</strong>.</p>
<h3>Contract Details</h3>
<ul>
  <li><strong>Role:</strong> ${d.role}</li>
  <li><strong>Engagement Type:</strong> Fixed-Term Contract</li>
  <li><strong>Start Date:</strong> ${d.startDate}</li>
  <li><strong>Compensation:</strong> ${salaryLine}</li>
  <li><strong>Work Arrangement:</strong> Fully Remote</li>
</ul>
<h3>Terms & Conditions</h3>
<p>As a contractor, you will retain independent status and be responsible for your own tax obligations. You will invoice ${d.companyName} according to the schedule outlined in Schedule A. Either party may terminate this agreement with <strong>14 days written notice</strong>.</p>
<p>Please confirm your acceptance by signing below and returning within <strong>3 business days</strong>.</p>
<div style="margin-top:60px">
  <p>For and on behalf of <strong>${d.companyName}</strong>:</p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Contractor signature: _________________________ &nbsp; Date: _____________</p>
</div>`;
    },
  },
  {
    id: "freelance",
    label: "Freelance",
    desc: "Project-based collaboration",
    color: "border-purple-200 bg-purple-50",
    badge: "text-purple-700 bg-purple-100",
    render: (d: OfferData) => {
      const salaryLine = d.salary ? `a project budget of ${d.currency} ${d.salary.toLocaleString()}` : "a project rate to be agreed in the accompanying Statement of Work";
      return `
<div style="text-align:center;border-bottom:2px solid #8b5cf6;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#8b5cf6">${d.companyName}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</div>
</div>
<p>Dear <strong>${d.employeeName}</strong>,</p>
<p>We would like to engage your services on a freelance basis for the project role of <strong>${d.role}</strong> at <strong>${d.companyName}</strong>, beginning <strong>${d.startDate}</strong>.</p>
<h3>Project Details</h3>
<ul>
  <li><strong>Role:</strong> ${d.role}</li>
  <li><strong>Engagement:</strong> Freelance / Project-Based</li>
  <li><strong>Estimated Start:</strong> ${d.startDate}</li>
  <li><strong>Budget:</strong> ${salaryLine}</li>
  <li><strong>Work Mode:</strong> 100% Remote</li>
</ul>
<h3>Scope & Terms</h3>
<p>Deliverables and milestones will be specified in the accompanying Statement of Work. You will remain an independent contractor and retain rights to your tools and equipment. Intellectual property created specifically for this project will vest in ${d.companyName} upon full payment.</p>
<p>Please acknowledge acceptance of these terms within <strong>48 hours</strong>.</p>
<div style="margin-top:60px">
  <p>Warm regards,</p>
  <p><strong>${d.companyName}</strong></p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Freelancer signature: _________________________ &nbsp; Date: _____________</p>
</div>`;
    },
  },
] as const;

type OfferTemplateId = typeof OFFER_TEMPLATES[number]["id"];

function downloadOfferLetter(templateId: OfferTemplateId, data: OfferData) {
  const tmpl = OFFER_TEMPLATES.find(t => t.id === templateId);
  if (!tmpl) return;
  const body = tmpl.render(safeData(data));
  const html = `<!DOCTYPE html><html lang="en"><head>
    <meta charset="UTF-8">
    <title>Offer Letter — ${escapeHtml(data.companyName)}</title>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #1a1a1a; line-height: 1.7; font-size: 15px; }
      h3 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; }
      ul { padding-left: 20px; }
      li { margin-bottom: 4px; }
      @media print { body { margin: 20px; } }
    </style>
  </head><body>${body}</body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
}

function OfferLetterTab({ emp, companyName }: { emp: EmployeeRecord; companyName: string }) {
  const [selectedTemplate, setSelectedTemplate] = useState<OfferTemplateId | null>(null);
  const offerData: OfferData = {
    employeeName: emp.profile?.name ?? "Employee",
    role: emp.role,
    salary: emp.salary ?? null,
    currency: emp.currency ?? "USD",
    startDate: emp.startDate
      ? new Date(emp.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    companyName,
  };

  return (
    <div className="px-6 py-5 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Select a template</h3>
        <p className="text-xs text-gray-500 mb-4">The letter will be pre-filled with {emp.profile?.name ?? "this employee"}'s details. Click "Download PDF" to open a print dialog.</p>
        <div className="space-y-3">
          {OFFER_TEMPLATES.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl.id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                selectedTemplate === tmpl.id
                  ? tmpl.color + " border-current ring-1 ring-current"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{tmpl.label}</p>
                <p className="text-xs text-gray-500">{tmpl.desc}</p>
              </div>
              {selectedTemplate === tmpl.id && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedTemplate && (() => {
        const tmpl = OFFER_TEMPLATES.find(t => t.id === selectedTemplate);
        if (!tmpl) return null;
        const safeD = safeData(offerData);
        const renderedBody = tmpl.render(safeD);
        return (
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Letter Preview</p>
              <span className="text-[10px] text-gray-400">Scroll to read full letter</span>
            </div>
            <div
              className="max-h-56 overflow-y-auto p-4 bg-white"
              style={{ fontFamily: "Georgia, serif", fontSize: "12px", lineHeight: "1.6", color: "#1a1a1a" }}
              dangerouslySetInnerHTML={{ __html: renderedBody }}
            />
          </div>
        );
      })()}

      <Button
        className="w-full gap-2"
        disabled={!selectedTemplate}
        onClick={() => selectedTemplate && downloadOfferLetter(selectedTemplate, offerData)}
      >
        <DownloadIcon className="w-4 h-4" />
        Download PDF
      </Button>
    </div>
  );
}

function OnboardingTab({
  emp,
  companyId,
  onProgress,
}: {
  emp: EmployeeRecord;
  companyId: number;
  onProgress: (completed: number, total: number) => void;
}) {
  const [tasks, setTasks] = useState<OnboardingTask[]>([]);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);
  const [docType, setDocType] = useState("other");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { uploadFile } = useUpload({
    basePath: "/api/storage",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/onboarding?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setDocuments(data.documents ?? []);
        const completed = (data.tasks ?? []).filter((t: OnboardingTask) => t.completed).length;
        onProgress(completed, (data.tasks ?? []).length);
      }
    } finally {
      setLoading(false);
    }
  }, [emp.id, companyId, onProgress]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTask = async (task: OnboardingTask) => {
    setToggling(task.id);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/onboarding/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed, companyId }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated: OnboardingTask = await res.json();
      const newTasks = tasks.map(t => t.id === updated.id ? updated : t);
      setTasks(newTasks);
      const completed = newTasks.filter(t => t.completed).length;
      onProgress(completed, newTasks.length);
    } catch {
      toast({ title: "Error", description: "Could not update task.", variant: "destructive" });
    } finally {
      setToggling(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadFile(file);
      if (!result) throw new Error("Upload failed");
      const res = await fetch(`${BASE}api/employees/${emp.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          fileName: file.name,
          objectPath: result.objectPath,
          documentType: docType,
        }),
      });
      if (!res.ok) throw new Error("Could not save document");
      const doc = await res.json();
      setDocuments(prev => [...prev, doc]);
      toast({ title: "Document uploaded", description: file.name });
    } catch {
      toast({ title: "Error", description: "Could not upload document.", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = async (doc: EmployeeDocument) => {
    try {
      const res = await fetch(
        `${BASE}api/employees/${emp.id}/documents/${doc.id}?companyId=${companyId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed");
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Error", description: "Could not remove document.", variant: "destructive" });
    }
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const pct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const DOC_TYPE_LABELS: Record<string, string> = {
    contract: "Contract",
    id: "ID Document",
    other: "Other",
  };

  if (loading) {
    return (
      <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading onboarding data…</div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-6">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-800">Onboarding Progress</span>
          <span className="text-sm font-bold text-primary">{completedCount}/{tasks.length} tasks</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && (
          <p className="text-xs text-green-600 font-semibold mt-1.5 flex items-center gap-1">
            <CheckCircleIcon className="w-3.5 h-3.5" /> Onboarding complete!
          </p>
        )}
      </div>

      {/* Checklist */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Checklist</h3>
        <div className="space-y-2">
          {tasks.map(task => (
            <button
              key={task.id}
              onClick={() => !toggling && toggleTask(task)}
              disabled={toggling === task.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group text-left"
            >
              {task.completed
                ? <CheckSquare className="w-4.5 h-4.5 text-primary flex-shrink-0 w-5 h-5" />
                : <Square className="w-5 h-5 text-gray-300 flex-shrink-0 group-hover:text-gray-400 transition-colors" />
              }
              <span className={`text-sm flex-1 ${task.completed ? "line-through text-gray-400" : "text-gray-700"}`}>
                {task.title}
              </span>
              {task.completed && task.completedAt && (
                <span className="text-[10px] text-gray-400 flex-shrink-0">
                  {new Date(task.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {toggling === task.id && <span className="text-xs text-gray-400 flex-shrink-0">…</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Document Upload */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents</h3>
        <div className="flex items-center gap-2 mb-3">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-2 bg-white focus:outline-none focus:border-primary/50"
          >
            <option value="contract">Contract</option>
            <option value="id">ID Document</option>
            <option value="other">Other</option>
          </select>
          <Button
            size="sm"
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs"
          >
            <UploadIcon className="w-3.5 h-3.5" />
            {uploading ? "Uploading…" : "Upload File"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-gray-100 bg-gray-50">
                <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-gray-400">
                    {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType} ·{" "}
                    {new Date(doc.uploadedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <a
                  href={`/api/storage${doc.objectPath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-[10px] font-medium flex-shrink-0"
                >
                  View
                </a>
                <button
                  onClick={() => removeDocument(doc)}
                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <TrashIcon className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ContractTab ───────────────────────────────────────────────────────────────
interface ContractData {
  id?: number;
  type: string;
  startDate: string;
  endDate: string;
  rate: string;
  currency: string;
  paymentStatus: string;
  notes: string;
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  "full-time": "Full-Time",
  "part-time": "Part-Time",
  "freelance": "Freelance",
  "contractor": "Contractor",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  paid:     "bg-green-50 text-green-700 border-green-200",
  due:      "bg-amber-50 text-amber-700 border-amber-200",
  overdue:  "bg-red-50 text-red-700 border-red-200",
};

function ContractTab({ emp, companyId }: { emp: EmployeeRecord; companyId: number }) {
  const [contract, setContract] = useState<ContractData>({
    type: "full-time",
    startDate: emp.startDate ? emp.startDate.slice(0, 10) : "",
    endDate: "",
    rate: emp.salary ? String(emp.salary) : "",
    currency: emp.currency ?? "USD",
    paymentStatus: "paid",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}api/employees/${emp.id}/contract?companyId=${companyId}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setContract({
              id: data.id,
              type: data.type ?? "full-time",
              startDate: data.startDate ? data.startDate.slice(0, 10) : "",
              endDate: data.endDate ? data.endDate.slice(0, 10) : "",
              rate: data.rate ?? "",
              currency: data.currency ?? "USD",
              paymentStatus: data.paymentStatus ?? "paid",
              notes: data.notes ?? "",
            });
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [emp.id, companyId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/contract`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...contract, companyId }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setContract(prev => ({ ...prev, id: data.id }));
      toast({ title: "Contract saved" });
    } catch {
      toast({ title: "Error", description: "Could not save contract.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const daysToExpiry = contract.endDate
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / 86400000)
    : null;

  if (loading) {
    return <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading contract…</div>;
  }

  return (
    <div className="px-6 py-5 space-y-4">
      {/* Renewal warning */}
      {daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30 && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3">
          <AlertCircleIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-800">Renewal due soon</p>
            <p className="text-xs text-amber-700">
              {daysToExpiry === 0 ? "Contract expires today" : `Expires in ${daysToExpiry} day${daysToExpiry === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
      )}
      {daysToExpiry !== null && daysToExpiry < 0 && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3">
          <AlertCircleIcon className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-800">Contract has expired — please renew</p>
        </div>
      )}

      {/* Contract type */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Contract Type</label>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CONTRACT_TYPE_LABELS).map(([val, lbl]) => (
            <button
              key={val}
              onClick={() => setContract(c => ({ ...c, type: val }))}
              className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors text-left ${
                contract.type === val
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Start Date</label>
          <input
            type="date"
            value={contract.startDate}
            onChange={e => setContract(c => ({ ...c, startDate: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">End Date</label>
          <input
            type="date"
            value={contract.endDate}
            onChange={e => setContract(c => ({ ...c, endDate: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Rate + currency */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Rate / yr</label>
          <input
            type="number"
            value={contract.rate}
            onChange={e => setContract(c => ({ ...c, rate: e.target.value }))}
            placeholder="e.g. 85000"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Currency</label>
          <select
            value={contract.currency}
            onChange={e => setContract(c => ({ ...c, currency: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none"
          >
            {["USD","EUR","GBP","CAD","AUD","INR","BRL"].map(cur => (
              <option key={cur} value={cur}>{cur}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Payment status */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Payment Status</label>
        <div className="flex gap-2">
          {(["paid","due","overdue"] as const).map(s => (
            <button
              key={s}
              onClick={() => setContract(c => ({ ...c, paymentStatus: s }))}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                contract.paymentStatus === s
                  ? PAYMENT_STATUS_STYLES[s]
                  : "border-gray-200 text-gray-400 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Notes</label>
        <textarea
          value={contract.notes}
          onChange={e => setContract(c => ({ ...c, notes: e.target.value }))}
          rows={2}
          placeholder="Additional terms or comments…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
        />
      </div>

      <Button onClick={save} disabled={saving} className="w-full gap-2">
        <SaveIcon className="w-4 h-4" />
        {saving ? "Saving…" : contract.id ? "Update Contract" : "Create Contract"}
      </Button>
    </div>
  );
}

// ── AttendanceTab ─────────────────────────────────────────────────────────────
interface WorkLog {
  id: number;
  employeeId: number;
  date: string;
  hours: string;
  description: string | null;
  createdAt: string;
}

interface TimeOffRequest {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

function AttendanceTab({ emp, companyId }: { emp: EmployeeRecord; companyId: number }) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLog, setNewLog] = useState({ date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
  const [newTOR, setNewTOR] = useState({ startDate: "", endDate: "", reason: "" });
  const [addingLog, setAddingLog] = useState(false);
  const [addingTOR, setAddingTOR] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showTORForm, setShowTORForm] = useState(false);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, torRes] = await Promise.all([
        fetch(`${BASE}api/employees/${emp.id}/work-logs?companyId=${companyId}`),
        fetch(`${BASE}api/employees/${emp.id}/time-off?companyId=${companyId}`),
      ]);
      if (logRes.ok) setLogs(await logRes.json());
      if (torRes.ok) setTimeOff(await torRes.json());
    } finally {
      setLoading(false);
    }
  }, [emp.id, companyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitLog = async () => {
    if (!newLog.hours || isNaN(Number(newLog.hours))) return;
    setAddingLog(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/work-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLog, companyId }),
      });
      if (!res.ok) throw new Error("Failed");
      const log = await res.json();
      setLogs(prev => [...prev, log]);
      setNewLog({ date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
      setShowLogForm(false);
      toast({ title: "Work log added" });
    } catch {
      toast({ title: "Error", description: "Could not add log.", variant: "destructive" });
    } finally {
      setAddingLog(false);
    }
  };

  const deleteLog = async (logId: number) => {
    try {
      await fetch(`${BASE}api/employees/${emp.id}/work-logs/${logId}?companyId=${companyId}`, { method: "DELETE" });
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch {
      toast({ title: "Error", description: "Could not delete log.", variant: "destructive" });
    }
  };

  const submitTOR = async () => {
    if (!newTOR.startDate || !newTOR.endDate) return;
    setAddingTOR(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTOR, companyId }),
      });
      if (!res.ok) throw new Error("Failed");
      const tor = await res.json();
      setTimeOff(prev => [...prev, tor]);
      setNewTOR({ startDate: "", endDate: "", reason: "" });
      setShowTORForm(false);
      toast({ title: "Time-off request submitted" });
    } catch {
      toast({ title: "Error", description: "Could not submit request.", variant: "destructive" });
    } finally {
      setAddingTOR(false);
    }
  };

  const reviewTOR = async (requestId: number, status: "approved" | "rejected") => {
    setReviewing(requestId);
    try {
      const res = await fetch(`${BASE}api/time-off/${requestId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, status }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json();
      setTimeOff(prev => prev.map(r => r.id === requestId ? updated : r));
      toast({ title: status === "approved" ? "Approved" : "Rejected" });
    } catch {
      toast({ title: "Error", description: "Could not process request.", variant: "destructive" });
    } finally {
      setReviewing(null);
    }
  };

  // Monthly summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const thisMonthLogs = logs.filter(l => l.date >= monthStart && l.date <= monthEnd);
  const totalHours = thisMonthLogs.reduce((s, l) => s + Number(l.hours), 0);
  const approvedTOR = timeOff.filter(r => r.status === "approved" && r.startDate >= monthStart);
  const totalDaysOff = approvedTOR.reduce((s, r) => {
    return s + Math.max(1, Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1);
  }, 0);

  if (loading) {
    return <div className="px-6 py-10 text-center text-gray-400 text-sm">Loading attendance…</div>;
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {/* Monthly summary card */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
          <TimerIcon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-indigo-700">{totalHours.toFixed(1)}</p>
          <p className="text-xs text-indigo-500">hrs logged this month</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
          <CalendarIcon className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-700">{totalDaysOff}</p>
          <p className="text-xs text-green-500">approved days off</p>
        </div>
      </div>

      {/* Work logs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Work Logs</h3>
          <button
            onClick={() => setShowLogForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Log hours
          </button>
        </div>
        {showLogForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={newLog.date}
                onChange={e => setNewLog(l => ({ ...l, date: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <input
                type="number"
                value={newLog.hours}
                onChange={e => setNewLog(l => ({ ...l, hours: e.target.value }))}
                placeholder="Hours worked"
                min="0.5"
                max="24"
                step="0.5"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              />
            </div>
            <input
              value={newLog.description}
              onChange={e => setNewLog(l => ({ ...l, description: e.target.value }))}
              placeholder="What did you work on? (optional)"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            />
            <Button size="sm" onClick={submitLog} disabled={addingLog || !newLog.hours} className="w-full text-xs gap-1">
              <SaveIcon className="w-3 h-3" /> {addingLog ? "Saving…" : "Save Log"}
            </Button>
          </div>
        )}
        {logs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No work logs yet</p>
        ) : (
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {[...logs].reverse().map(log => (
              <div key={log.id} className="flex items-start gap-2 px-3 py-2 rounded-lg border border-gray-100 bg-white">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">{Number(log.hours)}h</span>
                    <span className="text-[10px] text-gray-400">{new Date(log.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  {log.description && <p className="text-[11px] text-gray-500 truncate">{log.description}</p>}
                </div>
                <button onClick={() => deleteLog(log.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 flex-shrink-0">
                  <TrashIcon className="w-3 h-3 text-gray-300 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Time-off requests */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time-Off Requests</h3>
          <button
            onClick={() => setShowTORForm(v => !v)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            <PlusIcon className="w-3.5 h-3.5" /> Request
          </button>
        </div>
        {showTORForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">From</label>
                <input
                  type="date"
                  value={newTOR.startDate}
                  onChange={e => setNewTOR(t => ({ ...t, startDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-0.5">To</label>
                <input
                  type="date"
                  value={newTOR.endDate}
                  onChange={e => setNewTOR(t => ({ ...t, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </div>
            <input
              value={newTOR.reason}
              onChange={e => setNewTOR(t => ({ ...t, reason: e.target.value }))}
              placeholder="Reason (optional)"
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
            />
            <Button size="sm" onClick={submitTOR} disabled={addingTOR || !newTOR.startDate || !newTOR.endDate} className="w-full text-xs gap-1">
              <SaveIcon className="w-3 h-3" /> {addingTOR ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        )}
        {timeOff.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No time-off requests yet</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {[...timeOff].reverse().map(tor => (
              <div key={tor.id} className="px-3 py-2 rounded-lg border border-gray-100 bg-white space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700 font-medium">
                      {new Date(tor.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" – "}
                      {new Date(tor.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[tor.status] ?? "bg-gray-50 text-gray-500"}`}>
                    {tor.status}
                  </span>
                </div>
                {tor.reason && <p className="text-[11px] text-gray-500 truncate">{tor.reason}</p>}
                {tor.status === "pending" && (
                  <div className="flex gap-1.5 pt-0.5">
                    <Button
                      size="sm"
                      onClick={() => reviewTOR(tor.id, "approved")}
                      disabled={reviewing === tor.id}
                      className="flex-1 h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700"
                    >
                      <ThumbsUpIcon className="w-2.5 h-2.5" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => reviewTOR(tor.id, "rejected")}
                      disabled={reviewing === tor.id}
                      className="flex-1 h-6 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <ThumbsDownIcon className="w-2.5 h-2.5" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamMemberModal({
  emp,
  companyId,
  companyName,
  onClose,
  onUpdate,
  onRemove,
  onProgressUpdate,
}: {
  emp: EmployeeRecord;
  companyId: number;
  companyName: string;
  onClose: () => void;
  onUpdate: (updated: EmployeeRecord) => void;
  onRemove: (id: number) => void;
  onProgressUpdate: (empId: number, completed: number, total: number) => void;
}) {
  const [tab, setTab] = useState<"details" | "offer" | "onboarding" | "contract" | "attendance">("details");
  const [role, setRole] = useState(emp.role);
  const [salary, setSalary] = useState(emp.salary ? String(emp.salary) : "");
  const [status, setStatus] = useState<EmployeeStatus>(emp.status);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, salary: salary ? parseInt(salary) : null, status, companyProfileId: companyId }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      onUpdate(updated);
      toast({ title: "Saved", description: "Employee record updated." });
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${emp.profile?.name ?? "this employee"} from your team?`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}?companyProfileId=${companyId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Delete failed");
      }
      onRemove(emp.id);
      onClose();
      toast({ title: "Removed", description: "Employee removed from team." });
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Could not remove employee.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  const TABS = [
    { id: "details" as const, label: "Details" },
    { id: "contract" as const, label: "Contract" },
    { id: "attendance" as const, label: "Attendance" },
    { id: "offer" as const, label: "Offer Letter" },
    { id: "onboarding" as const, label: "Onboarding" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/80 to-indigo-500/70 h-16 relative flex-shrink-0">
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Employee name row */}
        <div className="px-6 -mt-8 pb-0 flex-shrink-0">
          <div className="flex items-end gap-3 mb-3">
            <Avatar className="w-14 h-14 border-4 border-white shadow-md flex-shrink-0">
              <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="pb-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 truncate">{emp.profile?.name ?? "Unknown"}</h2>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[emp.status]}`} />
              </div>
              <p className="text-xs text-gray-500 truncate">{emp.role}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                  tab === t.id
                    ? "text-primary"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — scrollable */}
        <div className="overflow-y-auto flex-1">

          {/* ── Details tab ── */}
          {tab === "details" && (
            <div className="px-6 py-5">
              {emp.profile?.headline && <p className="text-sm text-gray-500 mb-1">{emp.profile.headline}</p>}
              {emp.profile?.location && (
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                  <MapPinIcon className="w-3 h-3" />
                  {emp.profile.location}
                </div>
              )}
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Role</label>
                  <input
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Salary / yr</label>
                    <input
                      type="number"
                      value={salary}
                      onChange={e => setSalary(e.target.value)}
                      placeholder="e.g. 85000"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
                    <select
                      value={status}
                      onChange={e => setStatus(e.target.value as EmployeeStatus)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="contractor">Contractor</option>
                      <option value="on-leave">On Leave</option>
                    </select>
                  </div>
                </div>
                {emp.startDate && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Start Date</label>
                    <p className="text-sm text-gray-700">{new Date(emp.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                )}
                {emp.job && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Hired For</label>
                    <p className="text-sm text-gray-700">{emp.job.title}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTab("offer")}
                  className="flex-1 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
                >
                  <FileTextIcon className="w-3.5 h-3.5" /> Generate Offer Letter
                </Button>
              </div>
              <div className="flex gap-2">
                <Link href={`/profiles/${emp.individualProfileId}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                    <EyeIcon className="w-3.5 h-3.5" /> View Profile
                  </Button>
                </Link>
                <Button size="sm" onClick={save} disabled={saving} className="flex-1 gap-1.5 text-xs">
                  <SaveIcon className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
                </Button>
                <Button size="sm" variant="outline" onClick={remove} disabled={removing} className="text-red-500 border-red-200 hover:bg-red-50 gap-1.5 text-xs">
                  <UserMinusIcon className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </div>
          )}

          {/* ── Contract tab ── */}
          {tab === "contract" && <ContractTab emp={emp} companyId={companyId} />}

          {/* ── Attendance tab ── */}
          {tab === "attendance" && <AttendanceTab emp={emp} companyId={companyId} />}

          {/* ── Offer Letter tab ── */}
          {tab === "offer" && <OfferLetterTab emp={emp} companyName={companyName} />}

          {/* ── Onboarding tab ── */}
          {tab === "onboarding" && (
            <OnboardingTab
              emp={emp}
              companyId={companyId}
              onProgress={(completed, total) => onProgressUpdate(emp.id, completed, total)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const { isConnected, toggleConnect } = useConnections();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [companyApps, setCompanyApps] = useState<{ status: string }[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<Record<number, { total: number; completed: number }>>({});
  const [renewals, setRenewals] = useState<Array<{ id: number; type: string; endDate: string; employee: { id: number; role: string; individualProfileId: number } | null }>>([]);
  const [pendingTimeOff, setPendingTimeOff] = useState<Array<{ id: number; startDate: string; endDate: string; reason: string | null; employee: { id: number; role: string; individualProfileId: number } | null }>>([]);
  const [monthlySummary, setMonthlySummary] = useState<Array<{ employeeId: number; role: string; hoursLogged: number; daysOff: number }>>([]);
  const [reviewingTOR, setReviewingTOR] = useState<number | null>(null);

  useEffect(() => {
    if (user && user.accountType !== "company") navigate("/feed");
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data: jobsData } = useListJobs(
    { limit: 5, offset: 0 },
    { query: { queryKey: getListJobsQueryKey({ limit: 5, offset: 0 }) } }
  );

  const { data: talentData } = useListProfiles(
    { limit: 6, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ limit: 6, offset: 0 }) } }
  );

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoadingEmployees(true);
    try {
      const [empRes, appRes, progressRes, renewalRes, torRes, summaryRes] = await Promise.all([
        fetch(`${BASE}api/employees?companyId=${user.id}`),
        fetch(`${BASE}api/companies/${user.id}/applications`),
        fetch(`${BASE}api/onboarding/progress?companyId=${user.id}`),
        fetch(`${BASE}api/companies/${user.id}/contracts/renewals`),
        fetch(`${BASE}api/companies/${user.id}/attendance/pending-time-off`),
        fetch(`${BASE}api/companies/${user.id}/attendance/monthly-summary`),
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (appRes.ok) setCompanyApps(await appRes.json());
      if (progressRes.ok) setOnboardingProgress(await progressRes.json());
      if (renewalRes.ok) setRenewals(await renewalRes.json());
      if (torRes.ok) setPendingTimeOff(await torRes.json());
      if (summaryRes.ok) setMonthlySummary(await summaryRes.json());
    } finally {
      setLoadingEmployees(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleProgressUpdate = useCallback((empId: number, completed: number, total: number) => {
    setOnboardingProgress(prev => ({ ...prev, [empId]: { total, completed } }));
  }, []);

  const handleReviewTOR = useCallback(async (requestId: number, status: "approved" | "rejected") => {
    if (!user?.id) return;
    setReviewingTOR(requestId);
    try {
      const res = await fetch(`${BASE}api/time-off/${requestId}/review`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: user.id, status }),
      });
      if (res.ok) {
        setPendingTimeOff(prev => prev.filter(r => r.id !== requestId));
      }
    } finally {
      setReviewingTOR(null);
    }
  }, [user?.id]);

  const openToWork = (talentData?.profiles ?? []).filter(p => p.openToWork && p.accountType !== "company");
  const myJobs = (jobsData?.jobs ?? []).filter(j => j.companyProfileId === user?.id);
  const recentJobs = jobsData?.jobs ?? [];

  const companyInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "CO";

  const activeCount     = employees.filter(e => e.status === "active").length;
  const contractorCount = employees.filter(e => e.status === "contractor").length;
  const avgSalary       = employees.filter(e => e.salary).length
    ? Math.round(employees.filter(e => e.salary).reduce((s, e) => s + (e.salary ?? 0), 0) / employees.filter(e => e.salary).length)
    : null;

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {/* Company hero banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-primary">{companyInitials}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name ?? "Your Company"}</h1>
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold rounded-full">Company</Badge>
              </div>
              {user?.headline && <p className="text-gray-500 text-sm mb-3">{user.headline}</p>}
              <div className="flex items-center gap-3 flex-wrap">
                <Link href={`/profiles/${user?.id}`}>
                  <Button variant="outline" size="sm" className="rounded-full border-primary/30 text-primary hover:bg-primary/5 text-xs gap-1.5">
                    <EyeIcon className="w-3.5 h-3.5" /> View Company Page
                  </Button>
                </Link>
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                    <PencilIcon className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
            <Link href="/jobs">
              <Button className="rounded-full gap-2 shadow-sm flex-shrink-0">
                <PlusCircleIcon className="w-4 h-4" /> Post a Job
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main content (2 cols) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* HR Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Headcount", value: employees.length, icon: UsersIcon, color: "text-indigo-600 bg-indigo-50" },
              { label: "Active Employees", value: activeCount, icon: UserCheckIcon, color: "text-green-600 bg-green-50" },
              { label: "Open Roles", value: myJobs.length, icon: BriefcaseIcon, color: "text-blue-600 bg-blue-50" },
              { label: "Avg Salary / yr", value: avgSalary ? `$${Math.round(avgSalary / 1000)}k` : "—", icon: DollarSignIcon, color: "text-amber-600 bg-amber-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Post a Job",       icon: PlusCircleIcon,   href: "/jobs",              color: "bg-primary text-white hover:bg-primary/90" },
                { label: "Find Talent",      icon: SearchIcon,       href: "/profiles",          color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Applications",     icon: ClipboardListIcon, href: "/applications",     color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Salary Tool",      icon: DollarSignIcon,   href: "/salary-estimator",  color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Edit Profile",     icon: PencilIcon,       href: "/profile/edit",      color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
              ].map(({ label, icon: Icon, href, color }) => (
                <Link key={label} href={href}>
                  <button className={`w-full rounded-xl px-3 py-3.5 text-sm font-semibold flex flex-col items-center gap-2 transition-colors ${color}`}>
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* My Team */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">My Team</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {employees.length === 0
                    ? "No team members yet — convert an applicant to get started"
                    : `${employees.length} member${employees.length !== 1 ? "s" : ""} · ${activeCount} active${contractorCount ? ` · ${contractorCount} contractor${contractorCount !== 1 ? "s" : ""}` : ""}`}
                </p>
              </div>
              <Link href="/applications">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                  Applications <ArrowRightIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {loadingEmployees ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading team…</div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                <UsersIcon className="w-10 h-10 opacity-25" />
                <p className="text-sm font-medium">Your team is empty</p>
                <p className="text-xs text-center max-w-xs">Accept an application and click "Convert to Employee" to add team members here.</p>
                <Link href="/applications">
                  <Button size="sm" className="rounded-full text-xs mt-1">View Applications</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {employees.map(emp => {
                  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                  const progress = onboardingProgress[emp.id];
                  const hasProgress = progress && progress.total > 0;
                  const progressPct = hasProgress ? Math.round((progress.completed / progress.total) * 100) : null;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group text-left"
                    >
                      <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{emp.profile?.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.role}</p>
                        {hasProgress && progressPct !== null && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {progressPct === 100 ? "Onboarded" : `${progress.completed}/${progress.total} onboarding`}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                        {emp.salary && (
                          <span className="text-xs text-gray-500 font-medium">
                            ${(emp.salary / 1000).toFixed(0)}k
                          </span>
                        )}
                        <Badge className={`capitalize text-[10px] font-semibold rounded-full border ${STATUS_STYLES[emp.status]}`}>
                          {emp.status === "on-leave" ? "On Leave" : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                        </Badge>
                      </div>
                      {emp.startDate && (
                        <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </div>
                      )}
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Contract Renewals */}
          {renewals.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50/60">
                <div className="flex items-center gap-2">
                  <AlertCircleIcon className="w-4 h-4 text-amber-600" />
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">Upcoming Contract Renewals</h2>
                    <p className="text-xs text-amber-600">{renewals.length} contract{renewals.length !== 1 ? "s" : ""} expiring within 30 days</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {renewals.map(renewal => {
                  const daysLeft = Math.ceil((new Date(renewal.endDate).getTime() - Date.now()) / 86400000);
                  const emp = employees.find(e => e.id === renewal.employee?.id);
                  return (
                    <div key={renewal.id} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <FileTextIcon className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{renewal.employee?.role ?? "Unknown role"}</p>
                        <p className="text-xs text-gray-500 capitalize">{CONTRACT_TYPE_LABELS[renewal.type] ?? renewal.type} · Ends {new Date(renewal.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {daysLeft === 0 ? "Today" : `${daysLeft}d`}
                        </span>
                        {emp && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedEmployee(emp)} className="text-xs h-7 px-2.5">
                            Renew
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Time-Off Approvals */}
          {pendingTimeOff.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">Pending Time-Off Requests</h2>
                  <p className="text-xs text-gray-400">{pendingTimeOff.length} awaiting your approval</p>
                </div>
                <CalendarIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-50">
                {pendingTimeOff.map(tor => {
                  const emp = employees.find(e => e.id === tor.employee?.id);
                  const days = Math.max(1, Math.round((new Date(tor.endDate).getTime() - new Date(tor.startDate).getTime()) / 86400000) + 1);
                  return (
                    <div key={tor.id} className="flex items-start gap-3 px-5 py-3.5">
                      <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={emp?.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {emp?.profile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-gray-900 truncate">{emp?.profile?.name ?? tor.employee?.role ?? "Employee"}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{days}d off</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(tor.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" – "}
                          {new Date(tor.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {tor.reason && ` · ${tor.reason}`}
                        </p>
                        <div className="flex gap-1.5 mt-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleReviewTOR(tor.id, "approved")}
                            disabled={reviewingTOR === tor.id}
                            className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700 px-2.5"
                          >
                            <ThumbsUpIcon className="w-2.5 h-2.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReviewTOR(tor.id, "rejected")}
                            disabled={reviewingTOR === tor.id}
                            className="h-6 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50 px-2.5"
                          >
                            <ThumbsDownIcon className="w-2.5 h-2.5" /> Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Attendance Summary */}
          {monthlySummary.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900 text-sm">This Month's Summary</h2>
                  <p className="text-xs text-gray-400">
                    {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} · hours logged + time off
                  </p>
                </div>
                <TimerIcon className="w-4 h-4 text-gray-400" />
              </div>
              <div className="divide-y divide-gray-50">
                {monthlySummary.map(summary => {
                  const emp = employees.find(e => e.id === summary.employeeId);
                  if (!emp) return null;
                  return (
                    <div key={summary.employeeId} className="flex items-center gap-4 px-5 py-3">
                      <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                          {emp.profile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{emp.profile?.name ?? summary.role}</p>
                        <p className="text-xs text-gray-400 truncate">{summary.role}</p>
                      </div>
                      <div className="flex items-center gap-3 text-right flex-shrink-0">
                        <div>
                          <p className="text-sm font-bold text-indigo-700">{summary.hoursLogged.toFixed(0)}h</p>
                          <p className="text-[10px] text-gray-400">logged</p>
                        </div>
                        {summary.daysOff > 0 && (
                          <div>
                            <p className="text-sm font-bold text-green-700">{summary.daysOff}d</p>
                            <p className="text-[10px] text-gray-400">off</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Jobs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Recent Platform Jobs</h2>
                <p className="text-xs text-gray-400 mt-0.5">Browse what others are hiring for</p>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                  See all <ArrowRightIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                <BriefcaseIcon className="w-10 h-10 opacity-30" />
                <p className="text-sm">No jobs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentJobs.map((job) => {
                  const salary = job.salaryMin && job.salaryMax
                    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
                    : null;
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <BuildingIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{job.title}</p>
                          <p className="text-xs text-gray-400 truncate">{job.company} · {job.location}</p>
                        </div>
                        {salary && <span className="hidden sm:block text-xs text-gray-500 font-medium flex-shrink-0">{salary}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">

          {/* Hiring funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Hiring Funnel</h2>
              <TrendingUpIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-3">
              {(() => {
                const stages = [
                  { label: "Applied",    status: "pending",   color: "bg-yellow-400" },
                  { label: "Reviewing",  status: "reviewing", color: "bg-blue-400" },
                  { label: "Interview",  status: "interview", color: "bg-purple-400" },
                  { label: "Offer Sent", status: "offer",     color: "bg-indigo-400" },
                  { label: "Hired",      status: "accepted",  color: "bg-green-500" },
                ];
                const maxCount = Math.max(...stages.map(s => companyApps.filter(a => a.status === s.status).length), 1);
                return stages.map(({ label, status, color }) => {
                  const count = companyApps.filter(a => a.status === status).length;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                      <span className="text-xs text-gray-600 flex-1">{label}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${count === 0 ? 0 : Math.max((count / maxCount) * 100, 6)}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <Link href="/applications" className="inline-flex items-center gap-0.5 mt-4 text-xs font-semibold text-primary hover:underline">
              Manage applications <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Setup checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-gray-900 text-sm">Get hiring faster</h2>
            </div>
            <div className="space-y-3">
              {[
                { done: !!user?.avatarUrl,    label: "Add a company logo" },
                { done: !!user?.headline,     label: "Write a company tagline" },
                { done: myJobs.length > 0,    label: "Post your first job" },
                { done: employees.length > 0, label: "Add a team member" },
              ].map(({ done, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "border-2 border-gray-200"}`}>
                    {done && <CheckCircleIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${done ? "line-through text-gray-400" : "text-gray-700"}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              {(() => {
                const items = [!!user?.avatarUrl, !!user?.headline, myJobs.length > 0, employees.length > 0];
                const pct = (items.filter(Boolean).length / items.length) * 100;
                return <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />;
              })()}
            </div>
          </div>

          {/* Open to Work talent */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Open to Work</h2>
                <p className="text-[10px] text-gray-400">Ready to hear from you</p>
              </div>
              <Link href="/profiles">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7 px-2">
                  All <ArrowRightIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {openToWork.slice(0, 5).map((profile) => {
                const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Link key={profile.id} href={`/profiles/${profile.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={profile.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{profile.name}</p>
                        {profile.headline && <p className="text-[11px] text-gray-400 truncate">{profile.headline}</p>}
                        {profile.location && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <MapPinIcon className="w-2.5 h-2.5 text-gray-300" />
                            <span className="text-[10px] text-gray-400">{profile.location.split(",")[0]}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isConnected(profile.id) ? "secondary" : "outline"}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleConnect(profile.id); }}
                        className={`rounded-full px-2.5 text-[10px] flex-shrink-0 hidden group-hover:flex gap-1 ${
                          isConnected(profile.id)
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "border-primary/30 text-primary hover:bg-primary/5"
                        }`}
                      >
                        {isConnected(profile.id) ? "Following" : "Connect"}
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* HR Insights Widget */}
          {user?.id && <HRInsightsWidget companyProfileId={user.id} />}

          {/* HR tip */}
          <div className="bg-gradient-to-br from-primary/5 to-indigo-100/60 rounded-xl border border-primary/15 p-5">
            <p className="text-xs font-semibold text-primary mb-1.5">HR tip</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Remote teams with structured onboarding retain employees <strong>50% longer</strong>. Open any team member and visit the Onboarding tab to track their progress.
            </p>
          </div>
        </div>
      </div>

      {/* Team member modal */}
      {selectedEmployee && (
        <TeamMemberModal
          emp={selectedEmployee}
          companyId={user?.id ?? 0}
          companyName={user?.name ?? "Our Company"}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={updated => {
            setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
            setSelectedEmployee(updated);
          }}
          onRemove={id => setEmployees(prev => prev.filter(e => e.id !== id))}
          onProgressUpdate={handleProgressUpdate}
        />
      )}
    </div>
  );
}

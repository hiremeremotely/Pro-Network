import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { DisconnectConfirmDialog } from "@/components/disconnect-confirm-dialog";
import { useEffect, useState, useCallback, useRef } from "react";
import { HRInsightsWidget } from "@/components/hr-insights-widget";
import { useQueryClient } from "@tanstack/react-query";
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
  BarChart2Icon,
  StarIcon,
  CheckIcon,
  SendIcon,
  UserPlus2Icon,
  RefreshCwIcon,
  LayoutDashboardIcon,
  GraduationCapIcon,
  Settings2Icon,
  HelpCircleIcon,
  LogOutIcon,
  MenuIcon,
  XCircleIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
} from "lucide-react";
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

interface EnrichedApplication {
  id: number;
  status: string;
  coverLetter?: string | null;
  createdAt: string;
  jobId: number;
  profileId: number;
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
  } | null;
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

interface TemplateRenderData {
  employeeName: string;
  role: string;
  salary: string;
  currency: string;
  startDate: string;
  companyName: string;
  salaryLine: string;
  date: string;
  year: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildRenderData(d: OfferData, salaryNote = " per year"): TemplateRenderData {
  return {
    employeeName: escapeHtml(d.employeeName),
    role: escapeHtml(d.role),
    salary: d.salary ? d.salary.toLocaleString() : "",
    currency: escapeHtml(d.currency),
    startDate: escapeHtml(d.startDate),
    companyName: escapeHtml(d.companyName),
    salaryLine: d.salary
      ? `${escapeHtml(d.currency)} ${d.salary.toLocaleString()}${salaryNote}`
      : "a competitive salary to be agreed upon",
    date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    year: String(new Date().getFullYear()),
  };
}

function renderTemplate(content: string, rd: TemplateRenderData): string {
  return content.replace(/\{\{(\w+)\}\}/g, (_, key) => (rd as Record<string, string>)[key] ?? `{{${key}}}`);
}

interface EditableTemplate {
  id: string;
  label: string;
  desc: string;
  color: string;
  badge: string;
  accentColor: string;
  content: string;
  isCustom?: boolean;
}

const DEFAULT_TEMPLATES: EditableTemplate[] = [
  {
    id: "full-time",
    label: "Remote Full-Time",
    desc: "Permanent salaried employment",
    color: "border-indigo-200 bg-indigo-50",
    badge: "text-indigo-700 bg-indigo-100",
    accentColor: "#6366f1",
    content: `<div style="text-align:center;border-bottom:2px solid #6366f1;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#6366f1">{{companyName}}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">{{date}}</div>
</div>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>We are pleased to extend this formal offer of employment for the position of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, effective <strong>{{startDate}}</strong>.</p>
<h3>Position Details</h3>
<ul>
  <li><strong>Title:</strong> {{role}}</li>
  <li><strong>Type:</strong> Full-Time, Remote</li>
  <li><strong>Start Date:</strong> {{startDate}}</li>
  <li><strong>Compensation:</strong> {{salaryLine}}</li>
</ul>
<h3>Employment Terms</h3>
<p>This offer is contingent upon satisfactory completion of any required background or reference checks. You will receive a comprehensive benefits package including health insurance, paid time off, and remote work allowance in accordance with our remote-first policy.</p>
<p>Please confirm your acceptance of this offer by signing and returning this letter within <strong>5 business days</strong>.</p>
<div style="margin-top:60px">
  <p>Sincerely,</p>
  <p><strong>{{companyName}}</strong></p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Accepted by: _________________________ &nbsp; Date: _____________</p>
</div>`,
  },
  {
    id: "contractor",
    label: "Contractor",
    desc: "Fixed-term contract engagement",
    color: "border-blue-200 bg-blue-50",
    badge: "text-blue-700 bg-blue-100",
    accentColor: "#3b82f6",
    content: `<div style="text-align:center;border-bottom:2px solid #3b82f6;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#3b82f6">{{companyName}}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">{{date}}</div>
</div>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>We are pleased to offer you an engagement as a <strong>Contractor</strong> for the role of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, commencing <strong>{{startDate}}</strong>.</p>
<h3>Contract Details</h3>
<ul>
  <li><strong>Role:</strong> {{role}}</li>
  <li><strong>Engagement Type:</strong> Fixed-Term Contract</li>
  <li><strong>Start Date:</strong> {{startDate}}</li>
  <li><strong>Compensation:</strong> {{salaryLine}}</li>
  <li><strong>Work Arrangement:</strong> Fully Remote</li>
</ul>
<h3>Terms &amp; Conditions</h3>
<p>As a contractor, you will retain independent status and be responsible for your own tax obligations. You will invoice {{companyName}} according to the schedule outlined in Schedule A. Either party may terminate this agreement with <strong>14 days written notice</strong>.</p>
<p>Please confirm your acceptance by signing below and returning within <strong>3 business days</strong>.</p>
<div style="margin-top:60px">
  <p>For and on behalf of <strong>{{companyName}}</strong>:</p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Contractor signature: _________________________ &nbsp; Date: _____________</p>
</div>`,
  },
  {
    id: "freelance",
    label: "Freelance",
    desc: "Project-based collaboration",
    color: "border-purple-200 bg-purple-50",
    badge: "text-purple-700 bg-purple-100",
    accentColor: "#8b5cf6",
    content: `<div style="text-align:center;border-bottom:2px solid #8b5cf6;padding-bottom:20px;margin-bottom:30px">
  <div style="font-size:26px;font-weight:bold;color:#8b5cf6">{{companyName}}</div>
  <div style="color:#666;font-size:13px;margin-top:6px">{{date}}</div>
</div>
<p>Dear <strong>{{employeeName}}</strong>,</p>
<p>We would like to engage your services on a freelance basis for the project role of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, beginning <strong>{{startDate}}</strong>.</p>
<h3>Project Details</h3>
<ul>
  <li><strong>Role:</strong> {{role}}</li>
  <li><strong>Engagement:</strong> Freelance / Project-Based</li>
  <li><strong>Estimated Start:</strong> {{startDate}}</li>
  <li><strong>Budget:</strong> {{salaryLine}}</li>
  <li><strong>Work Mode:</strong> 100% Remote</li>
</ul>
<h3>Scope &amp; Terms</h3>
<p>Deliverables and milestones will be specified in the accompanying Statement of Work. You will remain an independent contractor and retain rights to your tools and equipment. Intellectual property created specifically for this project will vest in {{companyName}} upon full payment.</p>
<p>Please acknowledge acceptance of these terms within <strong>48 hours</strong>.</p>
<div style="margin-top:60px">
  <p>Warm regards,</p>
  <p><strong>{{companyName}}</strong></p>
  <p style="margin-top:40px;border-top:1px solid #ccc;padding-top:10px">Freelancer signature: _________________________ &nbsp; Date: _____________</p>
</div>`,
  },
];

const LS_TEMPLATES_KEY = "hmr_offer_templates_v1";

function loadStoredOverrides(): Record<string, Partial<EditableTemplate>> {
  try { return JSON.parse(localStorage.getItem(LS_TEMPLATES_KEY) ?? "{}"); }
  catch { return {}; }
}

function saveStoredOverrides(o: Record<string, Partial<EditableTemplate>>) {
  localStorage.setItem(LS_TEMPLATES_KEY, JSON.stringify(o));
}

function mergeTemplates(overrides: Record<string, Partial<EditableTemplate>>): EditableTemplate[] {
  const builtIn = DEFAULT_TEMPLATES.map(t => ({ ...t, ...(overrides[t.id] ?? {}) }));
  const customs = Object.values(overrides).filter((o): o is EditableTemplate => !!(o.isCustom && o.id));
  return [...builtIn, ...customs];
}

function useOfferTemplates() {
  const [overrides, setOverrides] = useState<Record<string, Partial<EditableTemplate>>>(loadStoredOverrides);
  const templates = mergeTemplates(overrides);

  const saveTemplate = useCallback((tmpl: EditableTemplate) => {
    setOverrides(prev => {
      const next = { ...prev, [tmpl.id]: tmpl };
      saveStoredOverrides(next);
      return next;
    });
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      saveStoredOverrides(next);
      return next;
    });
  }, []);

  const resetTemplate = useCallback((id: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      saveStoredOverrides(next);
      return next;
    });
  }, []);

  return { templates, saveTemplate, deleteTemplate, resetTemplate };
}

const SAMPLE_OFFER_DATA: OfferData = {
  employeeName: "Jane Smith",
  role: "Software Engineer",
  salary: 95000,
  currency: "USD",
  startDate: "January 15, 2026",
  companyName: "Your Company",
};

function downloadOfferLetter(tmpl: EditableTemplate, data: OfferData) {
  const salaryNote = tmpl.id === "freelance" ? " (total project)" : " per year";
  const rd = buildRenderData(data, salaryNote);
  const body = renderTemplate(tmpl.content, rd);
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
  const { templates } = useOfferTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EditableTemplate | null>(null);
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
          {templates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => setSelectedTemplate(tmpl)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                selectedTemplate?.id === tmpl.id
                  ? tmpl.color + " border-current ring-1 ring-current"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{tmpl.label}</p>
                <p className="text-xs text-gray-500">{tmpl.desc}</p>
              </div>
              {selectedTemplate?.id === tmpl.id && (
                <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedTemplate && (() => {
        const rd = buildRenderData(offerData);
        const renderedBody = renderTemplate(selectedTemplate.content, rd);
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

// ── Offer Template Editor Modal ───────────────────────────────────────────────
const TEMPLATE_VARIABLES = [
  { key: "employeeName", label: "Employee Name" },
  { key: "role",         label: "Role / Title" },
  { key: "companyName",  label: "Company Name" },
  { key: "startDate",    label: "Start Date" },
  { key: "salaryLine",   label: "Salary Line" },
  { key: "date",         label: "Today's Date" },
];

function OfferTemplateEditorModal({
  template,
  onSave,
  onClose,
}: {
  template: EditableTemplate | null;
  onSave: (t: EditableTemplate) => void;
  onClose: () => void;
}) {
  const isNew = template === null;
  const defaults = isNew
    ? { id: `custom-${Date.now()}`, label: "", desc: "", color: "border-gray-200 bg-gray-50", badge: "text-gray-700 bg-gray-100", accentColor: "#6366f1", content: `<p>Dear <strong>{{employeeName}}</strong>,</p>\n<p>We are pleased to offer you the position of <strong>{{role}}</strong> at <strong>{{companyName}}</strong>, effective <strong>{{startDate}}</strong>.</p>\n<p>{{salaryLine}}</p>\n<div style="margin-top:60px"><p>Sincerely,</p><p><strong>{{companyName}}</strong></p></div>`, isCustom: true }
    : template!;

  const [label, setLabel] = useState(defaults.label);
  const [desc, setDesc] = useState(defaults.desc);
  const [content, setContent] = useState(defaults.content);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewRd = buildRenderData(SAMPLE_OFFER_DATA);
  const previewHtml = renderTemplate(content, previewRd);

  function insertVariable(key: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const token = `{{${key}}}`;
    const next = content.slice(0, start) + token + content.slice(end);
    setContent(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + token.length, start + token.length);
    });
  }

  function handleSave() {
    if (!label.trim()) return;
    onSave({ ...defaults, label: label.trim(), desc: desc.trim(), content });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isNew ? "New Template" : `Edit: ${template!.label}`}</h2>
            <p className="text-xs text-gray-400 mt-0.5">Use <code className="bg-gray-100 px-1 rounded text-[11px]">{"{{variable}}"}</code> placeholders — auto-filled when generating letters</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left: editor */}
          <div className="flex flex-col w-1/2 border-r border-gray-100 overflow-y-auto">
            <div className="px-5 py-4 space-y-4 flex-1">
              {/* Name + desc */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Template name *</label>
                  <input
                    value={label}
                    onChange={e => setLabel(e.target.value)}
                    placeholder="e.g. Senior Engineer Offer"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Short description</label>
                  <input
                    value={desc}
                    onChange={e => setDesc(e.target.value)}
                    placeholder="e.g. Full-time, equity eligible"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Variable chips */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Insert variable</label>
                <div className="flex flex-wrap gap-1.5">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      onClick={() => insertVariable(v.key)}
                      className="text-[11px] font-mono bg-primary/8 text-primary border border-primary/20 rounded px-2 py-0.5 hover:bg-primary/15 transition-colors"
                    >
                      {`{{${v.key}}}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* HTML editor */}
              <div className="flex-1">
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Letter body (HTML)</label>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={18}
                  spellCheck={false}
                  className="w-full text-xs font-mono border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed"
                  placeholder="<p>Dear <strong>{{employeeName}}</strong>, ...</p>"
                />
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div className="flex flex-col w-1/2 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Preview</p>
              <button
                onClick={() => setShowPreview(p => !p)}
                className="text-[11px] text-primary hover:underline"
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </div>
            {showPreview && (
              <div className="flex-1 overflow-y-auto p-5">
                <div
                  className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm"
                  style={{ fontFamily: "Georgia, serif", fontSize: "12px", lineHeight: "1.7", color: "#1a1a1a" }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
                <p className="text-[10px] text-gray-400 text-center mt-3">Preview uses sample data</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            disabled={!label.trim()}
            onClick={handleSave}
          >
            <SaveIcon className="w-4 h-4" />
            {isNew ? "Create Template" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Offer Letters Tab ─────────────────────────────────────────────────────────
function OfferLettersTab({ companyName }: { companyName: string }) {
  const { templates, saveTemplate, deleteTemplate, resetTemplate } = useOfferTemplates();
  const [editing, setEditing] = useState<EditableTemplate | null | "new">(undefined as unknown as "new");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const isBuiltIn = (id: string) => DEFAULT_TEMPLATES.some(t => t.id === id);

  const previewData: OfferData = {
    employeeName: "Jane Smith",
    role: "Software Engineer",
    salary: 95000,
    currency: "USD",
    startDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    companyName,
  };

  function openNew() {
    setEditing(null);
    setIsEditorOpen(true);
  }

  function openEdit(tmpl: EditableTemplate) {
    setEditing(tmpl);
    setIsEditorOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Offer Letter Templates</h2>
          <p className="text-sm text-gray-500 mt-0.5">Create and edit templates — placeholders are auto-filled when generating letters for candidates</p>
        </div>
        <Button size="sm" className="rounded-full gap-1.5 text-xs h-9 px-4" onClick={openNew}>
          <PlusIcon className="w-3.5 h-3.5" />
          New Template
        </Button>
      </div>

      {/* Variable reference */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
        <p className="text-xs font-semibold text-indigo-700 mb-2">Available placeholders</p>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_VARIABLES.map(v => (
            <span key={v.key} className="text-[11px] font-mono bg-white text-indigo-700 border border-indigo-200 rounded px-2 py-0.5">
              {`{{${v.key}}}`} <span className="text-indigo-400 font-sans">— {v.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {templates.map(tmpl => {
          const isDefault = isBuiltIn(tmpl.id) && !tmpl.isCustom;
          const isModified = isBuiltIn(tmpl.id) && !!tmpl.isCustom;
          const previewOpen = previewId === tmpl.id;
          const rd = buildRenderData(previewData, tmpl.id === "freelance" ? " (total project)" : " per year");
          const html = renderTemplate(tmpl.content, rd);

          return (
            <div key={tmpl.id} className={`rounded-xl border-2 overflow-hidden flex flex-col ${tmpl.color}`}>
              {/* Card header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileTextIcon className="w-4 h-4 flex-shrink-0 text-gray-500" />
                    <span className="text-sm font-bold text-gray-900 truncate">{tmpl.label}</span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${tmpl.badge}`}>
                    {tmpl.isCustom ? "Custom" : "Built-in"}
                  </span>
                </div>
                {tmpl.desc && <p className="text-xs text-gray-500 ml-6">{tmpl.desc}</p>}
                {isModified && (
                  <p className="text-[10px] text-amber-600 ml-6 mt-0.5 flex items-center gap-1">
                    <PencilIcon className="w-3 h-3" /> Modified
                  </p>
                )}
              </div>

              {/* Preview toggle */}
              <div className="px-4">
                <button
                  onClick={() => setPreviewId(previewOpen ? null : tmpl.id)}
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 mb-3"
                >
                  <EyeIcon className="w-3 h-3" />
                  {previewOpen ? "Hide preview" : "Preview letter"}
                </button>
                {previewOpen && (
                  <div
                    className="mb-3 max-h-48 overflow-y-auto bg-white rounded-lg border border-gray-200 p-3"
                    style={{ fontFamily: "Georgia, serif", fontSize: "11px", lineHeight: "1.6", color: "#1a1a1a" }}
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto px-4 pb-4 flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-xs h-8 rounded-lg bg-white"
                  onClick={() => openEdit(tmpl)}
                >
                  <PencilIcon className="w-3 h-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1 text-xs h-8 rounded-lg bg-white"
                  onClick={() => downloadOfferLetter(tmpl, previewData)}
                >
                  <DownloadIcon className="w-3 h-3" /> Download
                </Button>
                {tmpl.isCustom && !isBuiltIn(tmpl.id) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => deleteTemplate(tmpl.id)}
                  >
                    <TrashIcon className="w-3 h-3" />
                  </Button>
                )}
                {isModified && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-8 px-2 text-amber-600 hover:bg-amber-50"
                    onClick={() => resetTemplate(tmpl.id)}
                  >
                    <RefreshCwIcon className="w-3 h-3" /> Reset
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor modal */}
      {isEditorOpen && (
        <OfferTemplateEditorModal
          template={editing === "new" ? null : editing}
          onSave={saveTemplate}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
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

  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}/onboarding?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks ?? []);
        setDocuments(data.documents ?? []);
        const completed = (data.tasks ?? []).filter((t: OnboardingTask) => t.completed).length;
        onProgressRef.current(completed, (data.tasks ?? []).length);
      }
    } finally {
      setLoading(false);
    }
  }, [emp.id, companyId]);

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
  ratePeriod: "year" | "hour";
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
    ratePeriod: "year",
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
              ratePeriod: (data.ratePeriod === "hour" ? "hour" : "year") as "year" | "hour",
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
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Rate</label>
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-[10px] font-semibold">
              <button
                onClick={() => setContract(c => ({ ...c, ratePeriod: "year" }))}
                className={`px-2 py-0.5 transition-colors ${contract.ratePeriod === "year" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                / yr
              </button>
              <button
                onClick={() => setContract(c => ({ ...c, ratePeriod: "hour" }))}
                className={`px-2 py-0.5 border-l border-gray-200 transition-colors ${contract.ratePeriod === "hour" ? "bg-primary text-white" : "text-gray-500 hover:bg-gray-50"}`}
              >
                / hr
              </button>
            </div>
          </div>
          <input
            type="number"
            value={contract.rate}
            onChange={e => setContract(c => ({ ...c, rate: e.target.value }))}
            placeholder={contract.ratePeriod === "hour" ? "e.g. 85" : "e.g. 85000"}
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
  const approvedTOR = timeOff.filter(r =>
    r.status === "approved" && r.startDate <= monthEnd && r.endDate >= monthStart
  );
  const totalDaysOff = approvedTOR.reduce((s, r) => {
    const start = new Date(Math.max(new Date(r.startDate).getTime(), new Date(monthStart).getTime()));
    const end = new Date(Math.min(new Date(r.endDate).getTime(), new Date(monthEnd).getTime()));
    return s + Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
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
  initialTab,
}: {
  emp: EmployeeRecord;
  companyId: number;
  companyName: string;
  onClose: () => void;
  onUpdate: (updated: EmployeeRecord) => void;
  onRemove: (id: number) => void;
  onProgressUpdate: (empId: number, completed: number, total: number) => void;
  initialTab?: "details" | "offer" | "onboarding" | "contract" | "attendance";
}) {
  const [tab, setTab] = useState<"details" | "offer" | "onboarding" | "contract" | "attendance">(initialTab ?? "details");
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

// ── Candidate Offer Modal ─────────────────────────────────────────────────────
function CandidateOfferModal({
  app,
  companyName,
  onClose,
  onSent,
}: {
  app: EnrichedApplication;
  companyName: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const { templates } = useOfferTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<EditableTemplate | null>(null);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const offerData: OfferData = {
    employeeName: app.profile?.name ?? "Candidate",
    role: app.job?.title ?? "Position",
    salary: null,
    currency: "USD",
    startDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    companyName,
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    setSending(true);
    try {
      await fetch(`${BASE}api/applications/${app.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "offer", companyProfileId: app.job?.companyProfileId }),
      });
      downloadOfferLetter(selectedTemplate, offerData);
      onSent();
      toast({ title: "Offer letter sent!", description: `${offerData.employeeName} has been moved to the Offer stage.` });
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not send offer.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Send Offer Letter</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              To <span className="font-semibold text-gray-600">{offerData.employeeName}</span> for <span className="font-semibold text-gray-600">{offerData.role}</span>
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="space-y-3">
            {templates.map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                  selectedTemplate?.id === tmpl.id
                    ? tmpl.color + " border-current ring-1 ring-current"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <FileTextIcon className="w-5 h-5 flex-shrink-0 text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{tmpl.label}</p>
                  <p className="text-xs text-gray-500">{tmpl.desc}</p>
                </div>
                {selectedTemplate?.id === tmpl.id && <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />}
              </button>
            ))}
          </div>
          {selectedTemplate && (() => {
            const rd = buildRenderData(offerData);
            return (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
                </div>
                <div
                  className="max-h-40 overflow-y-auto p-4 bg-white"
                  style={{ fontFamily: "Georgia, serif", fontSize: "11px", lineHeight: "1.5", color: "#1a1a1a" }}
                  dangerouslySetInnerHTML={{ __html: renderTemplate(selectedTemplate.content, rd) }}
                />
              </div>
            );
          })()}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 rounded-xl gap-2"
            disabled={!selectedTemplate || sending}
            onClick={handleSend}
          >
            <SendIcon className="w-4 h-4" />
            {sending ? "Sending…" : "Send & Download"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Post Job Modal ────────────────────────────────────────────────────────────
const JOB_CATEGORIES = ["Engineering", "Design", "Product", "Data", "Marketing", "Sales", "Operations", "Customer Support"];
const JOB_LEVELS     = ["Entry", "Mid-level", "Senior", "Staff", "Manager", "Director"];

function PostJobModal({ companyName, companyProfileId, onClose, onCreated }: { companyName: string; companyProfileId?: number; onClose: () => void; onCreated: () => void }) {
  const BASE = import.meta.env.BASE_URL;
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: "", description: "", category: "", experienceLevel: "",
    location: "Remote", salaryMin: "", salaryMax: "", tags: "",
  });
  const [saving, setSaving] = useState(false);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.category || !form.experienceLevel) {
      toast({ title: "Missing fields", description: "Title, description, category and level are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        company: companyName,
        companyProfileId: companyProfileId ?? null,
        description: form.description.trim(),
        category: form.category,
        experienceLevel: form.experienceLevel,
        location: form.location.trim() || "Remote",
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
      };
      const res = await fetch(`${BASE}api/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to post job");
      toast({ title: "Job posted!", description: `"${body.title}" is now live.` });
      onCreated();
      onClose();
    } catch {
      toast({ title: "Error", description: "Could not post job. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Post a Job</h2>
            <p className="text-xs text-gray-400 mt-0.5">Posting as <span className="font-semibold text-gray-600">{companyName}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Job Title *</label>
            <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Category *</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" required>
                <option value="">Select…</option>
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Experience Level *</label>
              <select value={form.experienceLevel} onChange={e => set("experienceLevel", e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white" required>
                <option value="">Select…</option>
                {JOB_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Location</label>
            <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="Remote" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Salary Min (USD)</label>
              <input type="number" value={form.salaryMin} onChange={e => set("salaryMin", e.target.value)} placeholder="80000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" min={0} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Salary Max (USD)</label>
              <input type="number" value={form.salaryMax} onChange={e => set("salaryMax", e.target.value)} placeholder="120000" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" min={0} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Skills / Tags <span className="font-normal text-gray-400">(comma-separated)</span></label>
            <input value={form.tags} onChange={e => set("tags", e.target.value)} placeholder="React, TypeScript, Node.js" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Job Description *</label>
            <textarea value={form.description} onChange={e => set("description", e.target.value)} rows={5} placeholder="Describe the role, responsibilities, requirements…" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" required />
          </div>
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1 rounded-xl gap-2" disabled={saving}>
              {saving ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Posting…</> : <><PlusCircleIcon className="w-4 h-4" />Post Job</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

type DashTab = "overview" | "hiring" | "team" | "onboarding" | "insights" | "offers";

export default function CompanyDashboard() {
  const { user, logout } = useAppAuth();
  const [location, navigate] = useLocation();
  const { isConnected, isPending, sendRequest, disconnect } = useConnections();
  const [dashDisconnectTarget, setDashDisconnectTarget] = useState<{ id: number; name: string } | null>(null);
  const qc = useQueryClient();
  const [showPostJob, setShowPostJob] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTheme, setSidebarTheme] = useState<"dark" | "light">(() => (localStorage.getItem("hmr_sidebar_theme_v1") as "dark" | "light") ?? "dark");
  const [profileNudgeDismissed, setProfileNudgeDismissed] = useState(false);
  const [activeTab, setActiveTab] = useState<DashTab>("overview");
  const [offerCandidate, setOfferCandidate] = useState<EnrichedApplication | null>(null);
  const [teamFilter, setTeamFilter] = useState<"all" | EmployeeStatus>("all");
  const [teamSearch, setTeamSearch] = useState("");
  const [addingToTeam, setAddingToTeam] = useState<number | null>(null);
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [selectedEmployeeTab, setSelectedEmployeeTab] = useState<"details" | "offer" | "onboarding" | "contract" | "attendance">("details");
  const [companyApps, setCompanyApps] = useState<EnrichedApplication[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState<Record<number, { total: number; completed: number }>>({});
  const [renewals, setRenewals] = useState<Array<{ id: number; type: string; endDate: string; employee: { id: number; role: string; individualProfileId: number } | null }>>([]);
  const [pendingTimeOff, setPendingTimeOff] = useState<Array<{ id: number; startDate: string; endDate: string; reason: string | null; employee: { id: number; role: string; individualProfileId: number } | null }>>([]);
  const [monthlySummary, setMonthlySummary] = useState<Array<{ employeeId: number; role: string; hoursLogged: number; daysOff: number }>>([]);
  const [reviewingTOR, setReviewingTOR] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user && user.accountType !== "company") navigate("/feed");
    if (!user) navigate("/login");
  }, [user, navigate]);

  const companyJobsParams = { companyProfileId: user?.id ?? 0, limit: 100, offset: 0 };
  const { data: jobsData } = useListJobs(
    companyJobsParams,
    { query: { queryKey: getListJobsQueryKey(companyJobsParams), enabled: !!user?.id } }
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

  useEffect(() => { localStorage.setItem("hmr_sidebar_theme_v1", sidebarTheme); }, [sidebarTheme]);

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

  const updateAppStatus = useCallback(async (appId: number, newStatus: string) => {
    if (!user?.id) return;
    try {
      await fetch(`${BASE}api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, companyProfileId: user.id }),
      });
      setCompanyApps(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
    } catch {
      /* no-op */
    }
  }, [user?.id]);

  const handleAddToTeam = useCallback(async (app: EnrichedApplication) => {
    if (!user?.id || !app.profile) return;
    setAddingToTeam(app.id);
    try {
      const empRes = await fetch(`${BASE}api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfileId: user.id,
          individualProfileId: app.profile.id,
          jobId: app.jobId,
          role: app.job?.title ?? "Team Member",
          status: "active",
          startDate: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!empRes.ok) throw new Error("Failed to create employee");
      const newEmp: EmployeeRecord = await empRes.json();
      await fetch(`${BASE}api/applications/${app.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted", companyProfileId: user.id }),
      });
      setCompanyApps(prev => prev.map(a => a.id === app.id ? { ...a, status: "accepted" } : a));
      setEmployees(prev => {
        if (prev.find(e => e.id === newEmp.id)) return prev;
        return [...prev, newEmp];
      });
      // Trigger onboarding seed by hitting the onboarding endpoint
      await fetch(`${BASE}api/employees/${newEmp.id}/onboarding?companyId=${user.id}`);
      await fetchData();
      setSelectedEmployee(newEmp);
      setSelectedEmployeeTab("onboarding");
      setActiveTab("team");
    } catch {
      /* no-op */
    } finally {
      setAddingToTeam(null);
    }
  }, [user?.id, fetchData]);

  const handleInlineStatusChange = useCallback(async (empId: number, newStatus: EmployeeStatus) => {
    if (!user?.id) return;
    setUpdatingStatus(empId);
    try {
      const res = await fetch(`${BASE}api/employees/${empId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, companyProfileId: user.id }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated: EmployeeRecord = await res.json();
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEmployee(prev => prev?.id === updated.id ? updated : prev);
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  }, [user?.id, toast]);

  const openToWork = (talentData?.profiles ?? []).filter(p => p.openToWork && p.accountType !== "company");
  const myJobs = jobsData?.jobs ?? [];
  const recentJobs = myJobs;

  const companyInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "CO";

  const activeCount     = employees.filter(e => e.status === "active").length;
  const contractorCount = employees.filter(e => e.status === "contractor").length;
  const avgSalary       = employees.filter(e => e.salary).length
    ? Math.round(employees.filter(e => e.salary).reduce((s, e) => s + (e.salary ?? 0), 0) / employees.filter(e => e.salary).length)
    : null;
  const now = new Date();
  const newThisMonth = employees.filter(e => {
    if (!e.startDate) return false;
    const d = new Date(e.startDate);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const recentHires = [...employees].sort((a, b) => new Date(b.startDate ?? 0).getTime() - new Date(a.startDate ?? 0).getTime()).slice(0, 5);
  const pendingOffers = companyApps.filter(a => a.status === "offer").length;
  const pendingOnboarding = Object.values(onboardingProgress).filter(p => p.total > 0 && p.completed < p.total).length;
  const salaryChartData = (() => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const base = avgSalary ?? 80000;
    return months.slice(0, 6).map((m, i) => ({ month: m, salary: Math.round((base * (0.9 + i * 0.02)) / 1000) }));
  })();

  const candidatesInPipeline = companyApps.filter(a => !["accepted", "rejected", "declined"].includes(a.status)).length;
  const totalPendingActions = pendingOffers + pendingOnboarding + pendingTimeOff.length;
  const onLeaveCount = employees.filter(e => e.status === "on-leave").length;

  const teamTypeBreakdown = [
    { name: "Full-time", value: activeCount, color: "#6366f1" },
    { name: "Contractors", value: contractorCount, color: "#3b82f6" },
    { name: "On Leave", value: onLeaveCount, color: "#f59e0b" },
  ].filter(d => d.value > 0);

  const uniqueCountries = new Set(
    employees.map(e => e.profile?.location?.split(",").pop()?.trim()).filter(Boolean)
  ).size;
  const uniqueDepartments = new Set(
    employees.map(e => e.role?.split(" ").slice(0, 2).join(" ")).filter(Boolean)
  ).size;

  const upcomingEvents = (() => {
    const evts: Array<{ label: string; sub: string; date: string; dotColor: string; bg: string; border: string; text: string }> = [];
    const today = new Date();
    companyApps.filter(a => a.status === "interview").slice(0, 2).forEach(app => {
      evts.push({ label: `Interview · ${app.profile?.name ?? "Candidate"}`, sub: app.job?.title ?? "Position", date: "Scheduled", dotColor: "bg-purple-400", bg: "bg-purple-50", border: "border-purple-100", text: "text-purple-700" });
    });
    employees
      .filter(e => e.startDate && new Date(e.startDate) >= today)
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
      .slice(0, 2)
      .forEach(emp => {
        evts.push({ label: `Start Date · ${emp.profile?.name ?? emp.role}`, sub: emp.role, date: new Date(emp.startDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" }), dotColor: "bg-green-400", bg: "bg-green-50", border: "border-green-100", text: "text-green-700" });
      });
    renewals.slice(0, 2).forEach(r => {
      evts.push({ label: `Contract Renewal`, sub: r.employee?.role ?? "Employee", date: new Date(r.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }), dotColor: "bg-amber-400", bg: "bg-amber-50", border: "border-amber-100", text: "text-amber-700" });
    });
    pendingTimeOff.slice(0, 1).forEach(tor => {
      evts.push({ label: `Time-Off Request`, sub: tor.employee?.role ?? "Employee", date: new Date(tor.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }), dotColor: "bg-orange-400", bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-700" });
    });
    return evts.slice(0, 5);
  })();

  const workforceInsights = (() => {
    const ins: Array<{ text: string; good: boolean }> = [];
    const incomplete = Object.values(onboardingProgress).filter(p => p.total > 0 && p.completed < p.total).length;
    if (incomplete > 0) ins.push({ text: `${incomplete} employee${incomplete > 1 ? "s" : ""} ha${incomplete > 1 ? "ve" : "s"} incomplete onboarding.`, good: false });
    if (companyApps.length > 0) {
      const rate = Math.round((companyApps.filter(a => a.status === "accepted").length / companyApps.length) * 100);
      ins.push({ text: `Hiring conversion rate: ${rate}% (${companyApps.filter(a => a.status === "accepted").length} of ${companyApps.length} applicants hired).`, good: rate >= 20 });
    }
    if (companyApps.length > 0) {
      const advanced = companyApps.filter(a => ["interview", "offer", "accepted"].includes(a.status)).length;
      ins.push({ text: `${advanced} candidate${advanced !== 1 ? "s" : ""} advanced to interview stage or beyond.`, good: advanced > 0 });
    }
    if (renewals.length > 0) ins.push({ text: `${renewals.length} contract${renewals.length > 1 ? "s" : ""} expiring within 30 days.`, good: false });
    if (newThisMonth > 0) ins.push({ text: `${newThisMonth} new hire${newThisMonth > 1 ? "s" : ""} onboarded this month.`, good: true });
    if (pendingTimeOff.length > 0) ins.push({ text: `${pendingTimeOff.length} time-off request${pendingTimeOff.length > 1 ? "s" : ""} awaiting approval.`, good: false });
    if (ins.length === 0) ins.push({ text: "Post jobs and build your team to see workforce insights here.", good: true });
    return ins.slice(0, 5);
  })();

  const sideNav: Array<{ tab?: DashTab; href?: string; label: string; icon: React.ElementType; badge?: number }> = [
    { tab: "overview",    label: "Dashboard",      icon: LayoutDashboardIcon },
    { tab: "hiring",      label: "Hiring",         icon: BriefcaseIcon,   badge: companyApps.filter(a => a.status === "pending").length || undefined },
    { tab: "team",        label: "Team",           icon: UsersIcon,       badge: employees.length || undefined },
    { tab: "onboarding",  label: "Onboarding",     icon: GraduationCapIcon, badge: Object.values(onboardingProgress).filter(p => p.total > 0 && p.completed < p.total).length || undefined },
    { tab: "offers",      label: "Offer Letters",  icon: FileTextIcon     },
    { tab: "insights",    label: "Insights",       icon: BarChart2Icon    },
    { href: "/profile/edit", label: "Settings",    icon: Settings2Icon   },
  ];

  const dk = sidebarTheme === "dark";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Company identity */}
      <div className={`px-4 py-5 border-b ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${dk ? "bg-white/10 border border-white/15" : "bg-primary/10 border border-primary/20"}`}>
            {user?.avatarUrl
              ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              : <span className={`text-sm font-bold ${dk ? "text-white" : "text-primary"}`}>{companyInitials}</span>
            }
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold truncate leading-tight ${dk ? "text-white" : "text-gray-900"}`}>{user?.name ?? "Your Company"}</p>
            <p className={`text-[10px] truncate ${dk ? "text-white/40" : "text-gray-400"}`}>Company Hub</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {sideNav.map(({ tab, href, label, icon: Icon, badge }) => {
          const active = tab ? activeTab === tab : false;
          const handleClick = () => {
            if (tab) setActiveTab(tab);
            setSidebarOpen(false);
          };
          const inner = (
            <button
              key={label}
              onClick={handleClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? dk ? "bg-white/10 text-white" : "bg-primary text-white"
                  : dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {badge !== undefined && badge > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                  active ? "bg-white/20 text-white" : dk ? "bg-white/10 text-white/70" : "bg-primary/10 text-primary"
                }`}>
                  {badge}
                </span>
              )}
            </button>
          );
          return href ? <Link key={label} href={href}>{inner}</Link> : <div key={label}>{inner}</div>;
        })}
      </nav>

      {/* Bottom section */}
      <div className={`px-2 py-3 border-t space-y-0.5 ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
        {/* Theme toggle */}
        <button
          onClick={() => setSidebarTheme(t => t === "dark" ? "light" : "dark")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          {dk
            ? <SunIcon className="w-4 h-4 flex-shrink-0" />
            : <MoonIcon className="w-4 h-4 flex-shrink-0" />
          }
          {dk ? "Light mode" : "Dark mode"}
        </button>
        <a href="mailto:support@hiremeremotely.com">
          <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}>
            <HelpCircleIcon className="w-4 h-4 flex-shrink-0" />
            Help
          </button>
        </a>
        <button
          onClick={() => { logout(); navigate("/login"); setSidebarOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            dk ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-red-500 hover:bg-red-50 hover:text-red-600"
          }`}
        >
          <LogOutIcon className="w-4 h-4 flex-shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      <DisconnectConfirmDialog
        open={!!dashDisconnectTarget}
        profileName={dashDisconnectTarget?.name}
        onConfirm={() => { if (dashDisconnectTarget) { disconnect(dashDisconnectTarget.id); setDashDisconnectTarget(null); } }}
        onCancel={() => setDashDisconnectTarget(null)}
      />

      {/* ── Desktop sidebar ── */}
      <aside className={`hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen overflow-hidden ${dk ? "bg-[#18181b]" : "bg-white border-r border-gray-200"}`}>
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className={`absolute left-0 top-0 bottom-0 w-56 shadow-2xl flex flex-col ${dk ? "bg-[#18181b]" : "bg-white"}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
              <span className={`text-sm font-bold ${dk ? "text-white" : "text-gray-800"}`}>Menu</span>
              <button onClick={() => setSidebarOpen(false)} className={`p-1 rounded ${dk ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
                <XCircleIcon className={`w-5 h-5 ${dk ? "text-white/40" : "text-gray-400"}`} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent />
            </div>
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">

        {/* Slim topbar */}
        <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center gap-4 flex-shrink-0 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 max-w-xs hidden sm:block">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 cursor-default select-none">
              <SearchIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-400">Search jobs, candidates…</span>
              <span className="ml-auto text-[10px] border border-gray-200 rounded px-1 bg-white text-gray-400 font-mono">⌘K</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowPostJob(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusIcon className="w-3.5 h-3.5" /> Post Job
            </button>
            <button
              onClick={fetchData}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <RefreshCwIcon className="w-3.5 h-3.5" />
            </button>
            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
              <BellIcon className="w-4 h-4" />
            </button>
            <Link href={`/profiles/${user?.id}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden cursor-pointer flex-shrink-0">
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-primary">{companyInitials}</span>
                }
              </div>
            </Link>
          </div>
        </header>

      <div className="px-4 sm:px-6 py-6 space-y-5">

        {/* ── Incomplete profile nudge ── */}
        {!profileNudgeDismissed && (!user?.avatarUrl || !user?.headline || !user?.bio) && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertCircleIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Your company profile is incomplete</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Add a <strong>company logo</strong> and <strong>about text</strong> so candidates know who you are before applying.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/profile/edit">
                <button className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">
                  Complete profile →
                </button>
              </Link>
              <button
                onClick={() => setProfileNudgeDismissed(true)}
                className="p-1 rounded hover:bg-amber-100 text-amber-500 transition-colors"
                aria-label="Dismiss"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Employees",      value: employees.length,      icon: UsersIcon,         color: "text-green-600",  bg: "bg-green-50",    tab: "team",       trend: newThisMonth > 0 ? `+${newThisMonth} this month` : "on your team",      trendGood: true  },
            { label: "Open Roles",           value: myJobs.length,         icon: BriefcaseIcon,     color: "text-primary",    bg: "bg-primary/10",  tab: "hiring",     trend: myJobs.length === 0 ? "no active listings" : `${myJobs.length} active`,  trendGood: myJobs.length > 0 },
            { label: "In Pipeline",          value: candidatesInPipeline,  icon: ClipboardListIcon, color: "text-purple-600", bg: "bg-purple-50",   tab: "hiring",     trend: companyApps.filter(a=>a.status==="interview").length > 0 ? `${companyApps.filter(a=>a.status==="interview").length} in interview` : "total candidates", trendGood: candidatesInPipeline > 0 },
            { label: "Pending Actions",      value: totalPendingActions,   icon: AlertCircleIcon,   color: "text-amber-600",  bg: "bg-amber-50",    tab: "overview",   trend: totalPendingActions === 0 ? "all clear" : `${pendingOffers} offers · ${pendingOnboarding} onboarding`, trendGood: totalPendingActions === 0 },
          ].map(({ label, value, icon: Icon, color, bg, tab, trend, trendGood }) => (
            <button
              key={label}
              onClick={() => setActiveTab(tab as DashTab)}
              className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 hover:border-primary/30 hover:shadow-sm transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
                {trend && (
                  <p className={`text-[10px] mt-1 font-medium truncate ${trendGood ? "text-green-500" : "text-amber-500"}`}>{trend}</p>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* ── TAB: Overview ── */}
        {activeTab === "overview" && <>

        {/* ── Hiring Pipeline + Recent Hires ── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

          {/* Hiring Pipeline (3/4) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold text-gray-900">Hiring Pipeline</h2>
                <Link href="/applications">
                  <span className="text-xs text-primary hover:underline font-medium cursor-pointer flex items-center gap-1">
                    Manage <ArrowRightIcon className="w-3 h-3" />
                  </span>
                </Link>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={fetchData} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                </button>
                <Button size="sm" className="rounded-full text-xs h-7 px-3 gap-1.5" onClick={() => setShowPostJob(true)}>
                  <PlusIcon className="w-3 h-3" /> Post Job
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 min-h-[200px]">
              {[
                { label: "Applied",   status: "pending",   bg: "bg-yellow-50",  dot: "bg-yellow-400", btnCls: "bg-primary/10 hover:bg-primary/20 text-primary",        action: "Review" },
                { label: "Interview", status: "interview", bg: "bg-purple-50",  dot: "bg-purple-400", btnCls: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700",      action: "Send Offer" },
                { label: "Offer",     status: "offer",     bg: "bg-indigo-50",  dot: "bg-indigo-400", btnCls: "bg-green-600 hover:bg-green-700 text-white",            action: "Add to Team" },
                { label: "Hired",     status: "accepted",  bg: "bg-green-50",   dot: "bg-green-500",  btnCls: "bg-gray-50 hover:bg-gray-100 text-gray-600",            action: "View" },
              ].map(col => {
                const colApps = companyApps.filter(a => a.status === col.status);
                return (
                  <div key={col.label} className={`flex flex-col ${col.bg}/30`}>
                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                      <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                      <span className="ml-auto text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{colApps.length}</span>
                    </div>
                    <div className="flex flex-col gap-2 p-2 flex-1">
                      {colApps.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-6">
                          <p className="text-xs text-gray-300">No candidates</p>
                        </div>
                      ) : (
                        <>
                          {colApps.slice(0, 3).map(app => {
                            const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) ?? "?";
                            const isAdding = addingToTeam === app.id;
                            return (
                              <div key={app.id} className="bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm hover:border-primary/20 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                  <Avatar className="w-7 h-7 flex-shrink-0">
                                    <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 truncate">{app.profile?.name ?? "Applicant"}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{app.job?.title ?? "Position"}</p>
                                  </div>
                                </div>
                                {col.status === "accepted" ? (
                                  <Link href={`/profiles/${app.profileId}`}>
                                    <button className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}>{col.action}</button>
                                  </Link>
                                ) : col.status === "interview" ? (
                                  <button
                                    onClick={() => setOfferCandidate(app)}
                                    className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}
                                  >
                                    {col.action}
                                  </button>
                                ) : col.status === "offer" ? (
                                  <button
                                    disabled={isAdding}
                                    onClick={() => handleAddToTeam(app)}
                                    className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors disabled:opacity-60 ${col.btnCls}`}
                                  >
                                    {isAdding ? "Adding…" : col.action}
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => updateAppStatus(app.id, "interview")}
                                    className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}
                                  >
                                    {col.action}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {colApps.length > 3 && (
                            <button onClick={() => setActiveTab("hiring")} className="text-[10px] text-center text-primary font-semibold py-1 hover:underline cursor-pointer">
                              +{colApps.length - 3} more
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Hires (1/4) */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-sm text-gray-900">Recent Hires</h2>
              <UserCheckIcon className="w-4 h-4 text-primary" />
            </div>
            {recentHires.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-300 gap-2 px-4">
                <UsersIcon className="w-8 h-8" />
                <p className="text-xs text-center">No hires yet. Accept an application to add team members.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentHires.map(emp => {
                  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) ?? "?";
                  return (
                    <button key={emp.id} onClick={() => setSelectedEmployee(emp)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 group-hover:text-primary truncate">{emp.profile?.name ?? "Employee"}</p>
                        <p className="text-[10px] text-gray-400 truncate">{emp.role}</p>
                        {emp.startDate && (
                          <p className="text-[10px] text-gray-300">{new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`w-2 h-2 rounded-full inline-block ${STATUS_DOT[emp.status]}`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Onboarding Status + Team Snapshot + Upcoming Events ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Onboarding Status */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <GraduationCapIcon className="w-4 h-4 text-indigo-500" /> Onboarding Status
              </h3>
              <button onClick={() => setActiveTab("onboarding")} className="text-xs text-primary hover:underline font-medium">View all</button>
            </div>
            {employees.filter(e => onboardingProgress[e.id]?.total > 0).length === 0 ? (
              <div className="flex flex-col items-center py-8 text-gray-300 gap-2 px-4">
                <GraduationCapIcon className="w-7 h-7" />
                <p className="text-xs text-center text-gray-400">No onboarding in progress. Add team members to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {employees.filter(e => onboardingProgress[e.id]?.total > 0).slice(0, 5).map(emp => {
                  const p = onboardingProgress[emp.id];
                  const pct = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
                  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) ?? "?";
                  return (
                    <button key={emp.id} onClick={() => { setSelectedEmployee(emp); setSelectedEmployeeTab("onboarding"); setActiveTab("team"); }} className="w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <Avatar className="w-6 h-6 flex-shrink-0">
                          <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-900 truncate">{emp.profile?.name ?? emp.role}</p>
                          <span className={`text-[10px] font-bold flex-shrink-0 ${pct === 100 ? "text-green-600" : pct >= 50 ? "text-indigo-600" : "text-amber-600"}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-indigo-500" : "bg-amber-400"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{p.completed}/{p.total} tasks · {pct === 100 ? "Complete" : "In progress"}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Snapshot — donut chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4 text-primary" /> Team Snapshot
              </h3>
              <button onClick={() => setActiveTab("team")} className="text-xs text-primary hover:underline font-medium">View team</button>
            </div>
            {employees.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-gray-300 gap-2">
                <UsersIcon className="w-8 h-8" />
                <p className="text-xs text-gray-400 text-center">No team members yet.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-[88px] h-[88px] flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={teamTypeBreakdown.length > 0 ? teamTypeBreakdown : [{ name: "None", value: 1, color: "#e5e7eb" }]} cx="50%" cy="50%" innerRadius={28} outerRadius={42} dataKey="value" strokeWidth={2} stroke="#fff">
                          {(teamTypeBreakdown.length > 0 ? teamTypeBreakdown : [{ name: "None", value: 1, color: "#e5e7eb" }]).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 8px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 flex-1">
                    {teamTypeBreakdown.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                        <span className="text-xs font-bold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Headcount", value: employees.length, icon: UsersIcon, color: "text-indigo-600" },
                    { label: "Contractors", value: contractorCount, icon: BriefcaseIcon, color: "text-blue-600" },
                    { label: "Countries", value: uniqueCountries || 1, icon: MapPinIcon, color: "text-green-600" },
                    { label: "Departments", value: uniqueDepartments || 1, icon: BuildingIcon, color: "text-purple-600" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${color}`} />
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none">{value}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-green-500" /> Upcoming Events
              </h3>
              <button onClick={() => setActiveTab("hiring")} className="text-xs text-primary hover:underline font-medium">View all</button>
            </div>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2 px-4">
                <CalendarIcon className="w-7 h-7 text-gray-200" />
                <p className="text-xs text-gray-400 text-center">No upcoming events. Move candidates to interview stage or add team members with start dates.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingEvents.map((evt, i) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-3 ${evt.bg}`}>
                    <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${evt.dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{evt.label}</p>
                      <p className="text-[10px] text-gray-500 truncate">{evt.sub}</p>
                    </div>
                    <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-md border ${evt.border} ${evt.text}`}>{evt.date}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Pending Approvals + Workforce Insights ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Pending Approvals */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <AlertCircleIcon className="w-4 h-4 text-amber-500" /> Pending Approvals
              </h3>
              {totalPendingActions > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{totalPendingActions} pending</span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {/* Offer letters */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                  <FileTextIcon className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Offer Letters</p>
                  <p className="text-[10px] text-gray-500">{pendingOffers} awaiting signature</p>
                </div>
                <Link href="/applications">
                  <Button size="sm" variant={pendingOffers > 0 ? "default" : "outline"} className={`h-7 px-3 text-xs rounded-full ${pendingOffers > 0 ? "bg-primary hover:bg-primary/90" : "text-gray-400"}`} disabled={pendingOffers === 0}>
                    {pendingOffers > 0 ? "Review" : "None"}
                  </Button>
                </Link>
              </div>
              {/* Onboarding pending */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center flex-shrink-0">
                  <GraduationCapIcon className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Onboarding Tasks</p>
                  <p className="text-[10px] text-gray-500">{pendingOnboarding} employee{pendingOnboarding !== 1 ? "s" : ""} in progress</p>
                </div>
                <Button size="sm" variant={pendingOnboarding > 0 ? "default" : "outline"} disabled={pendingOnboarding === 0}
                  onClick={() => {
                    const emp = employees.find(e => { const p = onboardingProgress[e.id]; return p && p.total > 0 && p.completed < p.total; });
                    if (emp) { setSelectedEmployee(emp); setSelectedEmployeeTab("onboarding"); setActiveTab("team"); }
                  }}
                  className={`h-7 px-3 text-xs rounded-full ${pendingOnboarding > 0 ? "bg-primary hover:bg-primary/90" : "text-gray-400"}`}>
                  {pendingOnboarding > 0 ? "Review" : "None"}
                </Button>
              </div>
              {/* Time-off requests */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Time-Off Requests</p>
                  <p className="text-[10px] text-gray-500">{pendingTimeOff.length} awaiting approval</p>
                </div>
                <Button size="sm" variant={pendingTimeOff.length > 0 ? "default" : "outline"} disabled={pendingTimeOff.length === 0}
                  onClick={() => setActiveTab("team")}
                  className={`h-7 px-3 text-xs rounded-full ${pendingTimeOff.length > 0 ? "bg-primary hover:bg-primary/90" : "text-gray-400"}`}>
                  {pendingTimeOff.length > 0 ? "Review" : "None"}
                </Button>
              </div>
              {/* Contract renewals */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center flex-shrink-0">
                  <FileIcon className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">Contract Renewals</p>
                  <p className="text-[10px] text-gray-500">{renewals.length} expiring soon</p>
                </div>
                <Button size="sm" variant={renewals.length > 0 ? "default" : "outline"} disabled={renewals.length === 0}
                  onClick={() => setActiveTab("team")}
                  className={`h-7 px-3 text-xs rounded-full ${renewals.length > 0 ? "bg-primary hover:bg-primary/90" : "text-gray-400"}`}>
                  {renewals.length > 0 ? "Review" : "None"}
                </Button>
              </div>
              {/* New applicants */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center flex-shrink-0">
                  <UserPlus2Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900">New Applications</p>
                  <p className="text-[10px] text-gray-500">{companyApps.filter(a => a.status === "pending").length} unreviewed</p>
                </div>
                <Link href="/applications">
                  <Button size="sm" variant={companyApps.filter(a => a.status === "pending").length > 0 ? "default" : "outline"}
                    disabled={companyApps.filter(a => a.status === "pending").length === 0}
                    className={`h-7 px-3 text-xs rounded-full ${companyApps.filter(a => a.status === "pending").length > 0 ? "bg-primary hover:bg-primary/90" : "text-gray-400"}`}>
                    {companyApps.filter(a => a.status === "pending").length > 0 ? "Review" : "None"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Workforce Insights */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
              <h3 className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                <BarChart2Icon className="w-4 h-4 text-primary" /> Workforce Insights
              </h3>
              <button onClick={() => setActiveTab("insights")} className="text-xs text-primary hover:underline font-medium">Full report</button>
            </div>
            <div className="divide-y divide-gray-50">
              {workforceInsights.map((ins, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${ins.good ? "bg-green-100" : "bg-amber-100"}`}>
                    {ins.good
                      ? <CheckIcon className="w-3 h-3 text-green-600" />
                      : <AlertCircleIcon className="w-3 h-3 text-amber-600" />
                    }
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{ins.text}</p>
                </div>
              ))}
            </div>
            {/* Mini salary chart */}
            {avgSalary && (
              <div className="px-5 pt-3 pb-4 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wide">Avg Salary Trend ($k)</p>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salaryChartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e5e7eb", padding: "4px 8px" }} formatter={(v: number) => [`$${v}k`, "Avg"]} />
                      <Line type="monotone" dataKey="salary" stroke="#6366f1" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Team List + Sidebar ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">

          {/* Team List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Team List</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {employees.length === 0
                    ? "No team members yet"
                    : `${employees.length} member${employees.length !== 1 ? "s" : ""} · ${activeCount} active${contractorCount ? ` · ${contractorCount} contractor${contractorCount !== 1 ? "s" : ""}` : ""}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex gap-1">
                  {["All", "Active", "Contractor"].map(f => (
                    <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 cursor-default font-medium">{f}</span>
                  ))}
                </div>
                <Link href="/applications">
                  <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7">
                    + Add <ArrowRightIcon className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
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
              <>
                {/* Table header */}
                <div className="hidden sm:grid grid-cols-[auto_1fr_120px_100px_90px_80px_36px] gap-3 px-5 py-2.5 bg-gray-50/70 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                  <span />
                  <span>Name</span>
                  <span>Role</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span>Start</span>
                  <span />
                </div>
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
                        className="w-full sm:grid grid-cols-[auto_1fr_120px_100px_90px_80px_36px] flex flex-wrap gap-2 items-center px-5 py-3 hover:bg-gray-50 transition-colors cursor-pointer group text-left"
                      >
                        <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                          <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{emp.profile?.name ?? "Unknown"}</p>
                          {hasProgress && progressPct !== null && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-12 h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className={`h-full rounded-full ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${progressPct}%` }} />
                              </div>
                              <span className="text-[10px] text-gray-400">{progressPct === 100 ? "Onboarded" : `${progressPct}%`}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 truncate hidden sm:block">{emp.role}</span>
                        <span className="hidden sm:block">
                          <Badge className={`capitalize text-[10px] font-semibold rounded-full border ${STATUS_STYLES[emp.status]}`}>
                            {emp.status === "on-leave" ? "On Leave" : emp.status === "contractor" ? "Contractor" : "Full-Time"}
                          </Badge>
                        </span>
                        <span className="hidden sm:flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${STATUS_DOT[emp.status]}`} />
                          <span className="text-xs text-gray-500">{emp.status === "active" ? "Active" : emp.status === "contractor" ? "Active" : "On Leave"}</span>
                        </span>
                        <span className="hidden sm:block text-xs text-gray-400">
                          {emp.startDate ? new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                        </span>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 ml-auto" />
                      </button>
                    );
                  })}
                </div>
              </>
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

          {/* Market Insights — fills empty space below team list */}
          {user?.id && <HRInsightsWidget companyProfileId={user.id} />}

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

          </div>

          {/* ── Right Sidebar ── */}
          <div className="space-y-5">

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Quick Actions</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Post Job",     icon: PlusCircleIcon,    onClick: () => setShowPostJob(true), href: null,               color: "bg-primary text-white hover:bg-primary/90" },
                  { label: "Find Talent",  icon: SearchIcon,        onClick: null, href: "/profiles",           color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                  { label: "Applications", icon: ClipboardListIcon, onClick: null, href: "/applications",       color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                  { label: "Salary",       icon: DollarSignIcon,    onClick: null, href: "/salary-estimator",   color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                  { label: "Analytics",   icon: BarChart2Icon,     onClick: null, href: "/analytics",           color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                  { label: "Edit Profile", icon: PencilIcon,        onClick: null, href: "/profile/edit",       color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                ].map(({ label, icon: Icon, href, onClick, color }) => {
                  const btn = (
                    <button key={label} onClick={onClick ?? undefined} className={`w-full rounded-xl px-2 py-3 text-xs font-semibold flex flex-col items-center gap-1.5 transition-colors ${color}`}>
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                  return href ? <Link key={label} href={href}>{btn}</Link> : btn;
                })}
              </div>
            </div>

            {/* Setup checklist */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-gray-900 text-sm">Get hiring faster</h2>
              </div>
              <div className="space-y-2.5">
                {[
                  { done: !!user?.avatarUrl,    label: "Add a company logo" },
                  { done: !!user?.headline,     label: "Write a company tagline" },
                  { done: myJobs.length > 0,    label: "Post your first job" },
                  { done: employees.length > 0, label: "Add a team member" },
                ].map(({ done, label }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "border-2 border-gray-200"}`}>
                      {done && <CheckIcon className="w-3 h-3 text-white" />}
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
                        </div>
                        <Button
                          size="sm"
                          variant={isConnected(profile.id) ? "secondary" : "outline"}
                          onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            if (isConnected(profile.id)) setDashDisconnectTarget({ id: profile.id, name: profile.name });
                            else if (isPending(profile.id)) void 0;
                            else sendRequest(profile.id, "");
                          }}
                          className="rounded-full px-2.5 text-[10px] flex-shrink-0 hidden group-hover:flex gap-1 border-primary/30 text-primary hover:bg-primary/5"
                        >
                          {isConnected(profile.id) ? "Connected" : isPending(profile.id) ? "Pending" : "Connect"}
                        </Button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>


          </div>
        </div>

        </> /* end overview tab */}

        {/* ── TAB: Hiring ── */}
        {activeTab === "hiring" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h2 className="font-semibold text-gray-900">Hiring Pipeline</h2>
                  <span className="text-xs text-gray-400">{companyApps.length} total applicant{companyApps.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={fetchData} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                    <RefreshCwIcon className="w-3.5 h-3.5" />
                  </button>
                  <Button size="sm" className="rounded-full text-xs h-7 px-3 gap-1.5" onClick={() => setShowPostJob(true)}>
                    <PlusIcon className="w-3 h-3" /> Post Job
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 min-h-[300px]">
                {[
                  { label: "Applied",   status: "pending",   bg: "bg-yellow-50",  dot: "bg-yellow-400", btnCls: "bg-primary/10 hover:bg-primary/20 text-primary",   action: "Review" },
                  { label: "Interview", status: "interview", bg: "bg-purple-50",  dot: "bg-purple-400", btnCls: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700", action: "Send Offer" },
                  { label: "Offer",     status: "offer",     bg: "bg-indigo-50",  dot: "bg-indigo-400", btnCls: "bg-green-600 hover:bg-green-700 text-white",       action: "Add to Team" },
                  { label: "Hired",     status: "accepted",  bg: "bg-green-50",   dot: "bg-green-500",  btnCls: "bg-gray-50 hover:bg-gray-100 text-gray-600",       action: "View" },
                ].map(col => {
                  const colApps = companyApps.filter(a => a.status === col.status);
                  return (
                    <div key={col.label} className={`flex flex-col ${col.bg}/30`}>
                      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                        <span className="ml-auto text-xs font-bold text-gray-500 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 min-w-[20px] text-center">{colApps.length}</span>
                      </div>
                      <div className="flex flex-col gap-2 p-2 flex-1">
                        {colApps.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center py-8">
                            <p className="text-xs text-gray-300">No candidates</p>
                          </div>
                        ) : colApps.map(app => {
                          const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0,2) ?? "?";
                          const isAdding = addingToTeam === app.id;
                          return (
                            <div key={app.id} className="bg-white rounded-lg border border-gray-100 p-2.5 shadow-sm hover:border-primary/20 transition-colors">
                              <div className="flex items-center gap-2 mb-2">
                                <Avatar className="w-7 h-7 flex-shrink-0">
                                  <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                                  <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">{app.profile?.name ?? "Applicant"}</p>
                                  <p className="text-[10px] text-gray-400 truncate">{app.job?.title ?? "Position"}</p>
                                </div>
                              </div>
                              {col.status === "accepted" ? (
                                <Link href={`/profiles/${app.profileId}`}>
                                  <button className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}>{col.action}</button>
                                </Link>
                              ) : col.status === "interview" ? (
                                <button onClick={() => setOfferCandidate(app)} className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}>{col.action}</button>
                              ) : col.status === "offer" ? (
                                <button disabled={isAdding} onClick={() => handleAddToTeam(app)} className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors disabled:opacity-60 ${col.btnCls}`}>{isAdding ? "Adding…" : col.action}</button>
                              ) : (
                                <button onClick={() => updateAppStatus(app.id, "interview")} className={`w-full text-[10px] font-semibold py-1 rounded-md transition-colors ${col.btnCls}`}>{col.action}</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: Team ── */}
        {activeTab === "team" && (
          <div className="space-y-5">
            {/* Search + Filter bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px]">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Search team members…"
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(["all", "active", "contractor", "on-leave"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setTeamFilter(f)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors capitalize ${
                      teamFilter === f
                        ? "bg-primary text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f === "all" ? "All" : f === "on-leave" ? "On Leave" : f === "contractor" ? "Contractor" : "Active"}
                  </button>
                ))}
              </div>
              <Button size="sm" className="rounded-full text-xs h-8 px-3 gap-1.5 ml-auto" onClick={() => setActiveTab("hiring")}>
                <PlusIcon className="w-3 h-3" /> Hire via Pipeline
              </Button>
            </div>

            {/* Team table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {loadingEmployees ? (
                <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading team…</div>
              ) : (() => {
                const filtered = employees.filter(emp => {
                  const matchFilter = teamFilter === "all" || emp.status === teamFilter;
                  const matchSearch = !teamSearch || (emp.profile?.name ?? "").toLowerCase().includes(teamSearch.toLowerCase()) || emp.role.toLowerCase().includes(teamSearch.toLowerCase());
                  return matchFilter && matchSearch;
                });
                if (filtered.length === 0) return (
                  <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
                    <UsersIcon className="w-10 h-10 opacity-25" />
                    <p className="text-sm font-medium">{employees.length === 0 ? "Your team is empty" : "No matches found"}</p>
                    {employees.length === 0 && <Button size="sm" className="rounded-full text-xs mt-1" onClick={() => setActiveTab("hiring")}>Start Hiring</Button>}
                  </div>
                );
                return (
                  <>
                    <div className="hidden sm:grid grid-cols-[auto_1fr_140px_130px_100px_80px_36px] gap-3 px-5 py-2.5 bg-gray-50/70 border-b border-gray-100 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                      <span /><span>Name</span><span>Role</span><span>Type</span><span>Status</span><span>Start</span><span />
                    </div>
                    <div className="divide-y divide-gray-50">
                      {filtered.map(emp => {
                        const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                        const progress = onboardingProgress[emp.id];
                        const hasProgress = progress && progress.total > 0;
                        const progressPct = hasProgress ? Math.round((progress.completed / progress.total) * 100) : null;
                        return (
                          <div
                            key={emp.id}
                            onClick={() => { setSelectedEmployee(emp); setSelectedEmployeeTab("details"); }}
                            className="w-full sm:grid grid-cols-[auto_1fr_140px_130px_100px_80px_36px] flex flex-wrap gap-2 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group"
                          >
                            <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                              <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{emp.profile?.name ?? "Unknown"}</p>
                              {hasProgress && progressPct !== null && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="w-14 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div className={`h-full rounded-full ${progressPct === 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${progressPct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-gray-400">{progressPct === 100 ? "Onboarded ✓" : `${progressPct}% onboarded`}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-gray-600 truncate hidden sm:block">{emp.role}</span>
                            {/* Inline status toggle — stopPropagation so row click still opens drawer */}
                            <span className="hidden sm:block" onClick={e => e.stopPropagation()}>
                              <select
                                value={emp.status}
                                disabled={updatingStatus === emp.id}
                                onChange={e => { void handleInlineStatusChange(emp.id, e.target.value as EmployeeStatus); }}
                                className={`text-[11px] font-semibold rounded-full border px-2.5 py-1 cursor-pointer appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${STATUS_STYLES[emp.status]}`}
                              >
                                <option value="active">Full-Time</option>
                                <option value="contractor">Contractor</option>
                                <option value="on-leave">On Leave</option>
                              </select>
                            </span>
                            <span className="hidden sm:flex items-center gap-1">
                              <span className={`w-2 h-2 rounded-full ${STATUS_DOT[emp.status]}`} />
                              <span className="text-xs text-gray-500">{emp.status === "active" ? "Active" : emp.status === "contractor" ? "Active" : "On Leave"}</span>
                            </span>
                            <span className="hidden sm:block text-xs text-gray-400">
                              {emp.startDate ? new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : "—"}
                            </span>
                            <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0 ml-auto" />
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Contract renewals */}
            {renewals.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-100 bg-amber-50/60">
                  <AlertCircleIcon className="w-4 h-4 text-amber-600" />
                  <div>
                    <h2 className="font-semibold text-gray-900 text-sm">Upcoming Contract Renewals</h2>
                    <p className="text-xs text-amber-600">{renewals.length} contract{renewals.length !== 1 ? "s" : ""} expiring within 30 days</p>
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
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{daysLeft === 0 ? "Today" : `${daysLeft}d`}</span>
                          {emp && <Button size="sm" variant="outline" onClick={() => { setSelectedEmployee(emp); setSelectedEmployeeTab("contract"); }} className="text-xs h-7 px-2.5">Renew</Button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Onboarding ── */}
        {activeTab === "onboarding" && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-semibold text-gray-900">Onboarding Tracker</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Track each new hire's onboarding checklist</p>
                </div>
                <button onClick={fetchData} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
                  <RefreshCwIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {employees.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-3 text-gray-400">
                  <GraduationCapIcon className="w-10 h-10 opacity-25" />
                  <p className="text-sm font-medium">No team members yet</p>
                  <Button size="sm" className="rounded-full text-xs mt-1" onClick={() => setActiveTab("hiring")}>Start Hiring</Button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {employees.map(emp => {
                    const progress = onboardingProgress[emp.id];
                    const total = progress?.total ?? 0;
                    const completed = progress?.completed ?? 0;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                    return (
                      <button
                        key={emp.id}
                        onClick={() => { setSelectedEmployee(emp); setSelectedEmployeeTab("onboarding"); }}
                        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors text-left group"
                      >
                        <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0">
                          <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{emp.profile?.name ?? "Unknown"}</p>
                          <p className="text-xs text-gray-400 truncate">{emp.role}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 max-w-[160px] h-2 rounded-full bg-gray-100 overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 font-medium flex-shrink-0">
                              {total === 0 ? "No tasks" : pct === 100 ? "✓ Complete" : `${completed}/${total} tasks`}
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {pct === 100
                            ? <span className="text-xs font-bold text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">Done</span>
                            : <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${total > 0 ? "text-amber-700 bg-amber-50 border border-amber-200" : "text-gray-400 bg-gray-50 border border-gray-200"}`}>{total > 0 ? `${pct}%` : "Pending"}</span>
                          }
                        </div>
                        <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pending time off */}
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
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{emp?.profile?.name?.split(" ").map(n => n[0]).join("").slice(0, 2) ?? "?"}</AvatarFallback>
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
                            <Button size="sm" onClick={() => handleReviewTOR(tor.id, "approved")} disabled={reviewingTOR === tor.id} className="h-6 text-[10px] gap-1 bg-green-600 hover:bg-green-700 px-2.5">
                              <ThumbsUpIcon className="w-2.5 h-2.5" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReviewTOR(tor.id, "rejected")} disabled={reviewingTOR === tor.id} className="h-6 text-[10px] gap-1 text-red-600 border-red-200 hover:bg-red-50 px-2.5">
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
          </div>
        )}

        {/* ── TAB: Offer Letters ── */}
        {activeTab === "offers" && (
          <OfferLettersTab companyName={user?.name ?? "Our Company"} />
        )}

        {/* ── TAB: Insights ── */}
        {activeTab === "insights" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart2Icon className="w-4 h-4 text-primary" /> Salary Trends
                </h2>
                <Link href="/salary-estimator">
                  <span className="text-xs text-primary hover:underline font-medium cursor-pointer flex items-center gap-1">
                    Full Estimator <ArrowRightIcon className="w-3 h-3" />
                  </span>
                </Link>
              </div>
              <p className="text-[11px] text-gray-400 mb-3 font-medium uppercase tracking-wide">Average Salary ($k) · Last 6 months</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salaryChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", padding: "6px 10px" }} formatter={(v: number) => [`$${v}k`, "Avg Salary"]} />
                    <Line type="monotone" dataKey="salary" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-gray-900 mb-3">Team Snapshot</h3>
                <div className="space-y-2">
                  {[
                    { label: "Total Headcount", value: employees.length, color: "text-gray-900" },
                    { label: "Active",          value: activeCount,       color: "text-green-600" },
                    { label: "Contractors",     value: contractorCount,   color: "text-blue-600" },
                    { label: "On Leave",        value: employees.filter(e => e.status === "on-leave").length, color: "text-orange-600" },
                    { label: "Fully Onboarded", value: Object.values(onboardingProgress).filter(p => p.total > 0 && p.completed === p.total).length, color: "text-primary" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className={`text-sm font-bold ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-sm text-gray-900 mb-3">Pipeline Health</h3>
                <div className="space-y-2">
                  {[
                    { label: "Total Applicants", value: companyApps.length },
                    { label: "In Interview",     value: companyApps.filter(a => a.status === "interview").length },
                    { label: "Offers Sent",      value: companyApps.filter(a => a.status === "offer").length },
                    { label: "Hired",            value: companyApps.filter(a => a.status === "accepted").length },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-sm font-bold text-gray-900">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Salary Estimator CTA */}
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl p-5 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <BarChart2Icon className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm">Salary Estimator</h3>
                </div>
                <p className="text-xs text-indigo-200 mb-4 leading-relaxed">
                  Benchmark compensation for any role. Get market rates by title, location, and experience.
                </p>
                <Link href="/salary-estimator">
                  <Button size="sm" className="w-full bg-white text-indigo-700 hover:bg-indigo-50 font-semibold text-xs h-8 rounded-lg gap-1.5">
                    Open Estimator <ArrowRightIcon className="w-3 h-3" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
      </div>
      {/* end: flex-1 min-w-0 main content */}

      {/* Post job modal */}
      {showPostJob && (
        <PostJobModal
          companyName={user?.name ?? "Our Company"}
          companyProfileId={user?.id}
          onClose={() => setShowPostJob(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: getListJobsQueryKey(companyJobsParams) })}
        />
      )}

      {/* Candidate offer modal */}
      {offerCandidate && (
        <CandidateOfferModal
          app={offerCandidate}
          companyName={user?.name ?? "Our Company"}
          onClose={() => setOfferCandidate(null)}
          onSent={() => setCompanyApps(prev => prev.map(a => a.id === offerCandidate.id ? { ...a, status: "offer" } : a))}
        />
      )}

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
          initialTab={selectedEmployeeTab}
        />
      )}
    </div>
  );
}

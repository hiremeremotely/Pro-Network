import React from "react";
import {
  UserCircleIcon, BuildingIcon, ShieldCheckIcon,
  ArrowRightIcon, CheckCircle2Icon, XCircleIcon,
  LockIcon, MessageSquareIcon, SearchIcon,
  FileTextIcon, SendIcon, UserIcon, ShieldIcon,
  LinkedinIcon, Globe2Icon, BriefcaseBusinessIcon,
  DatabaseIcon, EyeOffIcon, CheckIcon
} from "lucide-react";

export default function FlowOverview() {
  return (
    <div className="min-h-screen bg-[#f4f5f8] p-6 font-sans text-slate-900 overflow-hidden">
      <div className="max-w-[1320px] mx-auto space-y-4">
        <header className="flex items-start justify-between gap-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-700">
              <ShieldCheckIcon size={15} /> HMR stays in the middle
            </div>
            <h1 className="text-2xl font-bold tracking-tight">One professional hub. Controlled introductions.</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              External profiles become one verified HMR record. Businesses discover fit without identity; HMR mediates the request and releases details only after consent.
            </p>
          </div>
          <div className="flex max-w-[410px] flex-wrap justify-end gap-x-4 gap-y-2 pt-1 text-[11px] font-medium">
            {(["Current", "Lightly adjusted", "Significantly changed", "New"] as const).map((label) => (
              <div key={label} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className={`h-2.5 w-2.5 rounded-full ${label === "Current" ? "bg-slate-300" : label === "Lightly adjusted" ? "bg-blue-300" : label === "Significantly changed" ? "bg-indigo-400" : "bg-violet-600"}`} />
                {label}
              </div>
            ))}
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">1 · How the professional hub is created</h2>
              <p className="text-[11px] text-slate-500">Import once, normalize in HMR, then let the professional choose what leaves the hub.</p>
            </div>
            <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700">New hub model</span>
          </div>
          <div className="grid grid-cols-[1fr_34px_1.35fr_34px_1fr] items-center gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Source label="LinkedIn" icon={<LinkedinIcon size={15} />} />
              <Source label="Behance" icon={<Globe2Icon size={15} />} />
              <Source label="GitHub / site" icon={<BriefcaseBusinessIcon size={15} />} />
              <Source label="CV / email" icon={<FileTextIcon size={15} />} />
            </div>
            <ArrowRightIcon className="mx-auto text-violet-400" />
            <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3">
              <div className="flex items-center gap-2 text-sm font-bold text-violet-950"><DatabaseIcon size={17} /> HMR Professional Hub</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                <MiniPill text="Identity" />
                <MiniPill text="Proof of work" />
                <MiniPill text="Experience" />
              </div>
              <p className="mt-2 text-[10px] leading-snug text-violet-800">Deduplicated, verified, and edited by the professional. HMR can see the full record to mediate safely.</p>
            </div>
            <ArrowRightIcon className="mx-auto text-violet-400" />
            <div className="space-y-2">
              <PrivacyRow label="Public / anonymized" tone="public" />
              <PrivacyRow label="HMR only" tone="hmr" />
              <PrivacyRow label="Private until approved" tone="private" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">2 · What each role sees</h2>
              <p className="text-[11px] text-slate-500">The same hub powers three different surfaces. HMR is the trusted boundary, not a hidden handoff.</p>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"><EyeOffIcon size={14} /> Identity stays masked before consent</div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <RoleCard title="Professional" tone="blue" icon={<UserCircleIcon size={17} />} copy="Controls every field, sees the complete request, and decides whether contact details are released." items={["Edit one centralized profile", "Set field + portfolio visibility", "Approve or decline"]} />
            <RoleCard title="Business" tone="indigo" icon={<BuildingIcon size={17} />} copy="Searches fit and proof of work, but cannot see name, contact info, or current employer before approval." items={["Redacted discovery", "Structured Express Interest", "Pending / approved / declined"]} />
            <RoleCard title="HMR Operator" tone="violet" icon={<ShieldCheckIcon size={17} />} copy="Reviews fit and safety, routes requests, and keeps an auditable record of every visibility change." items={["Mediation queue", "Consent + release audit", "Controlled chat opening"]} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">3 · The mediated introduction</h2>
              <p className="text-[11px] text-slate-500">Happy path and privacy-preserving decline, shown together.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">Revenue moment: mediated connection</span>
          </div>
          <div className="grid grid-cols-[1fr_32px_1fr_32px_1fr_32px_1fr] items-stretch gap-2">
            <Step title="Redacted search" desc="Business finds anonymized fit" status="Significantly changed" icon={<SearchIcon size={16} />} />
            <ArrowRightIcon className="my-auto text-slate-300" />
            <Step title="Express Interest" desc="HMR checks and routes request" status="New" icon={<SendIcon size={16} />} />
            <ArrowRightIcon className="my-auto text-slate-300" />
            <Step title="Professional decides" desc="Approve to release, decline to stay private" status="New" icon={<CheckCircle2Icon size={16} />} />
            <ArrowRightIcon className="my-auto text-slate-300" />
            <div className="grid grid-rows-2 gap-2">
              <Outcome icon={<MessageSquareIcon size={15} />} title="Approved → chat opens" tone="green" />
              <Outcome icon={<XCircleIcon size={15} />} title="Declined → identity remains hidden" tone="red" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Source({ label, icon }: { label: string; icon: React.ReactNode }) {
  return <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700">{icon}<span>{label}</span><CheckIcon size={13} className="ml-auto text-emerald-500" /></div>;
}

function MiniPill({ text }: { text: string }) {
  return <span className="rounded-md bg-white px-2 py-1 text-center font-semibold text-violet-700 shadow-sm">{text}</span>;
}

function PrivacyRow({ label, tone }: { label: string; tone: "public" | "hmr" | "private" }) {
  const styles = { public: "border-emerald-200 bg-emerald-50 text-emerald-800", hmr: "border-violet-200 bg-violet-50 text-violet-800", private: "border-slate-200 bg-slate-50 text-slate-700" };
  const Icon = tone === "public" ? Globe2Icon : tone === "hmr" ? ShieldCheckIcon : LockIcon;
  return <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${styles[tone]}`}><Icon size={14} /><span>{label}</span></div>;
}

function RoleCard({ title, tone, icon, copy, items }: { title: string; tone: "blue" | "indigo" | "violet"; icon: React.ReactNode; copy: string; items: string[] }) {
  const styles = { blue: "border-blue-200 bg-blue-50/50 text-blue-900", indigo: "border-indigo-200 bg-indigo-50/50 text-indigo-900", violet: "border-violet-200 bg-violet-50/50 text-violet-900" };
  return <div className={`rounded-xl border p-3 ${styles[tone]}`}><div className="flex items-center gap-2 text-sm font-bold">{icon}{title}</div><p className="mt-2 min-h-[39px] text-[10px] leading-snug opacity-80">{copy}</p><div className="mt-2 space-y-1">{items.map(item => <div key={item} className="flex items-center gap-1.5 text-[10px] font-semibold"><CheckCircle2Icon size={12} />{item}</div>)}</div></div>;
}

function Outcome({ icon, title, tone }: { icon: React.ReactNode; title: string; tone: "green" | "red" }) {
  return <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-bold ${tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>{icon}{title}</div>;
}

function Step({ title, desc, status, icon, compact = false }: { title: string, desc: string, status: 'Current' | 'Lightly adjusted' | 'Significantly changed' | 'New', icon: React.ReactNode, compact?: boolean }) {
  const statusColors = {
    'Current': "border-slate-200 bg-white",
    'Lightly adjusted': "border-blue-200 bg-blue-50/30",
    'Significantly changed': "border-indigo-300 bg-indigo-50/50",
    'New': "border-violet-400 bg-violet-50",
  };
  
  const statusBadge = {
    'Current': "bg-slate-100 text-slate-600",
    'Lightly adjusted': "bg-blue-100 text-blue-700",
    'Significantly changed': "bg-indigo-100 text-indigo-700",
    'New': "bg-violet-100 text-violet-700",
  };

  return (
    <div className={`rounded-xl border-2 px-3 flex flex-col shadow-sm relative ${statusColors[status]} ${compact ? 'py-2' : 'py-3'}`}>
      <div className="flex items-start justify-between mb-1.5">
        <div className={`p-1.5 rounded-lg ${statusBadge[status]}`}>
          {icon}
        </div>
      </div>
      <h3 className="font-bold text-xs text-slate-900 leading-tight tracking-tight">{title}</h3>
      {!compact && <p className="text-[10px] text-slate-500 mt-1 leading-snug">{desc}</p>}
    </div>
  );
}

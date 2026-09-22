import React from "react";
import { 
  ShieldCheckIcon, ListFilterIcon, 
  ArrowRightIcon, CheckCircle2Icon, HistoryIcon,
  MessageSquareIcon, FileTextIcon, BuildingIcon, UserIcon, ShieldAlertIcon,
  XCircleIcon
} from "lucide-react";

type ChangeType = 'Current' | 'Lightly adjusted' | 'Significantly changed' | 'New';

function ChangeBadge({ type }: { type: ChangeType }) {
  const colors = {
    'Current': 'bg-slate-100 text-slate-600',
    'Lightly adjusted': 'bg-blue-100 text-blue-700',
    'Significantly changed': 'bg-indigo-100 text-indigo-700',
    'New': 'bg-violet-100 text-violet-700'
  };
  return <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${colors[type]}`}>{type}</span>;
}

export default function HMROperatorJourney() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">HMR Operator Journey</h1>
            <p className="text-slate-500">Mediating requests, ensuring quality, and auditing outcomes.</p>
          </div>
          <div className="bg-violet-50 border border-violet-100 p-3 rounded-xl flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-violet-500" />
            <p className="text-xs font-semibold text-violet-800">Operator has full visibility to mediate effectively.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Panel 1: Mediation Queue */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">1. Mediation Queue</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-sm">Pending Requests</h4>
                <ListFilterIcon className="w-4 h-4 text-slate-400" />
              </div>
              
              <div className="space-y-3">
                <QueueItem company="Acme Corp" target="Jane Doe" time="2h ago" status="Needs Review" />
                <QueueItem company="TechFlow" target="John Smith" time="5h ago" status="Routed" active={false} />
                <QueueItem company="GlobalNet" target="Sarah Lee" time="1d ago" status="Closed" active={false} />
              </div>
            </div>
          </div>

          {/* Panel 2: Request Review */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">2. Request Review</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <BuildingIcon className="w-4 h-4 text-indigo-500" /> Acme
                </div>
                <ArrowRightIcon className="w-4 h-4 text-slate-400" />
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <UserIcon className="w-4 h-4 text-blue-500" /> Jane Doe
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Business Message</p>
                <p className="text-xs text-slate-700 italic">"Looking for a React expert to lead our new platform rewrite. Salary up to $180k."</p>
                <div className="mt-3 border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500">Fit: <strong className="text-emerald-600">High</strong></span>
                  <span className="text-[10px] text-slate-500">Spam: <strong className="text-emerald-600">Clear</strong></span>
                </div>
              </div>

              <button className="w-full bg-violet-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-violet-700">
                Route to Professional
              </button>
            </div>
          </div>

          {/* Panel 3: Status Tracking */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">3. Status Tracking</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Jane Doe</h4>
                  <p className="text-xs text-slate-500">Reviewing Acme Request</p>
                </div>
              </div>

              <div className="relative pt-4">
                <div className="absolute left-3.5 top-6 bottom-4 w-[2px] bg-slate-100"></div>
                <div className="space-y-4 relative z-10">
                  <TimelineItem label="Routed by Operator" time="10:00 AM" done />
                  <TimelineItem label="Viewed by Professional" time="11:30 AM" done />
                  <TimelineItem label="Pending Decision" time="--" active />
                </div>
              </div>
            </div>
          </div>

          {/* Panel 4: Audit & Handoff / Closure */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative col-span-1 lg:col-span-1">
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">4. Audit & Resolution</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1 flex flex-col gap-4 overflow-y-auto">
              
              {/* Approved Branch */}
              <div className="border border-emerald-100 rounded-lg overflow-hidden">
                <div className="bg-emerald-50 px-3 py-2 border-b border-emerald-100 flex items-center gap-2">
                  <CheckCircle2Icon className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">Branch A: Approved</span>
                </div>
                <div className="p-3 bg-white space-y-2">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <p className="text-[10px] font-mono text-slate-500">
                      [SYS] 12:15: Professional approved.<br/>
                      [SYS] 12:15: Identity mask lifted.<br/>
                      [SYS] 12:15: Chat initialized.
                    </p>
                  </div>
                  <button className="w-full bg-slate-100 text-slate-600 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5">
                    <MessageSquareIcon className="w-3.5 h-3.5" /> Read-Only Chat Audit
                  </button>
                </div>
              </div>

              {/* Declined Branch */}
              <div className="border border-red-100 rounded-lg overflow-hidden">
                <div className="bg-red-50 px-3 py-2 border-b border-red-100 flex items-center gap-2">
                  <XCircleIcon className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-800">Branch B: Declined</span>
                </div>
                <div className="p-3 bg-white space-y-2">
                  <div className="bg-slate-50 p-2 rounded border border-slate-100">
                    <p className="text-[10px] font-mono text-slate-500">
                      [SYS] 12:45: Professional declined.<br/>
                      [SYS] 12:45: Request marked Closed.<br/>
                      [SYS] 12:45: Identity mask preserved.
                    </p>
                  </div>
                  <div className="flex gap-1.5 bg-red-50/50 p-2 rounded border border-red-100">
                    <ShieldAlertIcon className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <p className="text-[9px] text-red-700 leading-tight">Request closed. No contact info was shared.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function QueueItem({ company, target, time, status, active = true }: { company: string, target: string, time: string, status: string, active?: boolean }) {
  return (
    <div className={`p-3 border rounded-xl flex justify-between items-center ${active ? 'bg-white border-violet-200 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
      <div>
        <h5 className="font-bold text-xs flex items-center gap-1.5">
          {company} <ArrowRightIcon className="w-3 h-3 text-slate-300" /> {target}
        </h5>
        <p className="text-[10px] text-slate-500 mt-0.5">{time}</p>
      </div>
      <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${active ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
        {status}
      </span>
    </div>
  );
}

function TimelineItem({ label, time, done = false, active = false }: { label: string, time: string, done?: boolean, active?: boolean }) {
  return (
    <div className="flex gap-3 items-center">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${done ? 'bg-emerald-500 border-emerald-500 text-white' : active ? 'bg-white border-violet-500 text-violet-500' : 'bg-white border-slate-200 text-slate-300'}`}>
        {done ? <CheckCircle2Icon className="w-4 h-4" /> : <div className={`w-2 h-2 rounded-full ${active ? 'bg-violet-500' : 'bg-slate-200'}`}></div>}
      </div>
      <div className="flex-1">
        <p className={`text-xs font-semibold ${done || active ? 'text-slate-900' : 'text-slate-400'}`}>{label}</p>
        <p className="text-[10px] text-slate-500">{time}</p>
      </div>
    </div>
  );
}

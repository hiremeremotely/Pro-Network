import React from "react";
import { 
  UserCircleIcon, BuildingIcon, ShieldCheckIcon, 
  ArrowRightIcon, CheckCircle2Icon, XCircleIcon, 
  LockIcon, MessageSquareIcon, SearchIcon, 
  FileTextIcon, SendIcon, UserIcon, ShieldIcon
} from "lucide-react";

export default function FlowOverview() {
  return (
    <div className="min-h-screen bg-[#f3f2ef] p-6 font-sans text-slate-900 overflow-hidden">
      <div className="max-w-[1300px] mx-auto space-y-6">
        
        {/* Header & Legend */}
        <div className="flex justify-between items-start bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold mb-1">HMR Privacy Flow Overview</h1>
            <p className="text-slate-500 text-sm">End-to-end mediation flow between Professionals, Businesses, and HMR Operators.</p>
          </div>
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span><span className="text-slate-600">Current</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-200"></span><span className="text-slate-600">Lightly adjusted</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span><span className="text-slate-600">Significantly changed</span></div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-violet-600"></span><span className="text-slate-600">New</span></div>
          </div>
        </div>

        {/* Lanes Container */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col relative">
          
          {/* Lane 1: Professional */}
          <div className="flex border-b border-gray-100">
            <div className="w-56 bg-slate-50 p-5 border-r border-gray-200 flex-shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 font-semibold text-base text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <UserCircleIcon className="w-5 h-5" />
                </div>
                Professional
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">Manages identity, controls privacy, receives interest.</p>
            </div>
            <div className="flex-1 p-5 relative flex items-center gap-3">
              <Step title="Professional Hub" desc="Manage profile" status="Current" icon={<UserIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Privacy Controls" desc="Field-level visibility" status="New" icon={<LockIcon size={16} />} />
              <ArrowRightIcon className="text-transparent w-4 h-4 shrink-0" />
              <div className="w-[130px] shrink-0"></div>
              <ArrowRightIcon className="text-transparent w-4 h-4 shrink-0" />
              <Step title="Review Interest" desc="Incoming request" status="New" icon={<FileTextIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <div className="flex flex-col gap-2 shrink-0">
                <Step title="Approve & Release" desc="" status="New" icon={<CheckCircle2Icon size={16} />} compact />
                <Step title="Decline" desc="" status="New" icon={<XCircleIcon size={16} />} compact />
              </div>
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Direct Chat" desc="Unlocked messaging" status="Lightly adjusted" icon={<MessageSquareIcon size={16} />} />
            </div>
          </div>

          {/* Lane 2: Business */}
          <div className="flex border-b border-gray-100">
            <div className="w-56 bg-slate-50 p-5 border-r border-gray-200 flex-shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 font-semibold text-base text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <BuildingIcon className="w-5 h-5" />
                </div>
                Business
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">Searches talent, sends structured interest.</p>
            </div>
            <div className="flex-1 p-5 relative flex items-center gap-3">
              <div className="w-[130px] shrink-0"></div>
              <div className="w-4 h-4 shrink-0"></div>
              <Step title="Redacted Search" desc="Find anonymized talent" status="Significantly changed" icon={<SearchIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Express Interest" desc="Submit structured form" status="Significantly changed" icon={<SendIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Pending Request" desc="Awaiting response" status="New" icon={<ShieldIcon size={16} />} />
              <ArrowRightIcon className="text-transparent w-4 h-4 shrink-0" />
              <div className="w-[130px] shrink-0"></div>
              <div className="w-4 h-4 shrink-0"></div>
              <div className="w-[130px] shrink-0"></div>
            </div>
          </div>

          {/* Lane 3: HMR Operator */}
          <div className="flex">
            <div className="w-56 bg-slate-50 p-5 border-r border-gray-200 flex-shrink-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 font-semibold text-base text-slate-800">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <ShieldCheckIcon className="w-5 h-5" />
                </div>
                HMR Operator
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-tight">Mediates, audits, and ensures quality.</p>
            </div>
            <div className="flex-1 p-5 relative flex items-center gap-3">
              <div className="w-[130px] shrink-0"></div>
              <div className="w-4 h-4 shrink-0"></div>
              <div className="w-[130px] shrink-0"></div>
              <div className="w-4 h-4 shrink-0"></div>
              <div className="w-[130px] shrink-0"></div>
              <div className="w-4 h-4 shrink-0"></div>
              <Step title="Mediation Queue" desc="Review business request" status="New" icon={<FileTextIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Audit & Route" desc="Send to professional" status="New" icon={<ArrowRightIcon size={16} />} />
              <ArrowRightIcon className="text-slate-300 w-4 h-4 shrink-0" />
              <Step title="Audit Trail Log" desc="Log all outcomes" status="New" icon={<CheckCircle2Icon size={16} />} />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
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
    <div className={`w-[130px] shrink-0 rounded-xl border-2 px-3 flex flex-col shadow-sm relative ${statusColors[status]} ${compact ? 'py-2' : 'py-3'}`}>
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

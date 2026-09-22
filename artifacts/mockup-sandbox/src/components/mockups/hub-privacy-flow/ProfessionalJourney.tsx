import React from "react";
import { 
  LockIcon, EyeIcon, GlobeIcon, ShieldAlertIcon, ShieldCheckIcon,
  CheckIcon, XIcon, MessageSquareIcon, EyeOffIcon, BriefcaseIcon, UserIcon, Edit3Icon, SettingsIcon, XCircleIcon
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

export default function ProfessionalJourney() {
  return (
    <div className="min-h-screen bg-slate-100 p-6 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Professional Journey</h1>
          <p className="text-slate-500 text-sm">From baseline hub to privacy controls, and resolving an incoming request.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Panel 1: Hub Baseline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">1. Hub Baseline</span>
              <ChangeBadge type="Current" />
            </div>
            <div className="p-4 flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Jane Doe</h4>
                  <p className="text-xs text-slate-500">Sr. Frontend Engineer</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded w-full"></div>
                <div className="h-2 bg-slate-100 rounded w-4/5"></div>
              </div>
              <button className="w-full text-xs font-semibold bg-slate-100 text-slate-700 py-1.5 rounded-lg flex items-center justify-center gap-1.5">
                <SettingsIcon className="w-3.5 h-3.5" /> View Profile Settings
              </button>
            </div>
          </div>

          {/* Panel 2: Hub Editing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">2. Hub Editing</span>
              <ChangeBadge type="Lightly adjusted" />
            </div>
            <div className="p-4 flex-1 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <span className="text-xs font-semibold">Portfolio Items</span>
                <Edit3Icon className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg">
                  <span className="text-xs font-semibold block">Fintech Dashboard</span>
                  <span className="text-[10px] text-slate-500">React, TypeScript</span>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg opacity-60">
                  <span className="text-xs font-semibold block">+ Add New Item</span>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Privacy Controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">3. Privacy Controls</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-4 flex-1 space-y-3">
              <p className="text-[10px] text-slate-500 mb-2">Set field visibility for businesses.</p>
              
              <PrivacySetting label="Full Name" value="HMR Only" icon={<ShieldCheckIcon className="w-3 h-3 text-indigo-500" />} />
              <PrivacySetting label="Contact Info" value="Private" icon={<LockIcon className="w-3 h-3 text-slate-500" />} />
              <PrivacySetting label="Current Employer" value="HMR Only" icon={<ShieldCheckIcon className="w-3 h-3 text-indigo-500" />} />
              <PrivacySetting label="Portfolio" value="Public" icon={<GlobeIcon className="w-3 h-3 text-emerald-500" />} />

              <div className="mt-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100 flex gap-2">
                <EyeOffIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <p className="text-[9px] text-indigo-800 leading-tight">Businesses see you as "Sr Frontend Engineer" until approved.</p>
              </div>
            </div>
          </div>

          {/* Panel 4: Incoming Interest */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">4. Incoming Request</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-4 flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <BriefcaseIcon size={14} />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Acme Corp</h4>
                  <p className="text-[10px] text-slate-500">Mediated Request</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Role Proposed</span>
                  <p className="text-xs font-medium mt-0.5">Lead Frontend Engineer</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Message</span>
                  <p className="text-[10px] text-slate-600 mt-0.5 italic">"Impressed by your background..."</p>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 5: Decision */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">5. The Decision</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center space-y-4">
              <div className="text-center">
                <ShieldAlertIcon className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <h4 className="font-bold text-xs">Release Info?</h4>
                <p className="text-[10px] text-slate-500 mt-1">Approving reveals your name.</p>
              </div>

              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-1.5 bg-slate-900 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800">
                  <CheckIcon size={14} /> Approve
                </button>
                <button className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50">
                  <XIcon size={14} /> Decline
                </button>
              </div>
            </div>
          </div>

          {/* Panel 6a: Approved Chat */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">6a. Approved Chat</span>
              <ChangeBadge type="Lightly adjusted" />
            </div>
            <div className="p-0 flex-1 flex flex-col bg-slate-50/50">
              <div className="p-2 border-b border-gray-100 bg-white flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[9px]">AC</div>
                <div>
                  <h4 className="font-semibold text-[11px]">Acme Corp</h4>
                  <p className="text-[9px] text-emerald-600 font-medium">Connection Approved</p>
                </div>
              </div>
              <div className="p-3 flex-1 space-y-3">
                <div className="flex gap-1.5">
                  <div className="bg-white border border-slate-200 p-2 rounded-xl rounded-tl-sm text-[10px] text-slate-700 max-w-[85%] shadow-sm">
                    Hi Jane! Thanks for accepting. Available to chat?
                  </div>
                </div>
                <div className="flex gap-1.5 flex-row-reverse">
                  <div className="bg-blue-600 text-white p-2 rounded-xl rounded-tr-sm text-[10px] max-w-[85%] shadow-sm">
                    Yes, how about Thursday?
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 6b: Declined Outcome */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-3 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-xs">6b. Privacy Kept</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-4 flex-1 flex flex-col justify-center text-center space-y-3">
              <XCircleIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <div>
                <h4 className="font-bold text-xs text-slate-700">Request Declined</h4>
                <p className="text-[10px] text-slate-500 mt-1">You declined Acme Corp's request.</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <p className="text-[9px] text-slate-600 font-medium flex items-center justify-center gap-1">
                  <LockIcon className="w-3 h-3 text-slate-400" /> Identity remains private.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PrivacySetting({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
      <span className="flex items-center gap-1 text-[10px] font-semibold bg-slate-100 px-2 py-1 rounded-md">
        {icon} {value}
      </span>
    </div>
  );
}

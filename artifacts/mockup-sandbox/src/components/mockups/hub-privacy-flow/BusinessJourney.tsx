import React from "react";
import { 
  SearchIcon, EyeOffIcon, ClockIcon, 
  CheckCircle2Icon, XCircleIcon, ShieldAlertIcon, LockIcon, InfoIcon
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

export default function BusinessJourney() {
  return (
    <div className="min-h-screen bg-slate-100 p-8 font-sans text-slate-900">
      <div className="max-w-[1400px] mx-auto">
        
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Business Journey</h1>
            <p className="text-slate-500">Searching anonymized talent and initiating structured, mediated requests.</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex items-start gap-2 max-w-md">
            <InfoIcon className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-800 leading-tight">
              <strong>Strict Privacy Baseline:</strong> Businesses cannot see names, contact info, or exact current employers until the professional explicitly approves a structured request.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Row 1, Panel 1: Redacted Search */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">1. Redacted Search</span>
              <ChangeBadge type="Significantly changed" />
            </div>
            <div className="p-5 flex-1">
              <div className="relative mb-4">
                <SearchIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input disabled className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm" placeholder="Frontend Engineer in NY..." />
              </div>
              
              <div className="space-y-3">
                <SearchResult title="Senior Frontend Engineer" exp="8 YOE" location="New York, NY" />
                <SearchResult title="React Developer" exp="5 YOE" location="Remote (US)" />
                <SearchResult title="Lead UI Engineer" exp="10 YOE" location="New York, NY" />
              </div>
            </div>
          </div>

          {/* Row 1, Panel 2: Anonymized Profile */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="absolute -left-3 top-1/2 w-6 h-[2px] bg-indigo-300 hidden lg:block"></div>
            
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">2. Anonymized Profile</span>
              <ChangeBadge type="Significantly changed" />
            </div>
            <div className="p-5 flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border-2 border-dashed border-slate-300">
                  <EyeOffIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900 blur-[4px] select-none">Jane Doe</h4>
                  <p className="text-sm font-semibold text-slate-700">Senior Frontend Engineer</p>
                  <p className="text-xs text-slate-500">New York, NY</p>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-slate-600">
                  <LockIcon className="w-3 h-3" /> Private Details
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                </div>
              </div>

              <button className="w-full bg-slate-900 text-white py-2 rounded-xl text-sm font-semibold hover:bg-slate-800">
                Express Interest
              </button>
            </div>
          </div>

          {/* Row 1, Panel 3: Structured Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="absolute -left-3 top-1/2 w-6 h-[2px] bg-indigo-300 hidden lg:block"></div>
            
            <div className="bg-slate-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="font-semibold text-sm">3. Express Interest</span>
              <ChangeBadge type="Significantly changed" />
            </div>
            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs text-slate-500">Submit a mediated request to contact this professional.</p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Select Job</label>
                  <div className="border border-slate-200 p-2 rounded-lg text-sm bg-slate-50 mt-1">Lead UI Engineer</div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Message</label>
                  <div className="border border-slate-200 p-2 rounded-lg text-xs bg-slate-50 mt-1 h-16 text-slate-400">Why are they a good fit?</div>
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded-xl text-sm font-semibold">
                Submit Request
              </button>
            </div>
          </div>

          {/* Row 2, Panel 4: Pending */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
            <div className="bg-amber-50 p-4 border-b border-amber-100 flex justify-between items-center">
              <span className="font-semibold text-sm text-amber-800">4. Request Pending</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1 flex flex-col items-center justify-center text-center space-y-3">
              <ClockIcon className="w-10 h-10 text-amber-400" />
              <div>
                <h4 className="font-bold text-sm">Under Review</h4>
                <p className="text-xs text-slate-500 mt-1">Request sent to HMR Operator for review, then to the professional.</p>
              </div>
              <div className="w-full bg-slate-100 p-2 rounded-lg text-xs text-slate-400 mt-2">
                Contact info remains locked.
              </div>
            </div>
          </div>

          {/* Row 2, Panel 5: Approved */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative border-t-4 border-t-emerald-500">
            <div className="bg-emerald-50 p-4 border-b border-emerald-100 flex justify-between items-center">
              <span className="font-semibold text-sm text-emerald-800">5a. Approved Outcome</span>
              <ChangeBadge type="Lightly adjusted" />
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2Icon className="w-8 h-8 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Connection Made</h4>
                  <p className="text-xs text-slate-500">Professional accepted your request.</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Identity Revealed</span>
                  <span className="text-xs font-bold text-slate-900">Jane Doe</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-500">Current Employer</span>
                  <span className="text-xs font-bold text-slate-900">TechFlow Inc</span>
                </div>
              </div>

              <button className="w-full bg-emerald-600 text-white py-2 rounded-xl text-sm font-semibold">
                Open Chat
              </button>
            </div>
          </div>

          {/* Row 2, Panel 6: Declined */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative border-t-4 border-t-red-500">
            <div className="bg-red-50 p-4 border-b border-red-100 flex justify-between items-center">
              <span className="font-semibold text-sm text-red-800">5b. Declined Outcome</span>
              <ChangeBadge type="New" />
            </div>
            <div className="p-5 flex-1 flex flex-col justify-center space-y-4">
              <div className="flex items-center gap-3">
                <XCircleIcon className="w-8 h-8 text-red-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Request Declined</h4>
                  <p className="text-xs text-slate-500">The professional is not interested at this time.</p>
                </div>
              </div>

              <div className="bg-red-50 p-3 rounded-lg border border-red-100 flex gap-2">
                <ShieldAlertIcon className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-800">
                  Privacy maintained. The professional's identity and contact information remain completely hidden.
                </p>
              </div>

              <button className="w-full bg-slate-100 text-slate-600 py-2 rounded-xl text-sm font-semibold cursor-not-allowed">
                Chat Disabled
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function SearchResult({ title, exp, location }: { title: string, exp: string, location: string }) {
  return (
    <div className="p-3 border border-slate-100 bg-white rounded-xl hover:border-slate-300 transition-colors cursor-pointer flex gap-3 items-center">
      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
        <EyeOffIcon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div>
        <h5 className="font-semibold text-xs">{title}</h5>
        <p className="text-[10px] text-slate-500">{exp} • {location}</p>
      </div>
    </div>
  );
}

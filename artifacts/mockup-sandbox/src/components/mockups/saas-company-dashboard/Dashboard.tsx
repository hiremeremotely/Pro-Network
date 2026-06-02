import {
  LayoutDashboardIcon,
  UsersIcon,
  BriefcaseIcon,
  ClipboardListIcon,
  SettingsIcon,
  BellIcon,
  SearchIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  UserCheckIcon,
  ClockIcon,
  PlusIcon,
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleIcon,
  BuildingIcon,
  LogOutIcon,
  HelpCircleIcon,
  SparklesIcon,
  FileTextIcon,
  ChevronRightIcon,
} from "lucide-react";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboardIcon, label: "Overview",    active: true },
  { icon: UsersIcon,           label: "Candidates",  active: false },
  { icon: BriefcaseIcon,       label: "Jobs",        active: false },
  { icon: ClipboardListIcon,   label: "Hiring",      active: false },
  { icon: UserCheckIcon,       label: "Employees",   active: false },
  { icon: FileTextIcon,        label: "Offers",      active: false },
];

const STATS = [
  { label: "Active Jobs",     value: "12", delta: "+2 this week",  up: true,  icon: BriefcaseIcon,     color: "text-indigo-600", bg: "bg-indigo-50" },
  { label: "Total Employees", value: "48", delta: "+3 this month", up: true,  icon: UsersIcon,         color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "New Hires (30d)", value: "6",  delta: "on track",      up: true,  icon: UserCheckIcon,     color: "text-violet-600",  bg: "bg-violet-50" },
  { label: "Open Apps",       value: "24", delta: "9 need review", up: false, icon: ClipboardListIcon, color: "text-amber-600",   bg: "bg-amber-50" },
];

const PIPELINE = [
  { stage: "Applied",     count: 24, color: "bg-slate-200",   text: "text-slate-600"   },
  { stage: "Screening",   count: 14, color: "bg-blue-200",    text: "text-blue-700"    },
  { stage: "Interview",   count:  8, color: "bg-violet-200",  text: "text-violet-700"  },
  { stage: "Offer",       count:  3, color: "bg-amber-200",   text: "text-amber-700"   },
  { stage: "Hired",       count:  6, color: "bg-emerald-200", text: "text-emerald-700" },
];

const APPLICANTS = [
  { name: "Alex Chen",      role: "Sr. Engineer",      stage: "Interview",  stageColor: "bg-violet-100 text-violet-700", initials: "AC", avatarBg: "bg-indigo-500",   time: "2h ago" },
  { name: "Maria Santos",   role: "Product Designer",  stage: "Screening",  stageColor: "bg-blue-100 text-blue-700",     initials: "MS", avatarBg: "bg-rose-500",     time: "4h ago" },
  { name: "James Okafor",   role: "Product Manager",   stage: "Offer",      stageColor: "bg-amber-100 text-amber-700",   initials: "JO", avatarBg: "bg-emerald-600",  time: "6h ago" },
  { name: "Priya Sharma",   role: "Backend Engineer",  stage: "Applied",    stageColor: "bg-slate-100 text-slate-700",   initials: "PS", avatarBg: "bg-violet-500",   time: "1d ago" },
  { name: "Lucas Müller",   role: "DevOps Engineer",   stage: "Screening",  stageColor: "bg-blue-100 text-blue-700",     initials: "LM", avatarBg: "bg-cyan-600",     time: "1d ago" },
];

const JOBS = [
  { title: "Senior Frontend Engineer", dept: "Engineering", apps: 8,  daysOpen: 12 },
  { title: "Product Designer",         dept: "Design",      apps: 6,  daysOpen: 7  },
  { title: "Data Analyst",             dept: "Analytics",   apps: 11, daysOpen: 21 },
];

const ONBOARDING = [
  { task: "Send offer letter to Alex Chen",    done: true  },
  { task: "Set up Slack workspace for Maria",  done: true  },
  { task: "Schedule orientation for James",    done: false },
  { task: "Finalize contract — Lucas Müller",  done: false },
];

export function Dashboard() {
  return (
    <div
      className="flex h-screen bg-[#f8f9fb] overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 bg-[#18181b] flex flex-col h-full">
        {/* Logo / workspace switcher */}
        <div className="px-4 h-14 flex items-center gap-2.5 border-b border-white/8">
          <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <BuildingIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white truncate">Acme Corp</span>
          <ChevronDownIcon className="w-3.5 h-3.5 text-white/40 ml-auto flex-shrink-0" />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 pt-3 space-y-0.5 overflow-y-auto">
          {SIDEBAR_ITEMS.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-indigo-400" : ""}`} />
              {label}
            </button>
          ))}

          <div className="pt-3 pb-1 px-3">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Workspace</p>
          </div>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-white/50 hover:text-white/80 hover:bg-white/5">
            <SettingsIcon className="w-4 h-4 flex-shrink-0" />
            Settings
          </button>
          <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-white/50 hover:text-white/80 hover:bg-white/5">
            <HelpCircleIcon className="w-4 h-4 flex-shrink-0" />
            Help
          </button>
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/8 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">SC</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">Sarah Chen</p>
            <p className="text-[10px] text-white/40 truncate">HR Lead</p>
          </div>
          <LogOutIcon className="w-3.5 h-3.5 text-white/30 hover:text-white/60 flex-shrink-0 cursor-pointer" />
        </div>
      </aside>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-100 px-6 flex items-center gap-4 flex-shrink-0">
          <div className="flex-1 max-w-sm">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-400">
              <SearchIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-xs">Search candidates, jobs…</span>
              <span className="ml-auto text-[10px] border border-gray-200 rounded px-1 bg-white text-gray-400">⌘K</span>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="flex items-center gap-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
              <PlusIcon className="w-3.5 h-3.5" />
              Post Job
            </button>

            <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500">
              <BellIcon className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-[11px] font-bold text-white cursor-pointer">
              SC
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-6 py-5">

          {/* Page header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-gray-900">Overview</h1>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 font-medium">June 2026</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Good morning, Sarah — 4 items need your attention today.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <SparklesIcon className="w-3.5 h-3.5 text-indigo-400" />
              AI insights available
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {STATS.map(({ label, value, delta, up, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <ArrowUpRightIcon className={`w-3.5 h-3.5 mt-0.5 ${up ? "text-emerald-500" : "text-amber-400"}`} />
                </div>
                <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`text-[10px] mt-1 font-medium ${up ? "text-emerald-600" : "text-amber-600"}`}>{delta}</p>
              </div>
            ))}
          </div>

          {/* Pipeline bar */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-900">Hiring Pipeline</p>
              <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ChevronRightIcon className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {PIPELINE.map(({ stage, count, color, text }) => {
                const total = PIPELINE.reduce((s, p) => s + p.count, 0);
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={stage} className="flex-1 min-w-0">
                    <div className={`h-1.5 rounded-full ${color} mb-2`} style={{ width: `${pct}%`, minWidth: "100%" }} />
                    <p className={`text-[11px] font-semibold ${text}`}>{count}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 truncate">{stage}</p>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {PIPELINE.map(({ stage, count, color, text }) => (
                <span key={stage} className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${color} ${text}`}>
                  {count} {stage}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom row: Applicants + Jobs + Checklist */}
          <div className="grid grid-cols-3 gap-4">

            {/* Recent applicants */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Recent Applicants</p>
                <button className="text-xs text-indigo-600 hover:underline">See all</button>
              </div>
              <div className="space-y-2.5">
                {APPLICANTS.map(({ name, role, stage, stageColor, initials, avatarBg, time }) => (
                  <div key={name} className="flex items-center gap-2.5 group cursor-pointer">
                    <div className={`w-7 h-7 rounded-full ${avatarBg} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{name}</p>
                      <p className="text-[10px] text-gray-400 truncate">{role}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${stageColor}`}>{stage}</span>
                      <span className="text-[9px] text-gray-300">{time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active jobs */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Active Jobs</p>
                <button className="text-xs text-indigo-600 hover:underline">Manage</button>
              </div>
              <div className="space-y-3">
                {JOBS.map(({ title, dept, apps, daysOpen }) => (
                  <div key={title} className="flex items-start gap-2 cursor-pointer group">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BriefcaseIcon className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">{title}</p>
                      <p className="text-[10px] text-gray-400">{dept} · {daysOpen}d open</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-gray-700">{apps}</span>
                      <span className="text-[9px] text-gray-400">apps</span>
                    </div>
                  </div>
                ))}
              </div>
              <button className="mt-3 w-full flex items-center justify-center gap-1.5 text-[11px] text-indigo-600 border border-indigo-100 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors">
                <PlusIcon className="w-3 h-3" />
                Post a new job
              </button>
            </div>

            {/* Onboarding checklist */}
            <div className="col-span-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-900">Action Items</p>
                <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-full px-2 py-0.5">2 pending</span>
              </div>
              <div className="space-y-2.5">
                {ONBOARDING.map(({ task, done }) => (
                  <div key={task} className="flex items-start gap-2 cursor-pointer group">
                    {done
                      ? <CheckCircle2Icon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      : <CircleIcon className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-0.5" />
                    }
                    <p className={`text-xs leading-relaxed ${done ? "text-gray-400 line-through" : "text-gray-700 group-hover:text-indigo-600 transition-colors"}`}>
                      {task}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-gray-400">Completion</span>
                  <span className="text-[10px] font-semibold text-gray-600">50%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: "50%" }} />
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

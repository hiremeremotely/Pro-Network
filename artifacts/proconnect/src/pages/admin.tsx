import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState, ErrorState } from "@/components/loading-state";
import {
  UsersIcon, BriefcaseIcon, FileTextIcon, MessageSquareIcon,
  BuildingIcon, TrendingUpIcon, StarIcon, SearchIcon,
  LayoutDashboardIcon, UserCheckIcon, CreditCardIcon,
  ChevronLeftIcon, XIcon, CheckIcon, ClockIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

type Section = "dashboard" | "users" | "jobs" | "applications" | "subscriptions";

const STATUS_COLORS: Record<string, string> = {
  pending:   "#f59e0b",
  reviewing: "#3b82f6",
  accepted:  "#22c55e",
  rejected:  "#ef4444",
};
const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700",
  reviewing: "bg-blue-50 text-blue-700",
  accepted:  "bg-green-50 text-green-700",
  rejected:  "bg-red-50 text-red-700",
};
const STATUS_DOT: Record<string, string> = {
  pending:   "bg-yellow-400",
  reviewing: "bg-blue-400",
  accepted:  "bg-green-400",
  rejected:  "bg-red-400",
};
const PLAN_BADGE: Record<string, string> = {
  Free:       "bg-gray-100 text-gray-600",
  Pro:        "bg-indigo-50 text-indigo-700",
  Enterprise: "bg-purple-50 text-purple-700",
};
const PLAN_FEATURES: Record<string, string[]> = {
  Free:       ["Profile listing", "Apply to jobs", "Basic feed"],
  Pro:        ["Everything in Free", "Featured profile", "Priority applications", "Analytics"],
  Enterprise: ["Everything in Pro", "Unlimited job postings", "Company dashboard", "Dedicated support"],
};

// ── Shared fetch ────────────────────────────────────────────────────────────

function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/admin/stats`);
      if (!res.ok) throw new Error("Failed to load admin stats");
      return res.json();
    },
    staleTime: 30_000,
  });
}

function useAdminUsers(accountType: string) {
  return useQuery({
    queryKey: ["admin-users", accountType],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (accountType !== "all") params.set("accountType", accountType);
      const res = await fetch(`${BASE}api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────

const NAV: { id: Section; label: string; icon: React.ElementType }[] = [
  { id: "dashboard",     label: "Dashboard",     icon: LayoutDashboardIcon },
  { id: "users",         label: "Users",         icon: UsersIcon },
  { id: "jobs",          label: "Jobs",          icon: BriefcaseIcon },
  { id: "applications",  label: "Applications",  icon: FileTextIcon },
  { id: "subscriptions", label: "Subscriptions", icon: CreditCardIcon },
];

function Sidebar({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col min-h-screen shrink-0">
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/feed">
          <p className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3 w-fit">
            <ChevronLeftIcon className="w-3 h-3" /> Back to app
          </p>
        </Link>
        <h1 className="text-base font-bold text-gray-900">Admin Panel</h1>
        <p className="text-xs text-gray-400">Hire Me Remotely</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              active === id
                ? "bg-primary/10 text-primary"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheckIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Admin</p>
            <p className="text-[10px] text-gray-400">Super admin</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── Section headers ──────────────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">Live</Badge>
    </header>
  );
}

// ── Dashboard section ────────────────────────────────────────────────────────

function DashboardSection() {
  const { data, isLoading, error } = useAdminStats();
  const stats = data?.stats;
  const appsByStatus = (data?.applicationsByStatus ?? []).map((r: any) => ({
    name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.count,
    fill: STATUS_COLORS[r.status] ?? "#94a3b8",
  }));
  const jobsByCategory = data?.jobsByCategory ?? [];

  return (
    <>
      <Header title="Dashboard" subtitle="Platform overview & key metrics" />
      <div className="px-8 py-6 space-y-6">
        {isLoading ? <LoadingState message="Loading stats..." /> : error ? (
          <ErrorState error={error as Error} retry={() => {}} />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={UsersIcon}      label="Total Users"    value={stats?.totalUsers ?? 0}       sub="Individual accounts" color="text-indigo-500" />
              <StatCard icon={BuildingIcon}   label="Companies"      value={stats?.totalCompanies ?? 0}   sub="Company accounts"    color="text-violet-500" />
              <StatCard icon={BriefcaseIcon}  label="Jobs Posted"    value={stats?.totalJobs ?? 0}        sub={`${stats?.featuredJobs ?? 0} featured`} color="text-blue-500" />
              <StatCard icon={FileTextIcon}   label="Applications"   value={stats?.totalApplications ?? 0} color="text-orange-500" />
              <StatCard icon={MessageSquareIcon} label="Posts"       value={stats?.totalPosts ?? 0}       sub="Social feed"         color="text-pink-500" />
              <StatCard icon={UserCheckIcon}  label="Open to Work"   value={stats?.openToWork ?? 0}       sub="Available for hire"  color="text-green-500" />
              <StatCard icon={StarIcon}       label="Featured Jobs"  value={stats?.featuredJobs ?? 0}     color="text-yellow-500" />
              <StatCard icon={TrendingUpIcon} label="Avg Apps / Job" value={stats?.totalJobs ? (stats.totalApplications / stats.totalJobs).toFixed(1) : "0"} color="text-teal-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Jobs by Category</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={jobsByCategory} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" name="Jobs" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Applications by Status</h3>
                {appsByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={appsByStatus} dataKey="value" nameKey="name" cx="40%" cy="50%" outerRadius={75} innerRadius={40}>
                        {appsByStatus.map((entry: any, i: number) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No applications yet</div>
                )}
              </div>
            </div>

            {data?.recentProfiles?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Recently Joined</h3>
                  <span className="text-xs text-gray-400">Last 10 accounts</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {data.recentProfiles.map((p: any) => {
                    const initials = p.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={p.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                        <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                          <AvatarImage src={p.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-400 truncate">{p.headline}</p>
                        </div>
                        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 capitalize flex-shrink-0 ${p.accountType === "company" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>
                          {p.accountType}
                        </Badge>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Users section ────────────────────────────────────────────────────────────

function UsersSection() {
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("all");
  const { data, isLoading } = useAdminUsers(accountFilter);

  const filtered = (data?.profiles ?? []).filter((p: any) =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.headline ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (p.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="Users" subtitle="All platform accounts — individuals and companies" />
      <div className="px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <p className="text-sm text-gray-500 font-medium">{filtered.length} accounts</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input className="pl-8 h-8 text-xs w-56" placeholder="Search name, role, location..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                {["all", "individual", "company"].map((f) => (
                  <button key={f} onClick={() => setAccountFilter(f)} className={`px-3 py-1.5 font-medium capitalize transition-colors ${accountFilter === f ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>{f}</button>
                ))}
              </div>
            </div>
          </div>
          {isLoading ? <div className="p-8"><LoadingState message="Loading users..." /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["User", "Type", "Location", "Status", "Plan", "Joined", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">No users found</td></tr>
                  ) : filtered.map((p: any, i: number) => {
                    const initials = p.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                    const plan = p.accountType === "company" ? "Enterprise" : "Free";
                    return (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                              <AvatarImage src={p.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{p.name}</p>
                              <p className="text-xs text-gray-400 truncate max-w-[180px]">{p.headline}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 capitalize ${p.accountType === "company" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{p.accountType}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{p.location || "—"}</td>
                        <td className="px-4 py-3">
                          {p.openToWork
                            ? <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full">Open to Work</Badge>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${PLAN_BADGE[plan]}`}>{plan}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/profiles/${p.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/5">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Jobs section ─────────────────────────────────────────────────────────────

function JobsSection() {
  const [search, setSearch] = useState("");
  const { data } = useAdminStats();

  const jobs = (data?.recentJobs ?? []).filter((j: any) =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.company.toLowerCase().includes(search.toLowerCase()) ||
    (j.category ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header title="Jobs" subtitle="All remote job postings on the platform" />
      <div className="px-8 py-6">
        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500 font-medium">{data?.stats?.totalJobs ?? 0} total jobs</p>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input className="pl-8 h-8 text-xs w-56" placeholder="Search title, company..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Role", "Company", "Location", "Category", "Level", "Salary", "Featured", "Posted"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-gray-400">No jobs found</td></tr>
                ) : jobs.map((j: any, i: number) => {
                  const salary = j.salaryMin && j.salaryMax
                    ? `$${(j.salaryMin / 1000).toFixed(0)}k–$${(j.salaryMax / 1000).toFixed(0)}k`
                    : "—";
                  return (
                    <tr key={j.id} className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${j.id}`}>
                          <span className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">{j.title}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{j.company}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{j.location || "—"}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px] font-semibold px-2 rounded-full">{j.category}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{j.experienceLevel}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{salary}</td>
                      <td className="px-4 py-3">
                        {j.featured
                          ? <Badge className="bg-yellow-50 text-yellow-700 border-0 text-[10px] font-semibold px-2 rounded-full">Featured</Badge>
                          : <span className="text-xs text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {j.createdAt ? formatDistanceToNow(new Date(j.createdAt), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Applications section ──────────────────────────────────────────────────────

function ApplicationsSection() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: statsData } = useAdminStats();

  const appsByStatus = statsData?.applicationsByStatus ?? [];
  const totalApps = appsByStatus.reduce((sum: number, r: any) => sum + r.count, 0);

  return (
    <>
      <Header title="Applications" subtitle="All job applications across the platform" />
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: "pending",   icon: ClockIcon,   label: "Pending",   color: "text-yellow-500" },
            { status: "reviewing", icon: SearchIcon,  label: "Reviewing", color: "text-blue-500" },
            { status: "accepted",  icon: CheckIcon,   label: "Accepted",  color: "text-green-500" },
            { status: "rejected",  icon: XIcon,       label: "Rejected",  color: "text-red-500" },
          ].map(({ status, icon: Icon, label, color }) => {
            const row = appsByStatus.find((r: any) => r.status === status);
            return (
              <div key={status} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{row ? row.count : 0}</p>
                  <p className="text-sm font-medium text-gray-500">{label}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
          {appsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appsByStatus.map((r: any) => ({ name: r.status.charAt(0).toUpperCase() + r.status.slice(1), count: r.count, fill: STATUS_COLORS[r.status] }))} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" name="Applications" radius={[4, 4, 0, 0]}>
                  {appsByStatus.map((r: any, i: number) => (
                    <Cell key={i} fill={STATUS_COLORS[r.status]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">No applications yet</div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <FileTextIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">Total: {totalApps} applications</p>
          <p className="text-xs text-gray-400 mt-1">Individual application details are visible on each user's profile.</p>
          <Link href="/profiles">
            <Button size="sm" variant="outline" className="mt-4 text-xs rounded-full px-4">Browse Profiles</Button>
          </Link>
        </div>
      </div>
    </>
  );
}

// ── Subscriptions section ─────────────────────────────────────────────────────

function SubscriptionsSection() {
  const { data } = useAdminUsers("all");
  const profiles = data?.profiles ?? [];
  const individuals = profiles.filter((p: any) => p.accountType === "individual");
  const companies   = profiles.filter((p: any) => p.accountType === "company");

  const planCounts = {
    Free:       individuals.length,
    Pro:        0,
    Enterprise: companies.length,
  };

  return (
    <>
      <Header title="Subscriptions" subtitle="Plan distribution and account tiers" />
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {(["Free", "Pro", "Enterprise"] as const).map((plan) => (
            <div key={plan} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <Badge className={`text-xs font-semibold px-3 py-1 rounded-full border-0 ${PLAN_BADGE[plan]}`}>{plan}</Badge>
                <span className="text-3xl font-bold text-gray-900">{planCounts[plan]}</span>
              </div>
              <div className="h-px bg-gray-100" />
              <ul className="space-y-2">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-500">
                    <CheckIcon className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-2">
                {plan === "Free" && (
                  <p className="text-[10px] text-gray-400">All individual accounts start on Free.</p>
                )}
                {plan === "Pro" && (
                  <p className="text-[10px] text-gray-400">Upgrade path for power users — coming soon.</p>
                )}
                {plan === "Enterprise" && (
                  <p className="text-[10px] text-gray-400">All company accounts get Enterprise access.</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">All Accounts & Plans</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Account", "Type", "Plan", "Joined"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: any, i: number) => {
                  const initials = p.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                  const plan = p.accountType === "company" ? "Enterprise" : "Free";
                  return (
                    <tr key={p.id} className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                            <AvatarImage src={p.avatarUrl || undefined} />
                            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.headline}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 capitalize ${p.accountType === "company" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>{p.accountType}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${PLAN_BADGE[plan]}`}>{plan}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar active={section} onChange={setSection} />
      <main className="flex-1 overflow-auto">
        {section === "dashboard"     && <DashboardSection />}
        {section === "users"         && <UsersSection />}
        {section === "jobs"          && <JobsSection />}
        {section === "applications"  && <ApplicationsSection />}
        {section === "subscriptions" && <SubscriptionsSection />}
      </main>
    </div>
  );
}

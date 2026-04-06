import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LoadingState, ErrorState } from "@/components/loading-state";
import {
  UsersIcon, BriefcaseIcon, FileTextIcon, MessageSquareIcon,
  BuildingIcon, TrendingUpIcon, StarIcon, SearchIcon,
  LayoutDashboardIcon, UserCheckIcon, LogOutIcon, ChevronRightIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  reviewing: "#3b82f6",
  accepted: "#22c55e",
  rejected: "#ef4444",
};

const PLAN_COLORS: Record<string, string> = {
  Free: "bg-gray-100 text-gray-600",
  Pro: "bg-indigo-50 text-indigo-700",
  Enterprise: "bg-purple-50 text-purple-700",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gray-50 flex-shrink-0`}>
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

function Sidebar({ active }: { active: string }) {
  const nav = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
    { id: "users", label: "Users", icon: UsersIcon },
    { id: "jobs", label: "Jobs", icon: BriefcaseIcon },
  ];
  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col min-h-screen">
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/">
          <p className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ChevronRightIcon className="w-3 h-3 rotate-180" /> Back to app
          </p>
        </Link>
        <h1 className="text-base font-bold text-gray-900 mt-3">Admin Panel</h1>
        <p className="text-xs text-gray-400">Hire Me Remotely</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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
      <div className="px-3 py-4 border-t border-gray-100">
        <Link href="/">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors">
            <LogOutIcon className="w-4 h-4" /> Exit Admin
          </button>
        </Link>
      </div>
    </aside>
  );
}

export default function Admin() {
  const [userSearch, setUserSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | "individual" | "company">("all");

  const { data: statsData, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch(`${BASE}api/admin/stats`);
      if (!res.ok) throw new Error("Failed to load admin stats");
      return res.json();
    },
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", accountFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "100" });
      if (accountFilter !== "all") params.set("accountType", accountFilter);
      const res = await fetch(`${BASE}api/admin/users?${params}`);
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const filteredUsers = (usersData?.profiles ?? []).filter((p: any) =>
    !userSearch ||
    p.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    (p.headline ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
    (p.location ?? "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const stats = statsData?.stats;
  const appsByStatus = (statsData?.applicationsByStatus ?? []).map((r: any) => ({
    name: r.status.charAt(0).toUpperCase() + r.status.slice(1),
    value: r.count,
    fill: STATUS_COLORS[r.status] ?? "#94a3b8",
  }));
  const jobsByCategory = statsData?.jobsByCategory ?? [];

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar active="dashboard" />

      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>
            <p className="text-xs text-gray-400">Platform overview & user management</p>
          </div>
          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs font-semibold">Live</Badge>
        </header>

        <div className="px-8 py-6 space-y-8">

          {/* ── Stat Cards ── */}
          {statsLoading ? (
            <LoadingState message="Loading stats..." />
          ) : statsError ? (
            <ErrorState error={statsError as Error} retry={() => {}} />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                <StatCard icon={UsersIcon} label="Total Users" value={stats?.totalUsers ?? 0} sub="Individual accounts" color="text-indigo-500" />
                <StatCard icon={BuildingIcon} label="Companies" value={stats?.totalCompanies ?? 0} sub="Company accounts" color="text-violet-500" />
                <StatCard icon={BriefcaseIcon} label="Jobs Posted" value={stats?.totalJobs ?? 0} sub={`${stats?.featuredJobs ?? 0} featured`} color="text-blue-500" />
                <StatCard icon={FileTextIcon} label="Applications" value={stats?.totalApplications ?? 0} color="text-orange-500" />
                <StatCard icon={MessageSquareIcon} label="Posts" value={stats?.totalPosts ?? 0} sub="Social feed" color="text-pink-500" />
                <StatCard icon={UserCheckIcon} label="Open to Work" value={stats?.openToWork ?? 0} sub="Available for hire" color="text-green-500" />
                <StatCard icon={StarIcon} label="Featured Jobs" value={stats?.featuredJobs ?? 0} color="text-yellow-500" />
                <StatCard icon={TrendingUpIcon} label="Avg Apps / Job" value={stats?.totalJobs ? (stats.totalApplications / stats.totalJobs).toFixed(1) : "0"} color="text-teal-500" />
              </div>

              {/* ── Charts ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Jobs by Category</h3>
                  {jobsByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={jobsByCategory} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                        <Bar dataKey="count" fill="hsl(243 75% 59%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No data yet</div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Applications by Status</h3>
                  {appsByStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={appsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                          {appsByStatus.map((entry: any, i: number) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No data yet</div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── User Listing ── */}
          <div className="bg-white rounded-2xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-700">All Users</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    className="pl-8 h-8 text-xs w-52"
                    placeholder="Search name, role, location..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {(["all", "individual", "company"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setAccountFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors capitalize ${
                        accountFilter === f ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {usersLoading ? (
              <div className="p-8"><LoadingState message="Loading users..." /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">User</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Joined</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-gray-400">No users found</td>
                      </tr>
                    ) : filteredUsers.map((profile: any, i: number) => {
                      const initials = profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
                      const plan = profile.accountType === "company" ? "Enterprise" : "Free";
                      return (
                        <tr
                          key={profile.id}
                          className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                                <AvatarImage src={profile.avatarUrl || undefined} />
                                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold text-sm text-gray-900">{profile.name}</p>
                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{profile.headline}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 capitalize ${
                              profile.accountType === "company"
                                ? "bg-violet-50 text-violet-700"
                                : "bg-blue-50 text-blue-700"
                            }`}>
                              {profile.accountType}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{profile.location || "—"}</td>
                          <td className="px-4 py-3">
                            {profile.openToWork ? (
                              <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full">Open to Work</Badge>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${PLAN_COLORS[plan]}`}>
                              {plan}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">
                            {profile.createdAt
                              ? formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Link href={`/profiles/${profile.id}`}>
                              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:bg-primary/5">
                                View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredUsers.length > 0 && (
                  <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
                    Showing {filteredUsers.length} of {usersData?.total ?? filteredUsers.length} users
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Recent Jobs ── */}
          {statsData?.recentJobs?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700">Recent Job Postings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Level</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Featured</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Posted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statsData.recentJobs.map((job: any, i: number) => (
                      <tr key={job.id} className={`border-b border-gray-50 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                        <td className="px-4 py-3">
                          <Link href={`/jobs/${job.id}`}>
                            <span className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">{job.title}</span>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{job.company}</td>
                        <td className="px-4 py-3">
                          <Badge className="bg-gray-100 text-gray-600 border-0 text-[10px] font-semibold px-2 rounded-full">{job.category}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{job.experienceLevel}</td>
                        <td className="px-4 py-3">
                          {job.featured
                            ? <Badge className="bg-yellow-50 text-yellow-700 border-0 text-[10px] font-semibold px-2 rounded-full">Featured</Badge>
                            : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">
                          {job.createdAt ? formatDistanceToNow(new Date(job.createdAt), { addSuffix: true }) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

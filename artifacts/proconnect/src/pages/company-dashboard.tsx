import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useEffect } from "react";
import {
  useListJobs, getListJobsQueryKey,
  useListProfiles, getListProfilesQueryKey,
  useGetFeedStats, getGetFeedStatsQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BriefcaseIcon,
  UsersIcon,
  TrendingUpIcon,
  PlusCircleIcon,
  SearchIcon,
  ClipboardListIcon,
  PencilIcon,
  MapPinIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircleIcon,
  ZapIcon,
  EyeIcon,
} from "lucide-react";

export default function CompanyDashboard() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();

  // Redirect non-company users
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

  const { data: stats } = useGetFeedStats(
    { query: { queryKey: getGetFeedStatsQueryKey() } }
  );

  const openToWork = (talentData?.profiles ?? []).filter(p => p.openToWork && p.accountType !== "company");
  const recentJobs = jobsData?.jobs ?? [];

  const companyInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "CO";

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {/* Company hero banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <span className="text-2xl font-bold text-primary">{companyInitials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name ?? "Your Company"}</h1>
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold rounded-full">Company</Badge>
              </div>
              {user?.headline && <p className="text-gray-500 text-sm mb-2">{user.headline}</p>}
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

        {/* ── Left + Center (2 cols) ───────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Platform stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Active Jobs", value: stats?.activeJobs ?? recentJobs.length, icon: BriefcaseIcon, color: "text-indigo-600 bg-indigo-50" },
              { label: "Talent Pool", value: stats?.totalProfessionals ?? (talentData?.total ?? 0), icon: UsersIcon, color: "text-blue-600 bg-blue-50" },
              { label: "Open to Work", value: openToWork.length, icon: CheckCircleIcon, color: "text-green-600 bg-green-50" },
              { label: "New This Week", value: stats?.newThisWeek ?? 0, icon: TrendingUpIcon, color: "text-orange-600 bg-orange-50" },
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

          {/* Quick actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Post a Job", icon: PlusCircleIcon, href: "/jobs", color: "bg-primary text-white hover:bg-primary/90" },
                { label: "Find Talent", icon: SearchIcon, href: "/profiles", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Applications", icon: ClipboardListIcon, href: "/applications", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Edit Profile", icon: PencilIcon, href: "/profile/edit", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
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

          {/* Recent jobs on the platform */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Recent Jobs on the Platform</h2>
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
                <p className="text-sm">No jobs posted yet</p>
                <Link href="/jobs">
                  <Button size="sm" className="rounded-full text-xs">Post your first job</Button>
                </Link>
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
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                          <BuildingIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{job.title}</p>
                          <p className="text-xs text-gray-400 truncate">{job.company} · {job.location}</p>
                        </div>
                        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                          {salary && <span className="text-xs text-gray-500 font-medium">{salary}</span>}
                          {job.experienceLevel && (
                            <Badge className="bg-gray-50 text-gray-500 border-0 text-[10px] font-medium rounded-full">
                              {job.experienceLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ──────────────────────────────────── */}
        <div className="space-y-5">

          {/* Hiring checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <ZapIcon className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Get hiring faster</h2>
            </div>
            <div className="space-y-3">
              {[
                { done: !!user?.avatarUrl, label: "Add a company logo" },
                { done: !!user?.headline, label: "Write a company tagline" },
                { done: false, label: "Post your first job" },
                { done: false, label: "Find open-to-work talent" },
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
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${([!!user?.avatarUrl, !!user?.headline, false, false].filter(Boolean).length / 4) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">{[!!user?.avatarUrl, !!user?.headline, false, false].filter(Boolean).length} of 4 complete</p>
          </div>

          {/* Open to work talent */}
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
                      <Button size="sm" variant="outline" className="rounded-full px-2.5 text-[10px] border-primary/30 text-primary hover:bg-primary/5 flex-shrink-0 hidden group-hover:flex">
                        Connect
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Platform tip */}
          <div className="bg-gradient-to-br from-primary/5 to-indigo-100/60 rounded-xl border border-primary/15 p-5">
            <p className="text-xs font-semibold text-primary mb-1.5">Pro tip</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Companies with a complete profile get <strong>3× more</strong> applicant engagement. Add your logo and a clear tagline to stand out.
            </p>
            <Link href="/profile/edit" className="inline-block mt-3 text-xs font-semibold text-primary hover:underline">
              Complete your profile →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

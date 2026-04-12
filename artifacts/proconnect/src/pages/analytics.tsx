import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { formatDistanceToNow } from "date-fns";
import {
  BriefcaseIcon,
  SendIcon,
  BookmarkIcon,
  UsersIcon,
  TrendingUpIcon,
  CheckCircle2Icon,
  ClockIcon,
  MessageSquareIcon,
  FileTextIcon,
  EyeIcon,
  BarChart2Icon,
  ArrowUpIcon,
  ChevronRightIcon,
  StarIcon,
  CircleHelpIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface StatusRow  { status: string; label: string; count: number; pct: number; color: string }
interface CategoryRow { category: string; count: number; pct: number }

interface RecentApp {
  id: number; jobId: number; status: string; statusLabel: string; statusColor: string;
  appliedAt: string; jobTitle: string; company: string;
}

interface TopJob { id: number; title: string; applications: number; createdAt: string }

interface AnalyticsData {
  accountType: "individual" | "company";
  savedJobs: number;
  social: { totalPosts: number; totalReactions: number; totalComments: number; totalFollowers: number };
  profileViews: { last7: number; last30: number; trend: number };
  // individual
  totalApplied?: number;
  appliedLast30?: number;
  appliedLast7?: number;
  accepted?: number;
  interviews?: number;
  successRate?: number;
  interviewRate?: number;
  statusBreakdown?: StatusRow[];
  categoryBreakdown?: CategoryRow[];
  recentApplications?: RecentApp[];
  // company
  totalJobsPosted?: number;
  totalApplicationsReceived?: number;
  avgAppsPerJob?: number;
  topJobs?: TopJob[];
  recentJobs?: { id: number; title: string; createdAt: string }[];
}

// ── Small helpers ────────────────────────────────────────────────────────────

function BigStat({ icon: Icon, value, label, sub, iconBg }: {
  icon: React.ElementType; value: string | number; label: string; sub?: string; iconBg: string;
}) {
  return (
    <Card className="rounded-2xl border-gray-200 shadow-none bg-white">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}

// ── Individual view ─────────────────────────────────────────────────────────

function IndividualAnalytics({ data }: { data: AnalyticsData }) {
  const totalApplied    = data.totalApplied ?? 0;
  const successRate     = data.successRate ?? 0;
  const interviewRate   = data.interviewRate ?? 0;
  const statusRows      = data.statusBreakdown ?? [];
  const categoryRows    = data.categoryBreakdown ?? [];
  const recentApps      = data.recentApplications ?? [];

  return (
    <>
      {/* Hero stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <BigStat icon={SendIcon}        value={totalApplied}          label="Applications sent"    sub={`${data.appliedLast30 ?? 0} this month`} iconBg="bg-primary" />
        <BigStat icon={BookmarkIcon}    value={data.savedJobs}        label="Saved jobs"           sub="in My Items"           iconBg="bg-violet-500" />
        <BigStat icon={StarIcon}        value={`${successRate}%`}     label="Offer rate"           sub={`${data.accepted ?? 0} offer${data.accepted !== 1 ? "s" : ""} received`} iconBg="bg-emerald-500" />
        <BigStat icon={TrendingUpIcon}  value={`${interviewRate}%`}   label="Interview rate"       sub={`${data.interviews ?? 0} interview${data.interviews !== 1 ? "s" : ""}`} iconBg="bg-amber-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Application status funnel */}
        <Card className="rounded-2xl border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Application pipeline</p>
            <p className="text-xs text-gray-400 mb-5">Status breakdown across all applications</p>
            {statusRows.length === 0 ? (
              <div className="text-center py-8">
                <SendIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No applications yet</p>
                <Link href="/jobs" className="text-xs text-primary font-semibold mt-2 inline-block hover:underline">Browse jobs →</Link>
              </div>
            ) : (
              <div className="space-y-3.5">
                {statusRows.map(row => (
                  <div key={row.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium">{row.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {row.count} <span className="text-gray-400 font-normal text-xs">({row.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* By category */}
        <Card className="rounded-2xl border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">By job category</p>
            <p className="text-xs text-gray-400 mb-5">Where you're focusing your search</p>
            {categoryRows.length === 0 ? (
              <div className="text-center py-8">
                <BriefcaseIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Apply to jobs to see category data</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {categoryRows.map(row => (
                  <div key={row.category}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium">{row.category}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {row.count} <span className="text-gray-400 font-normal text-xs">({row.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70 transition-all" style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent applications */}
      <Card className="rounded-2xl border-gray-200 shadow-none bg-white mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-gray-900">Recent applications</p>
              <p className="text-xs text-gray-400 mt-0.5">Your 5 most recent job applications</p>
            </div>
            <Link href="/applications" className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5">
              View all <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentApps.length === 0 ? (
            <div className="text-center py-8">
              <CircleHelpIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-2">No applications yet</p>
              <Link href="/jobs" className="text-xs text-primary font-semibold hover:underline">Find remote jobs →</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {recentApps.map(app => (
                <div key={app.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{app.jobTitle}</p>
                    <p className="text-xs text-gray-500">{app.company}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge label={app.statusLabel} color={app.statusColor} />
                    <span className="text-[11px] text-gray-400">
                      {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ── Company view ─────────────────────────────────────────────────────────────

function CompanyAnalytics({ data }: { data: AnalyticsData }) {
  const totalJobs    = data.totalJobsPosted ?? 0;
  const totalApps    = data.totalApplicationsReceived ?? 0;
  const topJobs      = data.topJobs ?? [];
  const statusRows   = (data.statusBreakdown as StatusRow[] | undefined) ?? [];

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <BigStat icon={BriefcaseIcon}   value={totalJobs}               label="Jobs posted"        sub="total openings"                          iconBg="bg-primary" />
        <BigStat icon={SendIcon}        value={totalApps}               label="Applications received" sub="across all jobs"                      iconBg="bg-violet-500" />
        <BigStat icon={TrendingUpIcon}  value={data.avgAppsPerJob ?? 0} label="Avg. per listing"   sub="applications per job"                    iconBg="bg-amber-500" />
        <BigStat icon={BookmarkIcon}    value={data.savedJobs}          label="Profile saves"      sub="candidates bookmarked you"               iconBg="bg-emerald-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Top jobs */}
        <Card className="rounded-2xl border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Top job listings</p>
            <p className="text-xs text-gray-400 mb-5">Ranked by applications received</p>
            {topJobs.length === 0 ? (
              <div className="text-center py-8">
                <BriefcaseIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No jobs posted yet</p>
                <Link href="/company-dashboard" className="text-xs text-primary font-semibold mt-2 inline-block hover:underline">Post a job →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {topJobs.map((job, i) => (
                  <Link href={`/jobs/${job.id}`} key={job.id}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group cursor-pointer">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${
                        i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-300" : "bg-gray-200 text-gray-500"
                      }`}>{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary">{job.title}</p>
                        <p className="text-xs text-gray-400">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</p>
                      </div>
                      <span className="flex-shrink-0 flex items-center gap-1 text-sm font-bold text-gray-700">
                        <SendIcon className="w-3.5 h-3.5 text-gray-400" />{job.applications}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications by status */}
        <Card className="rounded-2xl border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Hiring funnel</p>
            <p className="text-xs text-gray-400 mb-5">Applications by current status</p>
            {statusRows.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No applications received yet</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {statusRows.map(row => (
                  <div key={row.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 font-medium">{row.label}</span>
                      <span className="text-sm font-bold text-gray-900">
                        {row.count} <span className="text-xs text-gray-400 font-normal">({row.pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: row.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { user } = useAppAuth();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", user?.id, user?.accountType],
    queryFn: () =>
      fetch(`${BASE}api/analytics?profileId=${user!.id}&accountType=${user!.accountType}`)
        .then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <BarChart2Icon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Sign in to view your analytics</p>
        <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
      </div>
    );
  }

  if (isLoading || !data) return <LoadingState message="Loading your analytics…" />;

  const isCompany = data.accountType === "company";

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-5xl">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2Icon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {isCompany
            ? "Track your job postings and hiring activity."
            : "Track your job search progress and application activity."}
        </p>
      </div>

      {/* Job-focused main section */}
      {isCompany
        ? <CompanyAnalytics data={data} />
        : <IndividualAnalytics data={data} />}

      {/* ── Profile & social — small secondary section ───────────────────── */}
      <div className="mt-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Profile &amp; network</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-xl border-gray-200 shadow-none bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <EyeIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{data.profileViews.last30.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Profile views <span className="text-gray-300">(30d)</span></p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-gray-200 shadow-none bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <UsersIcon className="w-5 h-5 text-violet-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{data.social.totalFollowers.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Followers</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-gray-200 shadow-none bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <FileTextIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{data.social.totalPosts.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Posts published</p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-gray-200 shadow-none bg-white">
            <CardContent className="p-4 flex items-center gap-3">
              <TrendingUpIcon className="w-5 h-5 text-fuchsia-400 flex-shrink-0" />
              <div>
                <p className="text-lg font-bold text-gray-900">{data.social.totalReactions.toLocaleString()}</p>
                <p className="text-xs text-gray-400">Post reactions</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

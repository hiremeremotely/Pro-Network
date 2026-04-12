import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState } from "@/components/loading-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUpIcon,
  UsersIcon,
  FileTextIcon,
  MessageSquareIcon,
  EyeIcon,
  ZapIcon,
  StarIcon,
  BarChart2Icon,
  ArrowUpIcon,
  ChevronRightIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

const REACTION_EMOJIS: Record<string, string> = {
  like: "👍", celebrate: "🎉", support: "🤝", love: "❤️", insightful: "💡", funny: "😄",
};
const REACTION_COLORS: Record<string, string> = {
  like: "bg-blue-400", celebrate: "bg-green-400", support: "bg-amber-400",
  love: "bg-red-400", insightful: "bg-orange-400", funny: "bg-yellow-400",
};

interface AnalyticsData {
  totalPosts: number;
  totalReactions: number;
  totalComments: number;
  totalFollowers: number;
  totalFollowing: number;
  postsLast30: number;
  postsLast7: number;
  reactionBreakdown: { type: string; label: string; emoji: string; count: number; pct: number }[];
  topPosts: { id: number; snippet: string; reactions: number; comments: number; engagement: number; createdAt: string }[];
  weeklyActivity: { label: string; count: number }[];
  profileViews: { last7: number; last30: number; last90: number; trend: number };
  impressions: { last7: number; last30: number; trend: number };
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const w = 180;
  const h = 36;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 4);
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(" L")} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-9 overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(99 102 241)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="rgb(99 102 241)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-grad)" />
      <polyline points={pts.join(" ")} fill="none" stroke="rgb(99 102 241)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, trend, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; trend?: number; color: string;
}) {
  return (
    <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          {trend !== undefined && (
            <span className="flex items-center gap-0.5 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <ArrowUpIcon className="w-3 h-3" />+{trend}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { user } = useAppAuth();

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", user?.id],
    queryFn: () => fetch(`${BASE}api/analytics?profileId=${user!.id}`).then(r => r.json()),
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

  const weekMax = Math.max(...data.weeklyActivity.map(w => w.count), 1);
  const sparkValues = data.weeklyActivity.map(w => w.count);

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BarChart2Icon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <p className="text-muted-foreground">Your profile and content performance at a glance.</p>
      </div>

      {/* Overview stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={EyeIcon}         label="Profile views"     value={data.profileViews.last90} sub="Past 90 days"  trend={data.profileViews.trend}   color="bg-primary" />
        <StatCard icon={ZapIcon}         label="Post impressions"  value={data.impressions.last30}  sub="Past 30 days"  trend={data.impressions.trend}    color="bg-indigo-400" />
        <StatCard icon={UsersIcon}       label="Followers"         value={data.totalFollowers}      sub={`Following ${data.totalFollowing}`}                color="bg-violet-500" />
        <StatCard icon={TrendingUpIcon}  label="Total reactions"   value={data.totalReactions}      sub={`${data.totalComments} comments`}                  color="bg-fuchsia-500" />
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        {/* Weekly activity */}
        <Card className="md:col-span-2 rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="font-semibold text-gray-900">Posting activity</p>
                <p className="text-xs text-gray-400 mt-0.5">Posts per week — last 8 weeks</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-primary">{data.totalPosts}</p>
                <p className="text-[11px] text-gray-400">total posts</p>
              </div>
            </div>

            {/* Sparkline */}
            <div className="mt-3 mb-4">
              <Sparkline values={sparkValues} />
            </div>

            {/* Bar chart */}
            <div className="flex items-end gap-1.5 h-16">
              {data.weeklyActivity.map((w, i) => {
                const h = weekMax > 0 ? Math.round((w.count / weekMax) * 100) : 0;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex items-end justify-center" style={{ height: "44px" }}>
                      <div
                        className="w-full rounded-t-sm bg-primary/80 transition-all"
                        style={{ height: h > 0 ? `${Math.max(h, 8)}%` : "2px", backgroundColor: h > 0 ? undefined : "#e5e7eb" }}
                      />
                    </div>
                    <span className="text-[9px] text-gray-400">{w.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">{data.postsLast7}</p>
                <p className="text-xs text-gray-400">This week</p>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{data.postsLast30}</p>
                <p className="text-xs text-gray-400">This month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile views breakdown */}
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Profile views</p>
            <p className="text-xs text-gray-400 mb-4">Who's been looking at your profile</p>
            <div className="space-y-4">
              {[
                { label: "Past 7 days",  value: data.profileViews.last7 },
                { label: "Past 30 days", value: data.profileViews.last30 },
                { label: "Past 90 days", value: data.profileViews.last90 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-gray-900">{value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((value / data.profileViews.last90) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-1.5 text-green-600">
              <ArrowUpIcon className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">+{data.profileViews.trend}% vs last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Reaction breakdown */}
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Reaction breakdown</p>
            <p className="text-xs text-gray-400 mb-4">How people react to your posts</p>
            {data.reactionBreakdown.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm">No reactions yet — start posting!</p>
                <Link href="/feed" className="text-xs text-primary font-semibold mt-2 inline-block hover:underline">Go to feed →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.reactionBreakdown.map(r => (
                  <div key={r.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5 text-sm text-gray-700">
                        <span>{r.emoji}</span>
                        <span className="font-medium">{r.label}</span>
                      </span>
                      <span className="text-sm font-bold text-gray-900">{r.count.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({r.pct}%)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${REACTION_COLORS[r.type] ?? "bg-gray-400"}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">Total reactions received</p>
              <p className="text-2xl font-bold text-gray-900">{data.totalReactions.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        {/* Top posts */}
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5">
            <p className="font-semibold text-gray-900 mb-0.5">Top performing posts</p>
            <p className="text-xs text-gray-400 mb-4">Ranked by total engagement</p>
            {data.topPosts.length === 0 ? (
              <div className="text-center py-6">
                <FileTextIcon className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No posts yet</p>
                <Link href="/feed" className="text-xs text-primary font-semibold mt-2 inline-block hover:underline">Create your first post →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.topPosts.map((post, i) => (
                  <Link href="/feed" key={post.id}>
                    <div className="flex gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${
                        i === 0 ? "bg-amber-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-300" : "bg-gray-200 text-gray-500"
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-700 line-clamp-2 group-hover:text-primary transition-colors">{post.snippet}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-gray-400">👍 {post.reactions}</span>
                          <span className="text-[11px] text-gray-400">💬 {post.comments}</span>
                          <span className="text-[11px] text-gray-400">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 group-hover:text-primary flex-shrink-0 self-center" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Network & engagement row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5 text-center">
            <UsersIcon className="w-6 h-6 text-violet-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{data.totalFollowers.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Followers</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5 text-center">
            <UsersIcon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{data.totalFollowing.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Following</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5 text-center">
            <MessageSquareIcon className="w-6 h-6 text-fuchsia-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{data.totalComments.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Comments received</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-gray-200 shadow-none bg-white">
          <CardContent className="p-5 text-center">
            <FileTextIcon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{data.totalPosts.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total posts</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

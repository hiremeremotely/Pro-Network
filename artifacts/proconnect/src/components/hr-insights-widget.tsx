import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  DollarSignIcon,
  UsersIcon,
  BriefcaseIcon,
  ArrowRightIcon,
  BarChart2Icon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface Candidate {
  id: number;
  name: string;
  headline: string;
  avatarUrl: string | null;
  location: string | null;
  skills: string[];
}

interface HiringTrend {
  recent: number;
  previous: number;
  trend: "up" | "down" | "flat";
}

interface HRInsights {
  topCategory: string | null;
  marketSalary: { min: number; max: number; median: number; currency: string } | null;
  topCandidates: Candidate[];
  hiringTrend: HiringTrend;
  totalApplicants: number;
  totalJobs: number;
}

function formatSalary(n: number, currency: string): string {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(0)}K`;
  return `${currency} ${n.toLocaleString()}`;
}

interface Props {
  companyProfileId: number;
}

export function HRInsightsWidget({ companyProfileId }: Props) {
  const [insights, setInsights] = useState<HRInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyProfileId) return;
    setLoading(true);
    fetch(`${BASE}api/hr-insights?companyProfileId=${companyProfileId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setInsights(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyProfileId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!insights) return null;

  const { topCategory, marketSalary, topCandidates, hiringTrend, totalApplicants, totalJobs } = insights;

  const TrendIcon = hiringTrend.trend === "up"
    ? TrendingUpIcon
    : hiringTrend.trend === "down"
    ? TrendingDownIcon
    : MinusIcon;

  const trendColor = hiringTrend.trend === "up"
    ? "text-green-600"
    : hiringTrend.trend === "down"
    ? "text-red-500"
    : "text-gray-400";

  const trendBg = hiringTrend.trend === "up"
    ? "bg-green-50 border-green-200"
    : hiringTrend.trend === "down"
    ? "bg-red-50 border-red-200"
    : "bg-gray-50 border-gray-200";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
            <BarChart2Icon className="w-4 h-4 text-indigo-600" />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Market Insights</h3>
        </div>
        <Link href="/salary-estimator">
          <button className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium">
            Salary Tool <ArrowRightIcon className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div className="p-5 space-y-5">
        {/* Overview stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex justify-center mb-1">
              <BriefcaseIcon className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{totalJobs}</p>
            <p className="text-xs text-gray-500">Active jobs</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex justify-center mb-1">
              <UsersIcon className="w-4 h-4 text-gray-500" />
            </div>
            <p className="text-xl font-bold text-gray-900">{totalApplicants}</p>
            <p className="text-xs text-gray-500">Total applicants</p>
          </div>
        </div>

        {/* Application trend */}
        <div className={`rounded-xl border p-3.5 ${trendBg}`}>
          <div className="flex items-center gap-2 mb-1">
            <TrendIcon className={`w-4 h-4 ${trendColor}`} />
            <span className="text-xs font-semibold text-gray-700">Hiring Activity (30 days)</span>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className={`text-lg font-bold ${trendColor}`}>{hiringTrend.recent}</p>
              <p className="text-xs text-gray-500">applications this month</p>
            </div>
            <div className="text-right">
              {hiringTrend.previous > 0 ? (
                <>
                  <p className="text-sm text-gray-400">{hiringTrend.previous} last month</p>
                  <p className={`text-xs font-semibold ${trendColor}`}>
                    {hiringTrend.trend === "up" ? "▲ Increasing" : hiringTrend.trend === "down" ? "▼ Declining" : "→ Steady"}
                  </p>
                </>
              ) : (
                <p className="text-xs text-gray-400">No prior data</p>
              )}
            </div>
          </div>
        </div>

        {/* Market salary */}
        {topCategory && marketSalary && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSignIcon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-800">Market Rate · {topCategory}</span>
            </div>
            <p className="text-xs text-indigo-600 mb-2.5">Mid-level remote · USD global baseline</p>
            <div className="relative h-5">
              <div className="absolute inset-y-1.5 left-0 right-0 bg-indigo-100 rounded-full" />
              <div className="absolute inset-y-1.5 bg-indigo-500 rounded-full" style={{ left: "0%", width: "100%" }} />
              {/* Median marker */}
              <div
                className="absolute top-0 h-5 w-0.5 bg-white shadow"
                style={{
                  left: `${((marketSalary.median - marketSalary.min) / (marketSalary.max - marketSalary.min)) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[10px]">
              <span className="text-indigo-600">{formatSalary(marketSalary.min, marketSalary.currency)}</span>
              <span className="text-indigo-700 font-bold">{formatSalary(marketSalary.median, marketSalary.currency)} median</span>
              <span className="text-indigo-600">{formatSalary(marketSalary.max, marketSalary.currency)}</span>
            </div>
          </div>
        )}

        {/* Top matching candidates */}
        {topCandidates.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Suggested Talent Matches</h4>
            <div className="space-y-2.5">
              {topCandidates.map(candidate => {
                const initials = candidate.name
                  .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Link key={candidate.id} href={`/profiles/${candidate.id}`}>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                      <Avatar className="w-9 h-9 border border-gray-200 flex-shrink-0">
                        <AvatarImage src={candidate.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate group-hover:text-primary transition-colors">{candidate.name}</p>
                        <p className="text-xs text-gray-500 truncate">{candidate.headline}</p>
                        {candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {candidate.skills.slice(0, 3).map(skill => (
                              <span key={skill} className="text-[9px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5 font-medium">{skill}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ArrowRightIcon className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {topCandidates.length === 0 && (
          <div className="text-center py-3">
            <p className="text-xs text-gray-400">Post jobs to see matching candidate suggestions here</p>
          </div>
        )}

        {/* Link to salary estimator */}
        <Link href="/salary-estimator">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
            <DollarSignIcon className="w-4 h-4" />
            Open Salary Estimator
          </button>
        </Link>
      </div>
    </div>
  );
}

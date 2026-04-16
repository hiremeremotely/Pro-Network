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
  ChevronRightIcon,
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
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-3.5 bg-gray-100 rounded w-1/2 mb-3" />
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg" />)}
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

  const trendLabel = hiringTrend.trend === "up" ? "▲ Rising" : hiringTrend.trend === "down" ? "▼ Falling" : "→ Steady";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-indigo-100 rounded-md flex items-center justify-center flex-shrink-0">
            <BarChart2Icon className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <span className="text-sm font-bold text-gray-900">Market Insights</span>
        </div>
        <Link href="/salary-estimator">
          <button className="text-[11px] text-indigo-600 hover:underline flex items-center gap-0.5 font-medium">
            Salary Tool <ChevronRightIcon className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div className="p-4 space-y-3">
        {/* Compact inline stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              <BriefcaseIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight">{totalJobs}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Active jobs</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
              <UsersIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 leading-tight">{totalApplicants}</p>
              <p className="text-[10px] text-gray-500 leading-tight">Applicants</p>
            </div>
          </div>
        </div>

        {/* Hiring activity — compact row */}
        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor} flex-shrink-0`} />
              <span className="text-[11px] font-semibold text-gray-700">Hiring Activity</span>
              <span className="text-[10px] text-gray-400">(30 days)</span>
            </div>
            <span className={`text-[10px] font-bold ${trendColor}`}>{trendLabel}</span>
          </div>
          <div className="flex items-end justify-between mt-1.5">
            <div>
              <span className={`text-lg font-bold ${trendColor}`}>{hiringTrend.recent}</span>
              <span className="text-[10px] text-gray-500 ml-1">this month</span>
            </div>
            {hiringTrend.previous > 0 && (
              <span className="text-[10px] text-gray-400">{hiringTrend.previous} last month</span>
            )}
          </div>
        </div>

        {/* Market salary — compact */}
        {topCategory && marketSalary && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2.5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <DollarSignIcon className="w-3 h-3 text-indigo-600" />
                <span className="text-[10px] font-semibold text-indigo-800">Market Rate</span>
              </div>
              <span className="text-[10px] text-indigo-500 font-medium truncate max-w-[80px]">{topCategory}</span>
            </div>
            <div className="relative h-3.5 mb-1.5">
              <div className="absolute inset-y-[5px] left-0 right-0 bg-indigo-100 rounded-full" />
              <div className="absolute inset-y-[5px] bg-indigo-400 rounded-full" style={{ left: "0%", width: "100%" }} />
              <div
                className="absolute top-0 h-3.5 w-0.5 bg-white shadow-sm"
                style={{
                  left: `${((marketSalary.median - marketSalary.min) / (marketSalary.max - marketSalary.min)) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
            <div className="flex justify-between text-[9px]">
              <span className="text-indigo-500">{formatSalary(marketSalary.min, marketSalary.currency)}</span>
              <span className="text-indigo-700 font-bold">{formatSalary(marketSalary.median, marketSalary.currency)} med.</span>
              <span className="text-indigo-500">{formatSalary(marketSalary.max, marketSalary.currency)}</span>
            </div>
          </div>
        )}

        {/* Top matching candidates */}
        {topCandidates.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggested Matches</p>
            <div className="space-y-1.5">
              {topCandidates.slice(0, 3).map(candidate => {
                const initials = candidate.name
                  .split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Link key={candidate.id} href={`/profiles/${candidate.id}`}>
                    <div className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group">
                      <Avatar className="w-7 h-7 border border-gray-200 flex-shrink-0">
                        <AvatarImage src={candidate.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate group-hover:text-primary transition-colors leading-tight">{candidate.name}</p>
                        <p className="text-[10px] text-gray-400 truncate">{candidate.headline}</p>
                      </div>
                      <ArrowRightIcon className="w-3 h-3 text-gray-300 group-hover:text-primary flex-shrink-0 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {topCandidates.length === 0 && (
          <p className="text-[11px] text-gray-400 text-center py-1">Post jobs to see matching candidate suggestions</p>
        )}

        {/* CTA */}
        <Link href="/salary-estimator">
          <button className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors">
            <DollarSignIcon className="w-3.5 h-3.5" />
            Open Salary Estimator
          </button>
        </Link>
      </div>
    </div>
  );
}

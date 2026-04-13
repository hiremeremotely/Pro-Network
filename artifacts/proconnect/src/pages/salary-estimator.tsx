import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Button } from "@/components/ui/button";
import {
  DollarSignIcon,
  ArrowLeftIcon,
  TrendingUpIcon,
  BriefcaseIcon,
  GlobeIcon,
  InfoIcon,
  ChevronDownIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface SalaryEstimate {
  country: string;
  category: string;
  level: string;
  currency: string;
  min: number;
  max: number;
  median: number;
  employerCostPct: number;
  estimatedEmployerCost: number;
  totalCostToCompany: number;
}

interface Meta {
  countries: string[];
  categories: string[];
  levels: string[];
}

const LEVEL_LABELS: Record<string, string> = {
  junior: "Junior (0–2 yrs)",
  mid: "Mid-Level (2–5 yrs)",
  senior: "Senior (5–9 yrs)",
  lead: "Lead / Principal (9+ yrs)",
};

const CATEGORY_ICONS: Record<string, string> = {
  Engineering: "⚙️",
  Design: "🎨",
  Product: "📦",
  Marketing: "📢",
  Sales: "💼",
  Operations: "🔧",
  Finance: "📊",
  Data: "🗄️",
  "Customer Support": "🎧",
  HR: "🧑‍🤝‍🧑",
};

function formatNumber(n: number, currency: string): string {
  if (n >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${currency} ${(n / 1_000).toFixed(0)}K`;
  return `${currency} ${n.toLocaleString()}`;
}

function SalaryBar({
  min, max, median, currency,
}: { min: number; max: number; median: number; currency: string }) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100;
  const medPct = pct(median);

  return (
    <div className="mt-4">
      <div className="relative h-6 w-full">
        <div className="absolute inset-y-2 left-0 right-0 bg-indigo-100 rounded-full" />
        <div
          className="absolute inset-y-2 bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
          style={{ left: "0%", right: `${100 - 100}%`, width: "100%" }}
        />
        <div
          className="absolute top-0 h-6 w-0.5 bg-white shadow-md"
          style={{ left: `${medPct}%`, transform: "translateX(-50%)" }}
        />
        <div
          className="absolute -top-7 text-[10px] font-bold text-indigo-700 whitespace-nowrap"
          style={{ left: `${medPct}%`, transform: "translateX(-50%)" }}
        >
          Median
        </div>
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span className="font-medium text-gray-700">{formatNumber(min, currency)}</span>
        <span className="font-semibold text-indigo-700">{formatNumber(median, currency)} / yr</span>
        <span className="font-medium text-gray-700">{formatNumber(max, currency)}</span>
      </div>
    </div>
  );
}

export default function SalaryEstimator() {
  const { user } = useAppAuth();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [country, setCountry] = useState("United States");
  const [category, setCategory] = useState("Engineering");
  const [level, setLevel] = useState("mid");
  const [estimate, setEstimate] = useState<SalaryEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}api/salary-estimate/meta`)
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  async function handleEstimate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE}api/salary-estimate?country=${encodeURIComponent(country)}&category=${encodeURIComponent(category)}&level=${encodeURIComponent(level)}`
      );
      if (!res.ok) throw new Error("Failed to fetch estimate");
      const data = await res.json();
      setEstimate(data);
    } catch {
      setError("Could not fetch salary estimate. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const countries = meta?.countries ?? [];
  const categories = meta?.categories ?? [];
  const levels = meta?.levels ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      {user?.accountType === "company" && (
        <Link href="/company-dashboard">
          <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Company Dashboard
          </button>
        </Link>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <DollarSignIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Remote Salary Estimator</h1>
            <p className="text-sm text-gray-500">Research competitive pay across 20+ countries by role and experience level</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Selector panel ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">Configure Estimate</h2>

            {/* Country */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <GlobeIcon className="inline w-3.5 h-3.5 mr-1" />Country / Region
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={e => { setCountry(e.target.value); setEstimate(null); }}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
                >
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <BriefcaseIcon className="inline w-3.5 h-3.5 mr-1" />Job Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setEstimate(null); }}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                      category === cat
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-base leading-none">{CATEGORY_ICONS[cat] ?? "💼"}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                <TrendingUpIcon className="inline w-3.5 h-3.5 mr-1" />Experience Level
              </label>
              <div className="space-y-2">
                {levels.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => { setLevel(lvl); setEstimate(null); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                      level === lvl
                        ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${level === lvl ? "bg-indigo-500" : "bg-gray-200"}`} />
                    {LEVEL_LABELS[lvl] ?? lvl}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              onClick={handleEstimate}
              disabled={loading}
            >
              <DollarSignIcon className="w-4 h-4" />
              {loading ? "Calculating…" : "Get Salary Estimate"}
            </Button>

            {error && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
          </div>

          {/* Info card */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-2">
              <InfoIcon className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 leading-relaxed">
                <strong>Data source:</strong> Salary ranges are research-based benchmarks for remote roles, calibrated for 2024/2025. Figures represent base salary in the local currency. Employer cost % covers social contributions, benefits, and taxes but excludes equity.
              </div>
            </div>
          </div>
        </div>

        {/* ── Results panel ── */}
        <div className="lg:col-span-3 space-y-5">
          {!estimate && !loading && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm flex flex-col items-center justify-center text-center min-h-[340px]">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <DollarSignIcon className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-gray-500 font-medium mb-1">Select options and click</p>
              <p className="text-lg font-bold text-gray-800">"Get Salary Estimate"</p>
              <p className="text-sm text-gray-400 mt-2">to see salary ranges, cost breakdowns, and regional benchmarks</p>
            </div>
          )}

          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 p-10 shadow-sm flex items-center justify-center min-h-[340px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-500">Calculating salary range…</p>
              </div>
            </div>
          )}

          {estimate && !loading && (
            <>
              {/* Main result card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-sm opacity-80">
                      {CATEGORY_ICONS[estimate.category] ?? "💼"} {estimate.category} · {LEVEL_LABELS[estimate.level] ?? estimate.level}
                    </div>
                    <div className="text-xs opacity-70 bg-white/20 px-2 py-0.5 rounded-full">{estimate.country}</div>
                  </div>
                  <p className="text-3xl font-bold mt-1">{formatNumber(estimate.median, estimate.currency)}<span className="text-lg font-normal opacity-80"> / yr</span></p>
                  <p className="text-sm opacity-75 mt-0.5">Median base salary (remote)</p>
                </div>

                <div className="p-6">
                  <div className="mt-2 mb-6">
                    <SalaryBar min={estimate.min} max={estimate.max} median={estimate.median} currency={estimate.currency} />
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Minimum</p>
                      <p className="text-sm font-bold text-gray-900">{formatNumber(estimate.min, estimate.currency)}</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-xs text-indigo-600 mb-1">Median</p>
                      <p className="text-sm font-bold text-indigo-700">{formatNumber(estimate.median, estimate.currency)}</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Maximum</p>
                      <p className="text-sm font-bold text-gray-900">{formatNumber(estimate.max, estimate.currency)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Employer cost card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Employer Cost Breakdown</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Base salary (median)</span>
                    <span className="text-sm font-semibold text-gray-900">{formatNumber(estimate.median, estimate.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2.5 border-b border-gray-100">
                    <div>
                      <span className="text-sm text-gray-600">Employer costs</span>
                      <span className="ml-1.5 text-xs text-gray-400">(social + taxes + benefits · ~{estimate.employerCostPct}%)</span>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">+ {formatNumber(estimate.estimatedEmployerCost, estimate.currency)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-sm font-bold text-gray-900">Total cost to company</span>
                    <span className="text-base font-bold text-indigo-700">{formatNumber(estimate.totalCostToCompany, estimate.currency)}</span>
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-gray-400 leading-relaxed">
                  Contractor engagements typically reduce employer costs to ~5–8% (no benefits, reduced NI). Figures are estimates only and do not constitute legal or tax advice.
                </p>
              </div>

              {/* Currency & context */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                <p className="text-xs text-indigo-700 leading-relaxed">
                  <strong>All figures in {estimate.currency}.</strong> Remote roles in {estimate.country} are priced in local currency, though many international remote employers offer USD or EUR-denominated contracts. Adjust accordingly based on your company's pay policy.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

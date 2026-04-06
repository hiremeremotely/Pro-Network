import { useState } from "react";
import { Link } from "wouter";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { JobCard } from "@/components/job-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, BriefcaseIcon, XIcon, MapPinIcon, ClockIcon, DollarSignIcon } from "lucide-react";
import type { Job } from "@workspace/api-client-react";

const CATEGORIES = ["Engineering", "Design", "Product", "Data", "Marketing", "Sales"];
const LEVELS = ["Entry", "Mid-level", "Senior", "Staff", "Manager"];

const LEVEL_COLORS: Record<string, string> = {
  Senior: "bg-purple-50 text-purple-700",
  Staff: "bg-indigo-50 text-indigo-700",
  "Mid-level": "bg-blue-50 text-blue-700",
  Entry: "bg-green-50 text-green-700",
  Manager: "bg-orange-50 text-orange-700",
};

function JobRow({ job }: { job: Job & { applicationCount?: number } }) {
  const salary = job.salaryMin && job.salaryMax
    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
    : null;
  return (
    <Link href={`/jobs/${job.id}`}>
      <div className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BriefcaseIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{job.title}</p>
            {job.featured && <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded flex-shrink-0">Featured</Badge>}
          </div>
          <p className="text-xs text-gray-500">{job.company}</p>
        </div>
        {job.location && (
          <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <MapPinIcon className="w-3.5 h-3.5" />{job.location}
          </div>
        )}
        {salary && (
          <div className="hidden lg:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <DollarSignIcon className="w-3.5 h-3.5" />{salary}
          </div>
        )}
        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 flex-shrink-0 hidden sm:inline-flex ${LEVEL_COLORS[job.experienceLevel] || "bg-gray-100 text-gray-500"}`}>
          {job.experienceLevel}
        </Badge>
        <Button size="sm" className="rounded-full px-4 text-xs flex-shrink-0 hidden sm:flex">Apply</Button>
      </div>
    </Link>
  );
}

function JobTableRow({ job, index }: { job: Job & { applicationCount?: number }; index: number }) {
  const salary = job.salaryMin && job.salaryMax
    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
    : "—";
  return (
    <tr className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
      <td className="px-4 py-3">
        <Link href={`/jobs/${job.id}`} className="group">
          <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">{job.title}</p>
          {job.featured && <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded mt-0.5">Featured</Badge>}
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{job.company}</td>
      <td className="px-4 py-3 text-sm text-gray-400">{job.location || "—"}</td>
      <td className="px-4 py-3">
        <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${LEVEL_COLORS[job.experienceLevel] || "bg-gray-100 text-gray-500"}`}>
          {job.experienceLevel}
        </Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{salary}</td>
      <td className="px-4 py-3">
        <Link href={`/jobs/${job.id}`}>
          <Button size="sm" className="rounded-full px-3 text-xs">Apply</Button>
        </Link>
      </td>
    </tr>
  );
}

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [view, setView] = useState<ViewMode>("grid");

  const params = {
    search: query || undefined,
    category: category || undefined,
    experienceLevel: level || undefined,
    limit: 20,
    offset: 0,
  };

  const { data, isLoading, error, refetch } = useListJobs(params, {
    query: { queryKey: getListJobsQueryKey(params) }
  });

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
  }

  function clearFilters() {
    setSearch(""); setQuery(""); setCategory(""); setLevel("");
  }

  const hasFilters = query || category || level;

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BriefcaseIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Remote Jobs</h1>
        </div>
        <p className="text-muted-foreground">Find your next remote role at forward-thinking companies.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search jobs, companies..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Button type="submit">Search</Button>
        </form>

        <div className="flex gap-2 items-center flex-wrap">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters">
              <XIcon className="w-4 h-4" />
            </Button>
          )}

          <div className="ml-auto md:ml-0">
            <ViewToggle view={view} onChange={setView} options={["grid", "list", "table"]} />
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading jobs..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !data?.jobs?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No jobs found</p>
          {hasFilters && <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{data.total} job{data.total !== 1 ? "s" : ""} found</p>

          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.jobs.map((job) => <JobCard key={job.id} job={job} featured={job.featured} />)}
            </div>
          )}

          {view === "list" && (
            <div className="flex flex-col gap-2">
              {data.jobs.map((job) => <JobRow key={job.id} job={job} />)}
            </div>
          )}

          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Level</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Salary</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.map((job, i) => <JobTableRow key={job.id} job={job} index={i} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

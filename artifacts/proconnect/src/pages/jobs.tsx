import { useState } from "react";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { JobCard } from "@/components/job-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchIcon, BriefcaseIcon, XIcon } from "lucide-react";

const CATEGORIES = ["Engineering", "Design", "Product", "Data", "Marketing", "Sales"];
const LEVELS = ["Entry", "Mid-level", "Senior", "Staff", "Manager"];

export default function Jobs() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("");
  const [level, setLevel] = useState<string>("");

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
    setSearch("");
    setQuery("");
    setCategory("");
    setLevel("");
  }

  const hasFilters = query || category || level;

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BriefcaseIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Remote Jobs</h1>
        </div>
        <p className="text-muted-foreground">Find your next remote role at forward-thinking companies.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search jobs, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-jobs"
            />
          </div>
          <Button type="submit" data-testid="button-search-jobs">Search</Button>
        </form>

        <div className="flex gap-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-40" data-testid="select-level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear filters" data-testid="button-clear-filters">
              <XIcon className="w-4 h-4" />
            </Button>
          )}
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
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters}>Clear filters</Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">{data.total} job{data.total !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} featured={job.featured} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

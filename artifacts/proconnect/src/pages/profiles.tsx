import { useState } from "react";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { ProfileCard } from "@/components/profile-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, UsersIcon } from "lucide-react";

export default function Profiles() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const { data, isLoading, error, refetch } = useListProfiles(
    { search: query || undefined, limit: 20, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ search: query || undefined, limit: 20, offset: 0 }) } }
  );

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <UsersIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Professional Network</h1>
        </div>
        <p className="text-muted-foreground">Discover and connect with remote professionals worldwide.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-3 mb-8 max-w-lg">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name, headline, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search-profiles"
          />
        </div>
        <Button type="submit" data-testid="button-search-profiles">Search</Button>
      </form>

      {isLoading ? (
        <LoadingState message="Loading professionals..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !data?.profiles?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <UsersIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No professionals found</p>
          {query && (
            <Button variant="ghost" onClick={() => { setSearch(""); setQuery(""); }}>Clear search</Button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-6">{data.total} professional{data.total !== 1 ? "s" : ""} found</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.profiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { useAppAuth } from "@/contexts/app-auth";
import { ProfileCard } from "@/components/profile-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, UsersIcon, MapPinIcon, GlobeIcon, GithubIcon, XIcon, LoaderIcon } from "lucide-react";
import type { Profile } from "@workspace/api-client-react";

function ProfileRow({ profile }: { profile: Profile }) {
  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <Link href={`/profiles/${profile.id}`}>
      <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
        <Avatar className="w-12 h-12 border border-gray-100 flex-shrink-0">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="font-semibold bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">{profile.name}</p>
          <p className="text-xs text-gray-500 truncate">{profile.headline}</p>
        </div>
        {profile.location && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <MapPinIcon className="w-3.5 h-3.5" />
            {profile.location}
          </div>
        )}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {profile.githubUrl && <GithubIcon className="w-3.5 h-3.5 text-gray-300 hover:text-gray-600" />}
          {profile.website && <GlobeIcon className="w-3.5 h-3.5 text-gray-300 hover:text-gray-600" />}
        </div>
        {profile.openToWork && (
          <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full flex-shrink-0">Open</Badge>
        )}
        <Button size="sm" variant="outline" className="rounded-full px-3 text-xs border-primary/30 text-primary hover:bg-primary/5 flex-shrink-0 hidden sm:flex">
          Connect
        </Button>
      </div>
    </Link>
  );
}

function ProfileTableRow({ profile, index }: { profile: Profile; index: number }) {
  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <tr className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
      <td className="px-4 py-3">
        <Link href={`/profiles/${profile.id}`} className="flex items-center gap-3 group">
          <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
            <AvatarImage src={profile.avatarUrl || undefined} />
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <span className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">{profile.name}</span>
        </Link>
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
        <span className="truncate block">{profile.headline}</span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">
        {profile.location && (
          <div className="flex items-center gap-1">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {profile.location}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        {profile.openToWork ? (
          <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full">Open to Work</Badge>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Button size="sm" variant="outline" className="rounded-full px-3 text-xs border-primary/30 text-primary hover:bg-primary/5">
          Connect
        </Button>
      </td>
    </tr>
  );
}

export default function Profiles() {
  const { user } = useAppAuth();
  const searchString = useSearch();
  const initialSearch = new URLSearchParams(searchString).get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery] = useState(initialSearch);
  const [view, setView] = useState<ViewMode>("grid");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when URL search param changes (e.g. navigating from global search)
  useEffect(() => {
    const term = new URLSearchParams(searchString).get("search") ?? "";
    setSearch(term);
    setQuery(term);
  }, [searchString]);

  // Debounce: update query 300ms after the user manually types
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching, error, refetch } = useListProfiles(
    { search: query || undefined, limit: 20, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ search: query || undefined, limit: 20, offset: 0 }) } }
  );

  const profiles = (data?.profiles ?? []).filter(p => p.id !== user?.id);

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <UsersIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Professional Network</h1>
        </div>
        <p className="text-muted-foreground">Discover and connect with remote professionals worldwide.</p>
      </div>

      {/* Search bar — real-time, no submit button */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            placeholder="Filter by name, headline, or location..."
            autoComplete="off"
            className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-sm"
            onChange={e => setSearch(e.target.value)}
          />
          {/* Right side: spinner while fetching, or X to clear */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isFetching && search ? (
              <LoaderIcon className="w-3.5 h-3.5 text-gray-400 animate-spin" />
            ) : search ? (
              <button
                type="button"
                onClick={() => { setSearch(""); inputRef.current?.focus(); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <ViewToggle view={view} onChange={setView} options={["grid", "list", "table"]} />
      </div>

      {isLoading ? (
        <LoadingState message="Loading professionals..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !profiles.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <UsersIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">{search ? `No results for "${search}"` : "No professionals found"}</p>
          {search && (
            <button onClick={() => setSearch("")} className="text-sm text-primary hover:underline">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            {profiles.length} professional{profiles.length !== 1 ? "s" : ""}
            {search && <span className="ml-1">matching <span className="font-medium text-gray-700">"{search}"</span></span>}
          </p>

          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {profiles.map((profile) => <ProfileCard key={profile.id} profile={profile} />)}
            </div>
          )}

          {view === "list" && (
            <div className="flex flex-col gap-2">
              {profiles.map((profile) => <ProfileRow key={profile.id} profile={profile} />)}
            </div>
          )}

          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Headline</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile, i) => <ProfileTableRow key={profile.id} profile={profile} index={i} />)}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

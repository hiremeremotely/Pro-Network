import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { useAppAuth } from "@/contexts/app-auth";
import { ProfileCard } from "@/components/profile-card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Input } from "@/components/ui/input";
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

// ── Typeahead Search Input ────────────────────────────────────────────────────
function ProfileSearchInput({
  value,
  onChange,
  onCommit,
  excludeId,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
  excludeId?: number;
}) {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce the suggestions query by 250 ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  const { data: suggestData, isFetching } = useListProfiles(
    { search: debounced || undefined, limit: 6, offset: 0 },
    {
      query: {
        enabled: debounced.length >= 1,
        queryKey: getListProfilesQueryKey({ search: debounced || undefined, limit: 6, offset: 0 }),
      },
    }
  );

  const suggestions = (suggestData?.profiles ?? []).filter(p => p.id !== excludeId);

  // Close on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") { e.preventDefault(); onCommit(value); setOpen(false); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) {
        navigate(`/profiles/${suggestions[highlighted].id}`);
        setOpen(false);
      } else {
        onCommit(value);
        setOpen(false);
      }
    } else if (e.key === "Escape") { setOpen(false); setHighlighted(-1); }
  }

  const showDropdown = open && value.length >= 1 && (isFetching || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Search by name, headline, or location..."
        autoComplete="off"
        className="w-full h-10 pl-9 pr-9 rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onChange={e => { onChange(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => { if (value.length >= 1) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(""); onCommit(""); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          {isFetching && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
              <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> Searching...
            </div>
          ) : (
            <>
              {suggestions.map((profile, i) => {
                const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onMouseDown={() => { navigate(`/profiles/${profile.id}`); setOpen(false); }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${highlighted === i ? "bg-primary/5" : "hover:bg-gray-50"}`}
                  >
                    <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                      <AvatarImage src={profile.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.name}</p>
                      {profile.headline && <p className="text-xs text-gray-400 truncate">{profile.headline}</p>}
                    </div>
                    {profile.location && (
                      <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                        <MapPinIcon className="w-3 h-3" /> {profile.location}
                      </div>
                    )}
                    {profile.openToWork && (
                      <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full flex-shrink-0">Open</Badge>
                    )}
                  </button>
                );
              })}
              <button
                type="button"
                onMouseDown={() => { onCommit(value); setOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-primary font-medium border-t border-gray-100 hover:bg-primary/5 transition-colors"
              >
                <SearchIcon className="w-3.5 h-3.5" />
                Search all results for <span className="font-bold">"{value}"</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Profiles() {
  const { user } = useAppAuth();
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  const { data, isLoading, error, refetch } = useListProfiles(
    { search: query || undefined, limit: 20, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ search: query || undefined, limit: 20, offset: 0 }) } }
  );

  const profiles = (data?.profiles ?? []).filter(p => p.id !== user?.id);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <UsersIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">Professional Network</h1>
        </div>
        <p className="text-muted-foreground">Discover and connect with remote professionals worldwide.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1">
          <ProfileSearchInput
            value={search}
            onChange={setSearch}
            onCommit={(v) => setQuery(v)}
            excludeId={user?.id}
          />
          <Button type="submit">Search</Button>
        </form>
        <ViewToggle view={view} onChange={setView} options={["grid", "list", "table"]} />
      </div>

      {isLoading ? (
        <LoadingState message="Loading professionals..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !profiles.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <UsersIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No professionals found</p>
          {query && <Button variant="ghost" onClick={() => { setSearch(""); setQuery(""); }}>Clear search</Button>}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{profiles.length} professional{profiles.length !== 1 ? "s" : ""} found</p>

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

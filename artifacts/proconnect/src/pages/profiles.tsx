import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { useStartChat } from "@/hooks/use-start-chat";
import { ProfileCard } from "@/components/profile-card";
import { LoadingState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  SearchIcon, UsersIcon, MapPinIcon, XIcon, LoaderIcon,
  UserCheckIcon, UserPlusIcon, MessageSquareIcon, SparklesIcon,
  StarIcon,
} from "lucide-react";
import type { Profile } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL;

// ── Shared action buttons ─────────────────────────────────────────────────────

function ConnectButton({ profileId, isConnected, onToggle, accountType, className = "" }: {
  profileId: number; isConnected: boolean; onToggle: (id: number) => void;
  accountType?: string | null; className?: string;
}) {
  const isCompany = accountType === "company";
  return (
    <Button size="sm" variant={isConnected ? "secondary" : "outline"}
      onClick={e => { e.preventDefault(); e.stopPropagation(); onToggle(profileId); }}
      className={`rounded-full px-3 text-xs gap-1 flex-shrink-0 ${
        isConnected
          ? "bg-primary/10 text-primary border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
          : "border-primary/30 text-primary hover:bg-primary/5"
      } ${className}`}
    >
      {isConnected
        ? <><UserCheckIcon className="w-3 h-3" /> Following</>
        : isCompany
          ? <><UserPlusIcon className="w-3 h-3" /> Follow</>
          : <><UserPlusIcon className="w-3 h-3" /> Connect</>}
    </Button>
  );
}

function MessageButton({ profileId, onMessage, className = "" }: {
  profileId: number; onMessage: (id: number) => void; className?: string;
}) {
  return (
    <Button size="sm" variant="outline"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onMessage(profileId); }}
      className={`rounded-full px-3 text-xs gap-1 flex-shrink-0 border-gray-300 text-gray-600 hover:bg-gray-50 ${className}`}
    >
      <MessageSquareIcon className="w-3 h-3" /> Message
    </Button>
  );
}

// ── Profile row (list view) ───────────────────────────────────────────────────

function ProfileRow({ profile, isConnected, onToggle, onMessage, badge }: {
  profile: Profile; isConnected: boolean; onToggle: (id: number) => void;
  onMessage: (id: number) => void; badge?: React.ReactNode;
}) {
  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <Link href={`/profiles/${profile.id}`}>
      <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
        <Avatar className="w-12 h-12 border border-gray-100 flex-shrink-0">
          <AvatarImage src={profile.avatarUrl || undefined} />
          <AvatarFallback className="font-semibold bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{profile.name}</p>
            {badge}
          </div>
          <p className="text-xs text-gray-500 truncate">{profile.headline}</p>
          {profile.industry && <p className="text-[11px] text-gray-400 truncate">{profile.industry}</p>}
        </div>
        {profile.location && (
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <MapPinIcon className="w-3.5 h-3.5" />{profile.location}
          </div>
        )}
        {profile.openToWork && (
          <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full flex-shrink-0">Open</Badge>
        )}
        <div className="hidden sm:flex items-center gap-2">
          <MessageButton profileId={profile.id} onMessage={onMessage} />
          <ConnectButton profileId={profile.id} isConnected={isConnected} onToggle={onToggle} accountType={profile.accountType} />
        </div>
      </div>
    </Link>
  );
}

// ── My Network tab ────────────────────────────────────────────────────────────

function MyNetworkTab({ userId, isConnected, onToggle, onMessage }: {
  userId: number; isConnected: (id: number) => boolean;
  onToggle: (id: number) => void; onMessage: (id: number) => void;
}) {
  const { data, isLoading } = useQuery<{ profiles: Profile[]; total: number }>({
    queryKey: ["connections-network", userId],
    queryFn: () => fetch(`${BASE}api/connections/network?profileId=${userId}`).then(r => r.json()),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const profiles = data?.profiles ?? [];

  if (isLoading) return <LoadingState message="Loading your network…" />;

  if (profiles.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-muted-foreground gap-4">
        <UsersIcon className="w-12 h-12 opacity-20" />
        <p className="text-lg font-semibold">Your network is empty</p>
        <p className="text-sm text-gray-400 text-center max-w-xs">
          Use the Discover tab to search for professionals and start building your network.
        </p>
        <Button variant="outline" size="sm" className="rounded-full mt-1" onClick={() => {}}>Go to Discover</Button>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground mb-4">
        You're following <span className="font-semibold text-gray-700">{profiles.length}</span> {profiles.length === 1 ? "person" : "people"}
      </p>
      <div className="flex flex-col gap-2">
        {profiles.map(profile => (
          <ProfileRow
            key={profile.id}
            profile={profile}
            isConnected={isConnected(profile.id)}
            onToggle={onToggle}
            onMessage={onMessage}
          />
        ))}
      </div>
    </>
  );
}

// ── Discover tab ──────────────────────────────────────────────────────────────

function DiscoverTab({ userId, isConnected, onToggle, onMessage, initialSearch }: {
  userId: number | undefined; isConnected: (id: number) => boolean;
  onToggle: (id: number) => void; onMessage: (id: number) => void;
  initialSearch: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery]   = useState(initialSearch);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => { setSearch(initialSearch); setQuery(initialSearch); }, [initialSearch]);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Search results (when query typed)
  const { data: searchData, isLoading: searchLoading, isFetching } = useListProfiles(
    { search: query || undefined, limit: 20, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ search: query || undefined, limit: 20, offset: 0 }), enabled: !!query } }
  );
  const searchProfiles = (searchData?.profiles ?? []).filter(p => p.id !== userId);

  // Recommendations (when no query)
  const { data: recData, isLoading: recLoading } = useQuery<{ profiles: Profile[] }>({
    queryKey: ["connections-recommended", userId],
    queryFn: () => fetch(`${BASE}api/connections/recommended?profileId=${userId}`).then(r => r.json()),
    enabled: !!userId && !query,
    staleTime: 60_000,
  });
  const recProfiles = (recData?.profiles ?? []).filter(p => p.id !== userId);

  const isSearching = !!query;
  const isLoading   = isSearching ? searchLoading : recLoading;
  const profiles    = isSearching ? searchProfiles : recProfiles;

  return (
    <>
      {/* Search bar */}
      <div className="relative mb-6">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={search}
          placeholder="Search by name, job title, or email address…"
          autoComplete="off"
          className="w-full h-11 pl-9 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all shadow-sm"
          onChange={e => setSearch(e.target.value)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isFetching && query ? (
            <LoaderIcon className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          ) : search ? (
            <button onClick={() => { setSearch(""); inputRef.current?.focus(); }} className="text-gray-400 hover:text-gray-600">
              <XIcon className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <LoadingState message={isSearching ? "Searching…" : "Finding recommendations…"} />
      ) : profiles.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
          <SearchIcon className="w-10 h-10 opacity-20" />
          <p className="text-base font-medium">{isSearching ? `No results for "${query}"` : "No recommendations yet"}</p>
          {isSearching && (
            <p className="text-sm text-gray-400">Try searching by name, job title, or email address</p>
          )}
        </div>
      ) : (
        <>
          {!isSearching && (
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-700">Recommended for you</p>
              <span className="text-xs text-gray-400">· based on your industry &amp; interests</span>
            </div>
          )}
          {isSearching && (
            <p className="text-sm text-muted-foreground mb-4">
              {profiles.length} result{profiles.length !== 1 ? "s" : ""} for <span className="font-medium text-gray-700">"{query}"</span>
            </p>
          )}

          {/* Grid view for recommendations, list view for search */}
          {!isSearching ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profiles.map(profile => (
                <div key={profile.id} className="relative group">
                  <ProfileCard profile={profile} />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <MessageButton profileId={profile.id} onMessage={onMessage} className="shadow-sm" />
                    <ConnectButton profileId={profile.id} isConnected={isConnected(profile.id)} onToggle={onToggle} accountType={profile.accountType} className="shadow-sm" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {profiles.map(profile => (
                <ProfileRow
                  key={profile.id}
                  profile={profile}
                  isConnected={isConnected(profile.id)}
                  onToggle={onToggle}
                  onMessage={onMessage}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Profiles() {
  const { user } = useAppAuth();
  const searchString = useSearch();
  const initialSearch = new URLSearchParams(searchString).get("search") ?? "";
  const { isConnected, toggleConnect } = useConnections();
  const startChat = useStartChat();
  const [, navigate] = useLocation();

  const [tab, setTab] = useState<"network" | "discover">(
    initialSearch ? "discover" : "network"
  );

  const handleMessage = useCallback(async (profileId: number) => {
    await startChat(profileId);
    navigate("/messaging");
  }, [startChat, navigate]);

  // Network size badge
  const { data: netData } = useQuery<{ profiles: Profile[]; total: number }>({
    queryKey: ["connections-network", user?.id],
    queryFn: () => fetch(`${BASE}api/connections/network?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });
  const networkSize = netData?.total ?? 0;

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <UsersIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Network</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage your connections and discover remote professionals.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {([
          { key: "network", label: "My Network", count: networkSize },
          { key: "discover", label: "Discover", icon: SparklesIcon },
        ] as const).map(({ key, label, count, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${tab === key ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-500"}`}>
                {count}
              </span>
            )}
            {Icon && <Icon className="w-3.5 h-3.5" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "network" ? (
        user ? (
          <MyNetworkTab
            userId={user.id}
            isConnected={isConnected}
            onToggle={toggleConnect}
            onMessage={handleMessage}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">Sign in to see your network</p>
            <Button asChild variant="outline" className="rounded-full"><Link href="/login">Sign in</Link></Button>
          </div>
        )
      ) : (
        <DiscoverTab
          userId={user?.id}
          isConnected={isConnected}
          onToggle={toggleConnect}
          onMessage={handleMessage}
          initialSearch={initialSearch}
        />
      )}
    </div>
  );
}

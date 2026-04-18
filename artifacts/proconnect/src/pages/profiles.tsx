import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { useStartChat } from "@/hooks/use-start-chat";
import { ProfileCard } from "@/components/profile-card";
import { LoadingState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { ConnectModal } from "@/components/connect-modal";
import { DisconnectConfirmDialog } from "@/components/disconnect-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  SearchIcon, UsersIcon, MapPinIcon, XIcon, LoaderIcon,
  UserCheckIcon, UserPlusIcon, MessageSquareIcon, SparklesIcon,
  ClockIcon, CheckIcon, BellIcon,
} from "lucide-react";
import type { Profile } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

// ── Connection request row type ────────────────────────────────────────────────
interface ConnectionRequest {
  connectionId: number;
  requestMessage: string | null;
  createdAt: string;
  actorId: number;
  actorName: string;
  actorHeadline: string | null;
  actorAvatarUrl: string | null;
  actorLocation: string | null;
}

// ── Connect button (3 states + disconnect confirmation) ───────────────────────
function ConnectButton({ profile, isConnected, isPending, onConnect, onCancel, onDisconnect, className = "" }: {
  profile: Profile;
  isConnected: boolean;
  isPending: boolean;
  onConnect: (profile: Profile) => void;
  onCancel: (id: number) => void;
  onDisconnect: (id: number) => void;
  className?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isConnected) {
    return (
      <>
        <Button size="sm" variant="secondary"
          onClick={e => { e.preventDefault(); e.stopPropagation(); setConfirmOpen(true); }}
          className={`rounded-full px-3 text-xs gap-1 flex-shrink-0 bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200 ${className}`}
        >
          <UserCheckIcon className="w-3 h-3" /> {profile.accountType === "company" ? "Following" : "Connected"}
        </Button>
        <DisconnectConfirmDialog
          open={confirmOpen}
          profileName={profile.name}
          onConfirm={() => { setConfirmOpen(false); onDisconnect(profile.id); }}
          onCancel={() => setConfirmOpen(false)}
        />
      </>
    );
  }
  if (isPending) {
    return (
      <Button size="sm" variant="outline"
        onClick={e => { e.preventDefault(); e.stopPropagation(); onCancel(profile.id); }}
        className={`rounded-full px-3 text-xs gap-1 flex-shrink-0 border-amber-300 text-amber-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200 ${className}`}
      >
        <ClockIcon className="w-3 h-3" /> Pending
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outline"
      onClick={e => { e.preventDefault(); e.stopPropagation(); onConnect(profile); }}
      className={`rounded-full px-3 text-xs gap-1 flex-shrink-0 border-primary/30 text-primary hover:bg-primary/5 ${className}`}
    >
      <UserPlusIcon className="w-3 h-3" />
      {profile.accountType === "company" ? "Follow" : "Connect"}
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

// ── Profile list ───────────────────────────────────────────────────────────────
function ProfileList({ profiles, view, isConnected, isPending, onConnect, onCancel, onDisconnect, onMessage, emptySlot }: {
  profiles: Profile[];
  view: ViewMode;
  isConnected: (id: number) => boolean;
  isPending: (id: number) => boolean;
  onConnect: (p: Profile) => void;
  onCancel: (id: number) => void;
  onDisconnect: (id: number) => void;
  onMessage: (id: number) => void;
  emptySlot?: React.ReactNode;
}) {
  if (profiles.length === 0 && emptySlot) return <>{emptySlot}</>;

  if (view === "grid") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map(profile => (
          <div key={profile.id} className="flex flex-col">
            <ProfileCard profile={profile} />
            <div className="flex justify-center gap-2 mt-2 px-2">
              {isConnected(profile.id) && (
                <MessageButton profileId={profile.id} onMessage={onMessage} className="flex-1 justify-center" />
              )}
              <ConnectButton
                profile={profile}
                isConnected={isConnected(profile.id)}
                isPending={isPending(profile.id)}
                onConnect={onConnect}
                onCancel={onCancel}
                onDisconnect={onDisconnect}
                className="flex-1 justify-center"
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex flex-col gap-2">
        {profiles.map(profile => {
          const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
          return (
            <Link key={profile.id} href={`/profiles/${profile.id}`}>
              <div className="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <Avatar className="w-11 h-11 border border-gray-100 flex-shrink-0">
                  <AvatarImage src={profile.avatarUrl || undefined} />
                  <AvatarFallback className="font-semibold bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{profile.name}</p>
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
                  {isConnected(profile.id) && (
                    <MessageButton profileId={profile.id} onMessage={onMessage} />
                  )}
                  <ConnectButton
                    profile={profile}
                    isConnected={isConnected(profile.id)}
                    isPending={isPending(profile.id)}
                    onConnect={onConnect}
                    onCancel={onCancel}
                    onDisconnect={onDisconnect}
                  />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  }

  // table
  return (
    <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Headline</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Industry</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Location</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Status</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-52">Actions</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile, i) => {
            const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <tr key={profile.id} className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                <td className="px-4 py-3">
                  <Link href={`/profiles/${profile.id}`} className="flex items-center gap-3 group">
                    <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                      <AvatarImage src={profile.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors">{profile.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs hidden md:table-cell">
                  <span className="truncate block">{profile.headline}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 hidden lg:table-cell">
                  <span className="truncate block">{profile.industry ?? "—"}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 hidden sm:table-cell">
                  {profile.location
                    ? <div className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />{profile.location}</div>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  {profile.openToWork
                    ? <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full">Open to Work</Badge>
                    : <span className="text-xs text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {isConnected(profile.id) && (
                      <MessageButton profileId={profile.id} onMessage={onMessage} />
                    )}
                    <ConnectButton
                      profile={profile}
                      isConnected={isConnected(profile.id)}
                      isPending={isPending(profile.id)}
                      onConnect={onConnect}
                      onCancel={onCancel}
                      onDisconnect={onDisconnect}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Incoming connection request card ──────────────────────────────────────────
function RequestCard({ req, onAccept, onDecline }: {
  req: ConnectionRequest;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
}) {
  const initials = req.actorName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-primary/20 shadow-sm">
      <Link href={`/profiles/${req.actorId}`} className="flex-shrink-0">
        <Avatar className="w-12 h-12 border border-gray-100">
          <AvatarImage src={req.actorAvatarUrl || undefined} />
          <AvatarFallback className="font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link href={`/profiles/${req.actorId}`}>
              <p className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">{req.actorName}</p>
            </Link>
            {req.actorHeadline && <p className="text-xs text-gray-500 truncate">{req.actorHeadline}</p>}
            {req.actorLocation && (
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <MapPinIcon className="w-3 h-3" />{req.actorLocation}
              </div>
            )}
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}
          </span>
        </div>
        {req.requestMessage && (
          <p className="text-xs text-gray-600 italic mt-2 border-l-2 border-primary/30 pl-2 leading-relaxed">
            "{req.requestMessage}"
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <Button size="sm" className="rounded-full gap-1 text-xs h-8 px-4" onClick={e => { e.stopPropagation(); onAccept(req.actorId); }}>
            <CheckIcon className="w-3 h-3" /> Accept
          </Button>
          <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-4 text-gray-500 hover:text-red-500 hover:border-red-200" onClick={e => { e.stopPropagation(); onDecline(req.actorId); }}>
            Decline
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── My Network tab ─────────────────────────────────────────────────────────────
function MyNetworkTab({ userId, view, isConnected, isPending, onConnect, onCancel, onDisconnect, onMessage, onAccept, onDecline }: {
  userId: number; view: ViewMode;
  isConnected: (id: number) => boolean;
  isPending: (id: number) => boolean;
  onConnect: (p: Profile) => void;
  onCancel: (id: number) => void;
  onDisconnect: (id: number) => void;
  onMessage: (id: number) => void;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
}) {
  const { data: networkData, isLoading: netLoading } = useQuery<{ profiles: Profile[]; total: number }>({
    queryKey: ["connections-network", userId],
    queryFn: () => fetch(`${BASE}api/connections/network?profileId=${userId}`).then(r => r.json()),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { data: requests = [], isLoading: reqLoading } = useQuery<ConnectionRequest[]>({
    queryKey: ["connections-requests", userId],
    queryFn: () => fetch(`${BASE}api/connections/requests?profileId=${userId}`).then(r => r.json()),
    enabled: !!userId,
    staleTime: 0,
  });

  const allProfiles = networkData?.profiles ?? [];
  const connections = allProfiles.filter(p => p.accountType !== "company");
  const following   = allProfiles.filter(p => p.accountType === "company");
  const isLoading   = netLoading || reqLoading;

  if (isLoading) return <LoadingState message="Loading your network…" />;

  const emptyConnections = (
    <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
      <UsersIcon className="w-12 h-12 opacity-20" />
      <p className="text-lg font-semibold text-gray-700">No connections yet</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        Head to the Discover tab to search for professionals and start building your network.
      </p>
    </div>
  );

  return (
    <>
      {/* Incoming requests */}
      {requests.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="w-4 h-4 text-primary" />
            <p className="text-sm font-semibold text-gray-800">
              Connection Requests
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">{requests.length}</span>
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {requests.map(req => (
              <RequestCard key={req.connectionId} req={req} onAccept={onAccept} onDecline={onDecline} />
            ))}
          </div>
          <div className="border-t border-gray-100 mb-6" />
        </div>
      )}

      {/* My Connections (individuals) */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-gray-800 mb-4">
          My Connections
          {connections.length > 0 && (
            <span className="ml-2 text-gray-400 font-normal">· {connections.length}</span>
          )}
        </p>
        <ProfileList
          profiles={connections}
          view={view}
          isConnected={isConnected}
          isPending={isPending}
          onConnect={onConnect}
          onCancel={onCancel}
          onDisconnect={onDisconnect}
          onMessage={onMessage}
          emptySlot={requests.length === 0 ? emptyConnections : undefined}
        />
      </div>

      {/* Following (companies) */}
      {following.length > 0 && (
        <>
          <div className="border-t border-gray-100 mb-6" />
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-4">
              Following
              <span className="ml-2 text-gray-400 font-normal">· {following.length}</span>
            </p>
            <ProfileList
              profiles={following}
              view={view}
              isConnected={isConnected}
              isPending={isPending}
              onConnect={onConnect}
              onCancel={onCancel}
              onDisconnect={onDisconnect}
              onMessage={onMessage}
            />
          </div>
        </>
      )}
    </>
  );
}

// ── Discover tab ───────────────────────────────────────────────────────────────
function DiscoverTab({ userId, view, isConnected, isPending, onConnect, onCancel, onDisconnect, onMessage, initialSearch }: {
  userId: number | undefined; view: ViewMode;
  isConnected: (id: number) => boolean;
  isPending: (id: number) => boolean;
  onConnect: (p: Profile) => void;
  onCancel: (id: number) => void;
  onDisconnect: (id: number) => void;
  onMessage: (id: number) => void;
  initialSearch: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [query, setQuery]   = useState(initialSearch);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSearch(initialSearch); setQuery(initialSearch); }, [initialSearch]);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const searchParams = new URLSearchParams({ limit: "20", offset: "0" });
  if (query) searchParams.set("search", query);
  if (userId) searchParams.set("excludeId", String(userId));

  const { data: searchData, isLoading: searchLoading, isFetching } = useQuery<{ profiles: Profile[]; total: number }>({
    queryKey: ["profiles-search", query, userId],
    queryFn: () => fetch(`${BASE}api/profiles?${searchParams}`).then(r => r.json()),
    enabled: !!query,
    staleTime: 30_000,
  });
  const searchProfiles = searchData?.profiles ?? [];

  const { data: recData, isLoading: recLoading } = useQuery<{ profiles: Profile[] }>({
    queryKey: ["connections-recommended", userId],
    queryFn: () => fetch(`${BASE}api/connections/recommended?profileId=${userId}`).then(r => r.json()),
    enabled: !!userId && !query,
    staleTime: 60_000,
  });
  const recProfiles = (recData?.profiles ?? []).filter(p => p.id !== userId);

  const isSearching = !!query;
  const isLoading   = isSearching ? searchLoading : recLoading;
  const profiles    = isSearching
    ? searchProfiles.filter(p => !isConnected(p.id) && !isPending(p.id))
    : recProfiles;

  const empty = (
    <div className="flex flex-col items-center py-20 text-muted-foreground gap-3">
      <SearchIcon className="w-10 h-10 opacity-20" />
      <p className="text-base font-medium">
        {isSearching ? `No results for "${query}"` : "No recommendations yet"}
      </p>
      {isSearching && (
        <p className="text-sm text-gray-400">Try searching by name, job title, or email</p>
      )}
    </div>
  );

  return (
    <>
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
      ) : (
        <>
          {!isSearching && profiles.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-gray-700">Recommended for you</p>
              <span className="text-xs text-gray-400">· based on your industry &amp; interests</span>
            </div>
          )}
          {isSearching && profiles.length > 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              {profiles.length} result{profiles.length !== 1 ? "s" : ""} for <span className="font-medium text-gray-700">"{query}"</span>
            </p>
          )}
          <ProfileList
            profiles={profiles}
            view={view}
            isConnected={isConnected}
            isPending={isPending}
            onConnect={onConnect}
            onCancel={onCancel}
            onDisconnect={onDisconnect}
            onMessage={onMessage}
            emptySlot={empty}
          />
        </>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Profiles() {
  const { user } = useAppAuth();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const initialSearch = params.get("search") ?? "";
  const initialTab = params.get("tab") === "discover" || !!initialSearch ? "discover" : "network";
  const { isConnected, isPending, sendRequest, cancelRequest, acceptRequest, declineRequest, disconnect } = useConnections();
  const startChat = useStartChat();
  const [, navigate] = useLocation();

  const [tab, setTab]   = useState<"network" | "discover">(initialTab as "network" | "discover");
  const [view, setView] = useState<ViewMode>("list");
  const [connectingProfile, setConnectingProfile] = useState<Profile | null>(null);

  const handleConnect = useCallback((profile: Profile) => {
    setConnectingProfile(profile);
  }, []);

  const handleSendRequest = useCallback((message: string) => {
    if (!connectingProfile) return;
    sendRequest(connectingProfile.id, message);
    setConnectingProfile(null);
  }, [connectingProfile, sendRequest]);

  const handleMessage = useCallback(async (profileId: number) => {
    const convId = await startChat(profileId);
    navigate(convId ? `/messaging?conv=${convId}` : "/messaging");
  }, [startChat, navigate]);

  const { data: netData } = useQuery<{ profiles: Profile[]; total: number }>({
    queryKey: ["connections-network", user?.id],
    queryFn: () => fetch(`${BASE}api/connections/network?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: requestsData = [] } = useQuery<ConnectionRequest[]>({
    queryKey: ["connections-requests", user?.id],
    queryFn: () => fetch(`${BASE}api/connections/requests?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const networkSize = netData?.total ?? 0;
  const requestCount = requestsData.length;

  return (
    <div className="max-w-[1320px] mx-auto px-4 py-10 pb-24">
      {/* ConnectModal */}
      {connectingProfile && (
        <ConnectModal
          profile={connectingProfile}
          onSend={handleSendRequest}
          onClose={() => setConnectingProfile(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <UsersIcon className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Network</h1>
        </div>
        <p className="text-sm text-muted-foreground">Manage your connections and discover remote professionals.</p>
      </div>

      {/* Tabs + View toggle */}
      <div className="flex items-center justify-between border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {([
            { key: "network" as const, label: "My Network", count: networkSize, badge: requestCount },
            { key: "discover" as const, label: "Discover", icon: SparklesIcon },
          ]).map(({ key, label, count, badge, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
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
              {badge !== undefined && badge > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-500 text-white">
                  {badge}
                </span>
              )}
              {Icon && <Icon className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        <div className="pb-1">
          <div className="md:hidden">
            <ViewToggle view={view === "table" ? "list" : view} onChange={setView} options={["grid", "list"]} />
          </div>
          <div className="hidden md:block">
            <ViewToggle view={view} onChange={setView} options={["grid", "list", "table"]} />
          </div>
        </div>
      </div>

      {/* Tab content */}
      {tab === "network" ? (
        user ? (
          <MyNetworkTab
            userId={user.id}
            view={view}
            isConnected={isConnected}
            isPending={isPending}
            onConnect={handleConnect}
            onCancel={cancelRequest}
            onDisconnect={disconnect}
            onMessage={handleMessage}
            onAccept={acceptRequest}
            onDecline={declineRequest}
          />
        ) : (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">Sign in to see your network</p>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        )
      ) : (
        <DiscoverTab
          userId={user?.id}
          view={view}
          isConnected={isConnected}
          isPending={isPending}
          onConnect={handleConnect}
          onCancel={cancelRequest}
          onDisconnect={disconnect}
          onMessage={handleMessage}
          initialSearch={initialSearch}
        />
      )}
    </div>
  );
}

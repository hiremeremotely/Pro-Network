import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  LogOutIcon,
  XIcon,
  LoaderIcon,
  ThumbsUpIcon,
  MessageSquareIcon,
  UserPlusIcon,
  UserCheckIcon,
  AtSignIcon,
  ClipboardListIcon,
  BarChart2Icon as BarChart2NavIcon,

  BuildingIcon,
  BarChart2Icon,
  DollarSignIcon,
  TimerIcon,
  KanbanSquareIcon,
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { useAppAuth } from "@/contexts/app-auth";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

// ── Global typeahead search ───────────────────────────────────────────────────
function GlobalSearch() {
  const [, navigate] = useLocation();
  const { user } = useAppAuth();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 220);
    return () => clearTimeout(t);
  }, [value]);

  const { data, isFetching } = useListProfiles(
    { search: debounced || undefined, limit: 7, offset: 0 },
    {
      query: {
        enabled: debounced.length >= 1,
        queryKey: getListProfilesQueryKey({ search: debounced || undefined, limit: 7, offset: 0 }),
      },
    }
  );

  const suggestions = (data?.profiles ?? []).filter(p => p.id !== user?.id);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setFocused(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = suggestions.length + 1; // +1 for "See all" row
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < suggestions.length && suggestions[highlighted]) {
        navigate(`/profiles/${suggestions[highlighted].id}`);
        setValue(""); setOpen(false); setFocused(false); inputRef.current?.blur();
      } else if (value.trim()) {
        navigate(`/profiles?search=${encodeURIComponent(value.trim())}`);
        setOpen(false); setFocused(false); inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setOpen(false); setHighlighted(-1); inputRef.current?.blur(); setFocused(false);
    }
  }

  const showDropdown = open && focused && value.length >= 1 && (isFetching || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative flex-shrink-0 w-[280px] hidden sm:block">
      {/* Input */}
      <div
        className={`flex items-center h-9 rounded-t-[4px] transition-all ${
          showDropdown
            ? "bg-white border border-gray-300 border-b-0 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
            : focused
            ? "bg-white border border-primary/60 rounded-b-[4px] shadow-sm"
            : "bg-[#eef3f8] border border-transparent rounded-b-[4px]"
        }`}
      >
        <SearchIcon className="ml-3 w-4 h-4 text-gray-500 flex-shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Search"
          autoComplete="off"
          className="flex-1 h-full px-2 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          onChange={e => { setValue(e.target.value); setOpen(true); setHighlighted(-1); }}
          onFocus={() => { setFocused(true); if (value.length >= 1) setOpen(true); }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setValue(""); setOpen(false); inputRef.current?.focus(); }}
            className="mr-2 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown — LinkedIn style: flush below input, white card */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[36px] z-[300] bg-white border border-gray-300 border-t-0 rounded-b-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Section header */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold text-gray-500">
              {isFetching && suggestions.length === 0 ? (
                <span className="flex items-center gap-1.5"><LoaderIcon className="w-3 h-3 animate-spin" />Searching…</span>
              ) : "People"}
            </span>
          </div>

          {/* Result rows */}
          {suggestions.map((profile, i) => {
            const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            const isHighlighted = highlighted === i;
            return (
              <button
                key={profile.id}
                type="button"
                onMouseDown={() => { navigate(`/profiles/${profile.id}`); setValue(""); setOpen(false); setFocused(false); inputRef.current?.blur(); }}
                onMouseEnter={() => setHighlighted(i)}
                onMouseLeave={() => setHighlighted(-1)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isHighlighted ? "bg-[#f3f2ef]" : ""}`}
              >
                <Avatar className="w-9 h-9 flex-shrink-0 border border-gray-200">
                  <AvatarImage src={profile.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{profile.name}</p>
                  {profile.headline && (
                    <p className="text-xs text-gray-500 leading-tight truncate mt-0.5">{profile.headline}</p>
                  )}
                  {profile.openToWork && (
                    <p className="text-[10px] text-green-600 font-medium mt-0.5">Open to work</p>
                  )}
                </div>
              </button>
            );
          })}

          {/* See all results — always last */}
          {suggestions.length > 0 && (
            <button
              type="button"
              onMouseDown={() => { navigate(`/profiles?search=${encodeURIComponent(value)}`); setValue(""); setOpen(false); setFocused(false); inputRef.current?.blur(); }}
              onMouseEnter={() => setHighlighted(suggestions.length)}
              onMouseLeave={() => setHighlighted(-1)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 font-medium border-t border-gray-100 transition-colors ${highlighted === suggestions.length ? "bg-[#f3f2ef]" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <SearchIcon className="w-4 h-4 text-gray-500" />
              </div>
              <span>See all results for <strong>"{value}"</strong></span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notification types ────────────────────────────────────────────────────────
interface AppNotification {
  id: number;
  type: string;
  postId: number | null;
  conversationId: number | null;
  reactionType: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  actorProfileId: number;
  actorName: string;
  actorAvatarUrl: string | null;
}

const REACTION_EMOJIS: Record<string, string> = {
  like: "👍", celebrate: "🎉", support: "🤗", love: "❤️", insightful: "💡", funny: "😄",
};

// Render message with bold actor name
function NotifMessage({ message, actorName }: { message: string; actorName: string }) {
  const idx = message.indexOf(actorName);
  if (idx === -1) return <span>{message}</span>;
  return (
    <span>
      {message.slice(0, idx)}
      <strong className="font-semibold text-gray-900">{actorName}</strong>
      {message.slice(idx + actorName.length)}
    </span>
  );
}

// ── Notification Bell ─────────────────────────────────────────────────────────
function NotificationBell({ profileId }: { profileId: number }) {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "posts">("all");
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const BASE = import.meta.env.BASE_URL;

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["notif-count", profileId],
    queryFn: () => fetch(`${BASE}api/notifications/unread-count?profileId=${profileId}`).then(r => r.json()),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: notifications = [], isLoading, refetch: refetchList } = useQuery<AppNotification[]>({
    queryKey: ["notifications", profileId],
    queryFn: () => fetch(`${BASE}api/notifications?profileId=${profileId}`).then(r => r.json()),
    enabled: open,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: () => fetch(`${BASE}api/notifications/mark-read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    }),
    onSuccess: () => {
      qc.setQueryData<{ count: number }>(["notif-count", profileId], { count: 0 });
      qc.setQueryData<AppNotification[]>(["notifications", profileId], old =>
        (old ?? []).map(n => ({ ...n, isRead: true }))
      );
    },
  });

  function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) {
      refetchList();
      if ((countData?.count ?? 0) > 0) markRead.mutate();
    }
  }

  function handleSeeAll() {
    setOpen(false);
    navigate("/notifications");
  }

  function getNotifHref(n: AppNotification): string {
    if (n.type === "new_message") return n.conversationId ? `/messaging?conv=${n.conversationId}` : "/messaging";
    if (n.postId) return "/feed";
    switch (n.type) {
      case "connection_request":  return "/profiles";
      case "connection_accepted": return `/profiles/${n.actorProfileId}`;
      case "comment":
      case "reaction":
      case "mention":             return "/feed";
      case "job":                 return "/jobs";
      default:                    return n.actorProfileId ? `/profiles/${n.actorProfileId}` : "/feed";
    }
  }

  function handleNotifClick(n: AppNotification) {
    if (!n.isRead) {
      qc.setQueryData<AppNotification[]>(["notifications", profileId], old =>
        (old ?? []).map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
      qc.setQueryData<{ count: number }>(["notif-count", profileId], old =>
        ({ count: Math.max(0, (old?.count ?? 1) - 1) })
      );
      fetch(`${BASE}api/notifications/${n.id}/mark-read`, { method: "PATCH" });
    }
    setOpen(false);
    navigate(getNotifHref(n));
  }

  // Close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const unread = countData?.count ?? 0;
  const filtered = tab === "posts"
    ? notifications.filter(n => n.postId !== null)
    : notifications;

  return (
    <div className="relative">
      {/* Bell button — matches other nav items */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        className={`relative flex flex-col items-center justify-center gap-1 px-4 min-w-[72px] h-14 text-xs font-medium border-b-2 transition-colors ${
          open ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400"
        }`}
      >
        <div className="relative">
          <BellIcon className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none shadow-sm">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
        <span>Notifications</span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+4px)] w-[400px] bg-white rounded-lg shadow-[0_4px_24px_rgba(0,0,0,0.18)] border border-gray-200 z-[400] overflow-hidden"
          style={{ maxHeight: "calc(100vh - 80px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
            {unread === 0 && notifications.some(n => !n.isRead) === false && notifications.length > 0 && (
              <button
                onClick={() => markRead.mutate()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={() => markRead.mutate()}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 px-5 border-b border-gray-200 mb-0">
            {(["all", "posts"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {t === "all" ? "All" : "My posts"}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: "420px" }}>
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isLoading && filtered.length === 0 && (
              <div className="py-14 flex flex-col items-center text-center px-8">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                  <BellIcon className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">No notifications yet</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  When someone likes or comments on your posts, you'll see it here.
                </p>
              </div>
            )}

            {filtered.map(n => {
              const initials = n.actorName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
              const emoji = n.type === "reaction" && n.reactionType
                ? REACTION_EMOJIS[n.reactionType] ?? "👍"
                : null;

              const badgeBg =
                n.type === "comment"              ? "bg-green-500"
                : n.type === "connection_request" ? "bg-emerald-500"
                : n.type === "connection_accepted" ? "bg-[#0a66c2]"
                : n.type === "reaction"            ? "bg-[#e7a33e]"
                : n.type === "mention"             ? "bg-violet-500"
                : n.type === "job"                 ? "bg-orange-500"
                :                                    "bg-[#0a66c2]";

              const badgeContent = emoji
                ? <span className="text-sm leading-none">{emoji}</span>
                : n.type === "comment" || n.type === "new_message"
                  ? <MessageSquareIcon className="w-3 h-3 text-white" />
                  : n.type === "connection_request"
                    ? <UserPlusIcon className="w-3 h-3 text-white" />
                    : n.type === "connection_accepted"
                      ? <UserCheckIcon className="w-3 h-3 text-white" />
                      : n.type === "mention"
                        ? <AtSignIcon className="w-3 h-3 text-white" />
                        : n.type === "job"
                          ? <BriefcaseIcon className="w-3 h-3 text-white" />
                          : <ThumbsUpIcon className="w-3 h-3 text-white" />;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`relative flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors hover:bg-[#f3f2ef] group ${
                    !n.isRead ? "bg-[#eef3fb]" : "bg-white"
                  }`}
                >
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-2 h-2">
                    {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#0a66c2]" />}
                  </div>

                  <div className="relative flex-shrink-0 ml-2">
                    <Avatar className="w-12 h-12 border border-gray-200">
                      <AvatarImage src={n.actorAvatarUrl || undefined} />
                      <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <span className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center shadow border-2 border-white ${badgeBg}`}>
                      {badgeContent}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-sm text-gray-600 leading-snug">
                      <NotifMessage message={n.message} actorName={n.actorName} />
                    </p>
                    <p className={`text-xs mt-1 font-medium ${!n.isRead ? "text-[#0a66c2]" : "text-gray-400"}`}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <button
            onClick={handleSeeAll}
            className="w-full py-3 text-sm font-semibold text-gray-600 border-t border-gray-200 hover:bg-[#f3f2ef] transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAppAuth();
  const BASE = import.meta.env.BASE_URL;

  // Shared unread count for mobile badge
  const { data: mobileCountData } = useQuery<{ count: number }>({
    queryKey: ["notif-count", user?.id],
    queryFn: () => fetch(`${BASE}api/notifications/unread-count?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
  const mobileUnread = mobileCountData?.count ?? 0;

  // Unread messaging count for nav badge
  const { data: msgUnreadData } = useQuery<{ count: number }>({
    queryKey: ["msg-unread", user?.id],
    queryFn: () => fetch(`${BASE}api/conversations/unread-count?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  const msgUnread = msgUnreadData?.count ?? 0;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ME";

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const homeHref = user?.accountType === "company" ? "/company-dashboard" : "/feed";
  const isCompany = user?.accountType === "company";

  const navItems = isCompany
    ? [
        { href: "/company-dashboard", label: "Dashboard",   icon: HomeIcon           },
        { href: "/profiles",          label: "Talent",       icon: UsersIcon          },
        { href: "/company/interests", label: "My Interests", icon: UserPlusIcon       },
        { href: "/applications",      label: "Hiring",       icon: ClipboardListIcon  },
      ]
    : [
        { href: "/feed",         label: "Home",        icon: HomeIcon           },
        { href: "/profiles",     label: "Network",     icon: UsersIcon          },
        { href: "/jobs",         label: "Jobs",        icon: BriefcaseIcon      },
        { href: "/job-tracker",  label: "Job Tracker", icon: KanbanSquareIcon   },
        { href: "/messaging",    label: "Messaging",   icon: MessageSquareIcon  },
      ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2ef]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1320px] mx-auto px-4 h-14 flex items-center">
          {/* Left: logo + search */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link href={user ? homeHref : "/"} className="flex-shrink-0 flex items-center">
              <img src={logo} alt="Hire Me Remotely" className="h-8 w-auto" />
            </Link>
            <GlobalSearch />
          </div>

          {/* Center: nav items */}
          <nav className="hidden md:flex flex-1 items-stretch h-14 justify-center">
            {navItems.map((item) => {
              const exactMatch = ["/feed", "/profiles", "/company-dashboard", "/applications"];
              const isActive = location === item.href || (!exactMatch.includes(item.href) && location.startsWith(item.href));
              const isMsgItem = item.href === "/messaging";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 px-4 min-w-[72px] text-xs font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400"
                  }`}
                >
                  <span className="relative">
                    <item.icon className="w-5 h-5" />
                    {isMsgItem && msgUnread > 0 && (
                      <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 leading-none">
                        {msgUnread > 9 ? "9+" : msgUnread}
                      </span>
                    )}
                  </span>
                  {item.label}
                </Link>
              );
            })}
            {user && <NotificationBell profileId={user.id} />}
          </nav>

          {/* Right: divider + avatar */}
          <div className="flex items-center flex-shrink-0 ml-auto md:ml-0">
            <div className="hidden md:block h-8 w-px bg-gray-200 mx-1" />
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-shrink-0 flex flex-col items-center gap-1 px-2 text-xs font-medium text-gray-500 hover:text-gray-900 outline-none">
                <Avatar className="w-7 h-7 border border-gray-300">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block">{user ? user.name.split(" ")[0] : "Me"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {user && (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </>
              )}
              {user?.accountType === "company" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/company-dashboard" className="flex items-center gap-2 cursor-pointer">
                      <BuildingIcon className="w-4 h-4" /> Company Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/salary-estimator" className="flex items-center gap-2 cursor-pointer">
                      <DollarSignIcon className="w-4 h-4" /> Salary Estimator
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href={user ? `/profiles/${user.id}` : "/login"} className="flex items-center gap-2 cursor-pointer">
                  <UserIcon className="w-4 h-4" /> View Profile
                </Link>
              </DropdownMenuItem>
              {user?.accountType !== "company" && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/applications" className="flex items-center gap-2 cursor-pointer">
                      <BriefcaseIcon className="w-4 h-4" /> My Applications
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/job-tracker" className="flex items-center gap-2 cursor-pointer">
                      <KanbanSquareIcon className="w-4 h-4" /> Job Tracker
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/my-work" className="flex items-center gap-2 cursor-pointer">
                      <TimerIcon className="w-4 h-4" /> My Work
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              {user && (
                <DropdownMenuItem asChild>
                  <Link href="/analytics" className="flex items-center gap-2 cursor-pointer">
                    <BarChart2Icon className="w-4 h-4" /> Analytics
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-gray-500">
                  <LogOutIcon className="w-4 h-4" /> Sign out
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login" className="flex items-center gap-2 cursor-pointer text-primary font-medium">
                    <LogOutIcon className="w-4 h-4" /> Sign in
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>


      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <nav className="flex items-stretch h-14">
          {navItems.slice(0, 3).map((item) => {
            const exactMatch = ["/feed", "/profiles", "/company-dashboard", "/applications"];
            const isActive = location === item.href || (!exactMatch.includes(item.href) && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium border-b-2 transition-colors ${
                  isActive ? "border-primary text-primary" : "border-transparent text-gray-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          {/* Notification bell — mobile */}
          <Link
            href="/notifications"
            className={`relative flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium border-b-2 transition-colors ${
              location === "/notifications" ? "border-primary text-primary" : "border-transparent text-gray-400"
            }`}
          >
            <div className="relative">
              <BellIcon className="w-5 h-5" />
              {mobileUnread > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {mobileUnread > 9 ? "9+" : mobileUnread}
                </span>
              )}
            </div>
            Notifs
          </Link>
          <Link
            href="/messaging"
            className={`flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium border-b-2 transition-colors ${
              location === "/messaging" ? "border-primary text-primary" : "border-transparent text-gray-400"
            }`}
          >
            <div className="relative">
              <MessageSquareIcon className="w-5 h-5" />
              {msgUnread > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {msgUnread > 9 ? "9+" : msgUnread}
                </span>
              )}
            </div>
            Messaging
          </Link>
        </nav>
      </div>
    </div>
  );
}

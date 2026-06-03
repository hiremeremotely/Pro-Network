import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellIcon, MessageSquareIcon, ThumbsUpIcon, CheckCheckIcon, UserPlusIcon, UserCheckIcon, AtSignIcon, BriefcaseIcon } from "lucide-react";
import { useAppAuth } from "@/contexts/app-auth";

const BASE = import.meta.env.BASE_URL;

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

export default function Notifications() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"all" | "posts">("all");

  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetch(`${BASE}api/notifications`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const markAllRead = useMutation({
    mutationFn: () => fetch(`${BASE}api/notifications/mark-read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }),
    onSuccess: () => {
      qc.setQueryData<{ count: number }>(["notif-count", user?.id], { count: 0 });
      qc.setQueryData<AppNotification[]>(["notifications", user?.id], old =>
        (old ?? []).map(n => ({ ...n, isRead: true }))
      );
    },
  });

  const handleNotifClick = useCallback((n: AppNotification) => {
    if (!n.isRead) {
      qc.setQueryData<AppNotification[]>(["notifications", user?.id], old =>
        (old ?? []).map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
      qc.setQueryData<{ count: number }>(["notif-count", user?.id], old =>
        ({ count: Math.max(0, (old?.count ?? 1) - 1) })
      );
      fetch(`${BASE}api/notifications/${n.id}/mark-read`, { method: "PATCH" });
    }
    navigate(getNotifHref(n));
  }, [user?.id, qc, navigate]);

  const filtered = tab === "posts"
    ? notifications.filter(n => n.postId !== null)
    : notifications;

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {hasUnread && (
          <button
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
          >
            <CheckCheckIcon className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex gap-1 px-4 border-b border-gray-200">
          {([
            { key: "all", label: "All" },
            { key: "posts", label: "My posts" },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-20 flex flex-col items-center text-center px-8">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <BellIcon className="w-10 h-10 text-gray-300" />
            </div>
            <p className="text-base font-semibold text-gray-700 mb-1">No notifications yet</p>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              {tab === "posts"
                ? "When someone reacts to or comments on your posts, you'll see it here."
                : "Stay tuned! Notifications about your network activity will appear here."}
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {filtered.map(n => {
            const initials = n.actorName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
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
                ? <MessageSquareIcon className="w-3.5 h-3.5 text-white" />
                : n.type === "connection_request"
                  ? <UserPlusIcon className="w-3.5 h-3.5 text-white" />
                  : n.type === "connection_accepted"
                    ? <UserCheckIcon className="w-3.5 h-3.5 text-white" />
                    : n.type === "mention"
                      ? <AtSignIcon className="w-3.5 h-3.5 text-white" />
                      : n.type === "job"
                        ? <BriefcaseIcon className="w-3.5 h-3.5 text-white" />
                        : <ThumbsUpIcon className="w-3.5 h-3.5 text-white" />;

            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`relative flex items-start gap-4 px-5 py-4 transition-colors cursor-pointer hover:bg-[#f3f2ef] group ${
                  !n.isRead ? "bg-[#eef3fb]" : "bg-white"
                }`}
              >
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#0a66c2]" />}
                </div>

                <div className="relative flex-shrink-0 ml-3">
                  <Avatar className="w-14 h-14 border border-gray-200">
                    <AvatarImage src={n.actorAvatarUrl || undefined} />
                    <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow border-2 border-white ${badgeBg}`}>
                    {badgeContent}
                  </span>
                </div>

                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-gray-600 leading-snug">
                    <NotifMessage message={n.message} actorName={n.actorName} />
                  </p>
                  <p className={`text-xs mt-1.5 font-medium ${!n.isRead ? "text-[#0a66c2]" : "text-gray-400"}`}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                  <p className="text-[10px] mt-1 text-gray-300 group-hover:text-gray-400 transition-colors">
                    {n.type === "connection_request" ? "View request →"
                      : n.type === "connection_accepted" ? "View profile →"
                      : n.type === "new_message" ? "View message →"
                      : n.postId ? "View post →"
                      : n.type === "job" ? "Browse jobs →"
                      : "View →"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

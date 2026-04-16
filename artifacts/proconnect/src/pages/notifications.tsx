import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BellIcon, MessageSquareIcon, ThumbsUpIcon, CheckCheckIcon, UserPlusIcon } from "lucide-react";
import { useAppAuth } from "@/contexts/app-auth";

interface AppNotification {
  id: number;
  type: string;
  postId: number | null;
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
  const qc = useQueryClient();
  const BASE = import.meta.env.BASE_URL;
  const [tab, setTab] = useState<"all" | "posts" | "connections">("all");

  const { data: notifications = [], isLoading } = useQuery<AppNotification[]>({
    queryKey: ["notifications", user?.id],
    queryFn: () => fetch(`${BASE}api/notifications?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const markRead = useMutation({
    mutationFn: () => fetch(`${BASE}api/notifications/mark-read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: user?.id }),
    }),
    onSuccess: () => {
      qc.setQueryData<{ count: number }>(["notif-count", user?.id], { count: 0 });
      qc.setQueryData<AppNotification[]>(["notifications", user?.id], old =>
        (old ?? []).map(n => ({ ...n, isRead: true }))
      );
    },
  });

  const filtered = tab === "posts"
    ? notifications.filter(n => n.postId !== null)
    : tab === "connections"
      ? notifications.filter(n => n.type === "connection")
      : notifications;

  const hasUnread = notifications.some(n => !n.isRead);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {hasUnread && (
          <button
            onClick={() => markRead.mutate()}
            disabled={markRead.isPending}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline disabled:opacity-50"
          >
            <CheckCheckIcon className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      {/* Card container */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter tabs */}
        <div className="flex gap-1 px-4 border-b border-gray-200">
          {([
            { key: "all", label: "All" },
            { key: "connections", label: "Connections" },
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

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
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

        {/* Notification rows */}
        <div className="divide-y divide-gray-100">
          {filtered.map(n => {
            const initials = n.actorName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
            const emoji = n.type === "reaction" && n.reactionType
              ? REACTION_EMOJIS[n.reactionType] ?? "👍"
              : null;

            const badgeBg = n.type === "comment"
              ? "bg-green-500"
              : n.type === "connection"
                ? "bg-emerald-500"
                : "bg-[#0a66c2]";
            const badgeContent = emoji
              ? <span className="text-sm leading-none">{emoji}</span>
              : n.type === "comment"
                ? <MessageSquareIcon className="w-3.5 h-3.5 text-white" />
                : n.type === "connection"
                  ? <UserPlusIcon className="w-3.5 h-3.5 text-white" />
                  : <ThumbsUpIcon className="w-3.5 h-3.5 text-white" />;

            const row = (
              <div
                className={`relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[#f3f2ef] group ${
                  !n.isRead ? "bg-[#eef3fb]" : "bg-white"
                }`}
              >
                {/* Unread dot */}
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2">
                  {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#0a66c2]" />}
                </div>

                {/* Avatar + badge */}
                <div className="relative flex-shrink-0 ml-3">
                  <Avatar className="w-14 h-14 border border-gray-200">
                    <AvatarImage src={n.actorAvatarUrl || undefined} />
                    <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center shadow border-2 border-white ${badgeBg}`}>
                    {badgeContent}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <p className="text-sm text-gray-600 leading-snug">
                    <NotifMessage message={n.message} actorName={n.actorName} />
                  </p>
                  <p className={`text-xs mt-1.5 font-medium ${!n.isRead ? "text-[#0a66c2]" : "text-gray-400"}`}>
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );

            return n.postId ? (
              <Link key={n.id} href="/feed">{row}</Link>
            ) : n.type === "connection" ? (
              <Link key={n.id} href={`/profiles/${n.actorProfileId}`}>{row}</Link>
            ) : (
              <div key={n.id}>{row}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

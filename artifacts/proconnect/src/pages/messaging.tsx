import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { useAppAuth } from "@/contexts/app-auth";
import {
  SearchIcon, SendHorizontalIcon, PencilIcon, ChevronDownIcon,
  MoreHorizontalIcon, VideoIcon, PhoneIcon, InfoIcon,
} from "lucide-react";

interface OtherParticipant {
  id: number;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
}

interface Conversation {
  id: number;
  participant1Id: number;
  participant2Id: number;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  otherParticipant: OtherParticipant | null;
  unreadCount: number;
}

interface Message {
  id: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderProfileId: number;
  senderName: string;
  senderAvatarUrl: string | null;
}

function msgDateLabel(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

function convDateLabel(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export default function Messaging() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const BASE = import.meta.env.BASE_URL;
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetch(`${BASE}api/conversations?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["messages", activeConvId],
    queryFn: () => fetch(`${BASE}api/conversations/${activeConvId}/messages`).then(r => r.json()),
    enabled: !!activeConvId,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const sendMsg = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`${BASE}api/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderProfileId: user?.id, content }),
      });
      return res.json() as Promise<Message>;
    },
    onSuccess: (newMsg) => {
      setInput("");
      qc.setQueryData<Message[]>(["messages", activeConvId], old => [...(old ?? []), newMsg]);
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  const markRead = useMutation({
    mutationFn: (convId: number) => fetch(`${BASE}api/conversations/${convId}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: user?.id }),
    }),
    onSuccess: (_, convId) => {
      qc.setQueryData<Conversation[]>(["conversations", user?.id], old =>
        (old ?? []).map(c => c.id === convId ? { ...c, unreadCount: 0 } : c)
      );
      qc.invalidateQueries({ queryKey: ["msg-unread", user?.id] });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark read when opening conversation
  useEffect(() => {
    if (activeConvId) markRead.mutate(activeConvId);
  }, [activeConvId]);

  function handleSelectConv(conv: Conversation) {
    setActiveConvId(conv.id);
    setInput("");
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sendMsg.isPending) return;
    sendMsg.mutate(trimmed);
  }

  const filtered = conversations.filter(c =>
    !search || c.otherParticipant?.name.toLowerCase().includes(search.toLowerCase())
  );

  const otherInitials = (name?: string | null) =>
    (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
      {/* ── LEFT SIDEBAR ───────────────────────────────────────────────────── */}
      <aside className="w-[336px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-900">Messaging</span>
              {totalUnread > 0 && (
                <span className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                <MoreHorizontalIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate("/profiles")}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                title="New message"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#eef3f8] rounded-full px-3 py-1.5">
            <SearchIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search messages"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-500 outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {convsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!convsLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center text-center px-8 py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <SendHorizontalIcon className="w-7 h-7 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">No conversations yet</p>
              <p className="text-xs text-gray-400">
                Visit someone's profile and click "Message" to start a conversation.
              </p>
            </div>
          )}

          {filtered.map(conv => {
            const other = conv.otherParticipant;
            const isActive = conv.id === activeConvId;
            return (
              <button
                key={conv.id}
                onClick={() => handleSelectConv(conv)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f2ef] ${
                  isActive ? "bg-[#dce6f0]" : conv.unreadCount > 0 ? "bg-white" : ""
                }`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-12 h-12 border border-gray-200">
                    <AvatarImage src={other?.avatarUrl || undefined} />
                    <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                      {otherInitials(other?.name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator placeholder */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                      {other?.name ?? "Unknown"}
                    </span>
                    <span className={`text-[10px] flex-shrink-0 ${conv.unreadCount > 0 ? "text-primary font-semibold" : "text-gray-400"}`}>
                      {convDateLabel(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {conv.lastMessagePreview ?? "Start a conversation"}
                  </p>
                  {conv.unreadCount > 0 && (
                    <span className="inline-block mt-1 min-w-[18px] h-[18px] bg-[#0a66c2] text-white text-[10px] font-bold rounded-full px-1 flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── MAIN CHAT PANEL ────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col bg-white min-w-0">
        {!activeConv ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <SendHorizontalIcon className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your inbox</h2>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Select a conversation to read messages, or find a connection on the Profiles page and start chatting.
            </p>
            <button
              onClick={() => navigate("/profiles")}
              className="mt-4 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary/90 transition-colors"
            >
              Find connections
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-200">
              <Avatar className="w-12 h-12 border border-gray-200">
                <AvatarImage src={activeConv.otherParticipant?.avatarUrl || undefined} />
                <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                  {otherInitials(activeConv.otherParticipant?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm">{activeConv.otherParticipant?.name}</h3>
                {activeConv.otherParticipant?.headline && (
                  <p className="text-xs text-gray-500 truncate">{activeConv.otherParticipant.headline}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  <VideoIcon className="w-4.5 h-4.5" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  <InfoIcon className="w-4.5 h-4.5" />
                </button>
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  <MoreHorizontalIcon className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-1">
              {msgsLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {messages.length === 0 && !msgsLoading && (
                <div className="flex flex-col items-center text-center py-10">
                  <Avatar className="w-16 h-16 border-2 border-gray-200 mb-3">
                    <AvatarImage src={activeConv.otherParticipant?.avatarUrl || undefined} />
                    <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                      {otherInitials(activeConv.otherParticipant?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-sm font-semibold text-gray-800">{activeConv.otherParticipant?.name}</p>
                  {activeConv.otherParticipant?.headline && (
                    <p className="text-xs text-gray-500 mt-0.5">{activeConv.otherParticipant.headline}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-3">Say hello! This is the start of your conversation.</p>
                </div>
              )}

              {messages.map((msg, i) => {
                const isMine = msg.senderProfileId === user?.id;
                const prev = messages[i - 1];
                const showAvatar = !isMine && (!prev || prev.senderProfileId !== msg.senderProfileId);
                const showDate =
                  !prev || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-0.5 rounded-full">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {/* Avatar placeholder to maintain alignment */}
                      {!isMine && (
                        <div className="w-8 flex-shrink-0 self-end mb-0.5">
                          {showAvatar && (
                            <Avatar className="w-8 h-8 border border-gray-200">
                              <AvatarImage src={msg.senderAvatarUrl || undefined} />
                              <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                                {otherInitials(msg.senderName)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      )}
                      <div
                        className={`max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                          isMine
                            ? "bg-[#0a66c2] text-white rounded-br-sm"
                            : "bg-[#f3f2ef] text-gray-900 rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-2xl px-4 py-2 focus-within:border-[#0a66c2] transition-colors">
                <textarea
                  ref={inputRef}
                  rows={1}
                  placeholder={`Message ${activeConv.otherParticipant?.name?.split(" ")[0] ?? ""}…`}
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    const el = e.target;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  className="flex-1 resize-none bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none leading-relaxed min-h-[24px] max-h-[120px]"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sendMsg.isPending}
                  className="flex-shrink-0 w-9 h-9 rounded-full bg-[#0a66c2] flex items-center justify-center text-white disabled:opacity-30 hover:bg-[#004182] transition-colors"
                >
                  {sendMsg.isPending
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <SendHorizontalIcon className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

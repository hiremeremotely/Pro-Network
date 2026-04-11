import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import {
  SendHorizontalIcon, PencilIcon,
  ExpandIcon, XIcon, MinusIcon,
  UserPlusIcon, LockIcon,
} from "lucide-react";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";

// ── Types ─────────────────────────────────────────────────────────────────────
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
  isConnected: boolean;
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

function convTime(dateStr: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}
function initials(name?: string | null) {
  return (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Individual Chat Window ────────────────────────────────────────────────────
function ChatWindow({
  conv,
  myId,
  onClose,
  onMinimize,
  minimized,
}: {
  conv: Conversation;
  myId: number;
  onClose: () => void;
  onMinimize: () => void;
  minimized: boolean;
}) {
  const qc = useQueryClient();
  const BASE = import.meta.env.BASE_URL;
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const other = conv.otherParticipant;
  const { isConnected: checkConnected, toggleConnect } = useConnections();

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["messages", conv.id],
    queryFn: () => fetch(`${BASE}api/conversations/${conv.id}/messages`).then(r => r.json()),
    refetchInterval: minimized ? false : 3000,
    staleTime: 0,
  });

  const sendMsg = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`${BASE}api/conversations/${conv.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderProfileId: myId, content }),
      });
      return res.json() as Promise<Message>;
    },
    onSuccess: (newMsg) => {
      setInput("");
      qc.setQueryData<Message[]>(["messages", conv.id], old => [...(old ?? []), newMsg]);
      qc.invalidateQueries({ queryKey: ["conversations", myId] });
    },
  });

  const markRead = useMutation({
    mutationFn: () => fetch(`${BASE}api/conversations/${conv.id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: myId }),
    }),
    onSuccess: () => {
      qc.setQueryData<Conversation[]>(["conversations", myId], old =>
        (old ?? []).map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c)
      );
      qc.invalidateQueries({ queryKey: ["msg-unread", myId] });
    },
  });

  useEffect(() => {
    if (!minimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      if (conv.unreadCount > 0) markRead.mutate();
    }
  }, [messages, minimized]);

  function handleSend() {
    const t = input.trim();
    if (!t || sendMsg.isPending) return;
    sendMsg.mutate(t);
  }

  return (
    <div className="flex flex-col bg-white border border-gray-300 rounded-t-xl shadow-2xl" style={{ width: 328 }}>
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 border-b border-gray-200 cursor-pointer select-none bg-white rounded-t-xl hover:bg-gray-50 transition-colors"
        onClick={onMinimize}
      >
        <div className="relative">
          <Avatar className="w-8 h-8 border border-gray-200">
            <AvatarImage src={other?.avatarUrl || undefined} />
            <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials(other?.name)}</AvatarFallback>
          </Avatar>
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{other?.name}</p>
        </div>
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
          <Link href="/messaging">
            <button className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <ExpandIcon className="w-3.5 h-3.5" />
            </button>
          </Link>
          <button
            onClick={onMinimize}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body — only when not minimized */}
      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1" style={{ height: 300 }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Avatar className="w-14 h-14 mb-2 border border-gray-200">
                  <AvatarImage src={other?.avatarUrl || undefined} />
                  <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials(other?.name)}</AvatarFallback>
                </Avatar>
                <p className="text-xs font-semibold text-gray-700">{other?.name}</p>
                <p className="text-[11px] text-gray-400 mt-1">Say hi!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMine = msg.senderProfileId === myId;
              const prev = messages[i - 1];
              const showTime =
                !prev || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;

              return (
                <div key={msg.id}>
                  {showTime && (
                    <div className="text-center my-1.5">
                      <span className="text-[10px] text-gray-400">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                    </div>
                  )}
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words ${
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
            <div ref={bottomRef} />
          </div>

          {/* Input — connection-aware */}
          {(() => {
            const otherId = other?.id;
            const connected = conv.isConnected || (otherId ? checkConnected(otherId) : false);
            const myMsgCount = messages.filter(m => m.senderProfileId === myId).length;
            const firstName = other?.name?.split(" ")[0] ?? "";

            if (!connected && myMsgCount >= 1) {
              return (
                <div className="px-3 py-3 border-t border-gray-200 bg-gray-50 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <LockIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] text-center text-gray-600">
                      Connect with <strong>{firstName}</strong> to keep chatting.
                    </span>
                  </div>
                  {otherId && (
                    <button
                      onClick={() => toggleConnect(otherId)}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-full hover:bg-primary/90 transition-colors"
                    >
                      <UserPlusIcon className="w-3 h-3" />
                      Connect with {firstName}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="px-3 py-2 border-t border-gray-200">
                {!connected && myMsgCount === 0 && (
                  <p className="text-[10px] text-amber-600 mb-1.5 flex items-center gap-1">
                    <LockIcon className="w-2.5 h-2.5 flex-shrink-0" />
                    1 intro message allowed before connecting.
                  </p>
                )}
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-full px-3 py-1.5 focus-within:border-[#0a66c2] transition-colors">
                  <input
                    type="text"
                    placeholder={connected ? "Write a message…" : `Intro to ${firstName}…`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSend(); } }}
                    className="flex-1 bg-transparent text-xs text-gray-900 placeholder:text-gray-400 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sendMsg.isPending}
                    className="w-6 h-6 rounded-full bg-[#0a66c2] flex items-center justify-center text-white disabled:opacity-30 hover:bg-[#004182] transition-colors"
                  >
                    <SendHorizontalIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ── Main Messaging Widget ─────────────────────────────────────────────────────
export function MessagingWidget() {
  const { user } = useAppAuth();
  const qc = useQueryClient();
  const BASE = import.meta.env.BASE_URL;
  const [panelOpen, setPanelOpen] = useState(false);
  const [openChats, setOpenChats] = useState<number[]>([]); // conv IDs
  const [minimizedChats, setMinimizedChats] = useState<Set<number>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetch(`${BASE}api/conversations?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 10000,
  });

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["msg-unread", user?.id],
    queryFn: () => fetch(`${BASE}api/conversations/unread-count?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const unread = unreadData?.count ?? 0;

  // Close panel on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function openChat(convId: number) {
    setPanelOpen(false);
    setOpenChats(prev => {
      if (prev.includes(convId)) return prev;
      const next = [convId, ...prev].slice(0, 2); // max 2 open
      return next;
    });
    setMinimizedChats(prev => { const s = new Set(prev); s.delete(convId); return s; });
  }

  function closeChat(convId: number) {
    setOpenChats(prev => prev.filter(id => id !== convId));
    setMinimizedChats(prev => { const s = new Set(prev); s.delete(convId); return s; });
  }

  function toggleMinimize(convId: number) {
    setMinimizedChats(prev => {
      const s = new Set(prev);
      if (s.has(convId)) s.delete(convId); else s.add(convId);
      return s;
    });
  }

  if (!user) return null;

  const openConvs = openChats
    .map(id => conversations.find(c => c.id === id))
    .filter(Boolean) as Conversation[];

  return (
    <div className="fixed bottom-0 right-4 z-[500] flex items-end gap-2">
      {/* Open chat windows — to the left of the panel button */}
      {openConvs.map(conv => (
        <ChatWindow
          key={conv.id}
          conv={conv}
          myId={user.id}
          onClose={() => closeChat(conv.id)}
          onMinimize={() => toggleMinimize(conv.id)}
          minimized={minimizedChats.has(conv.id)}
        />
      ))}

      {/* Main messaging panel */}
      <div className="flex flex-col" style={{ width: 300 }}>
        {/* Conversation list panel */}
        {panelOpen && (
          <div
            ref={panelRef}
            className="bg-white border border-gray-300 rounded-t-xl shadow-2xl flex flex-col"
            style={{ height: 400 }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="font-bold text-base text-gray-900">Messaging</span>
              <div className="flex items-center gap-1">
                <Link href="/messaging">
                  <button className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors" title="Open full messaging">
                    <ExpandIcon className="w-3.5 h-3.5" />
                  </button>
                </Link>
                <button
                  onClick={() => setPanelOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <ChevronDownIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <p className="text-sm text-gray-500">No conversations yet.</p>
                  <Link href="/profiles">
                    <p className="text-xs text-primary font-medium mt-1 hover:underline">Find people to message →</p>
                  </Link>
                </div>
              )}
              {conversations.map(conv => {
                const other = conv.otherParticipant;
                return (
                  <button
                    key={conv.id}
                    onClick={() => openChat(conv.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f3f2ef] transition-colors text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-10 h-10 border border-gray-200">
                        <AvatarImage src={other?.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials(other?.name)}</AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold" : "font-medium"} text-gray-900`}>
                          {other?.name ?? "Unknown"}
                        </span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">{convTime(conv.lastMessageAt)}</span>
                      </div>
                      <p className={`text-xs truncate ${conv.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                        {conv.lastMessagePreview ?? "Start a conversation"}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-[#0a66c2] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Toggle button — always visible */}
        <button
          ref={btnRef}
          onClick={() => setPanelOpen(o => !o)}
          className="flex items-center gap-2.5 bg-white border border-gray-300 rounded-t-xl px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow w-full"
        >
          <div className="relative">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <SendHorizontalIcon className="w-4 h-4 text-gray-600" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </div>
          <span className="font-semibold text-sm text-gray-900 flex-1 text-left">Messaging</span>
          <ChevronDownIcon className={`w-4 h-4 text-gray-500 transition-transform ${panelOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}

// ── Hook: open a chat with a specific user ────────────────────────────────────
export function useStartChat() {
  const { user } = useAppAuth();
  const BASE = import.meta.env.BASE_URL;

  return useCallback(async (otherProfileId: number): Promise<number | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`${BASE}api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myProfileId: user.id, otherProfileId }),
      });
      const conv = await res.json();
      return conv.id ?? null;
    } catch {
      return null;
    }
  }, [user, BASE]);
}

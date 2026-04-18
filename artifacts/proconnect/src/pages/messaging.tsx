import { useState, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import {
  SearchIcon, SendHorizontalIcon, PencilIcon,
  MoreHorizontalIcon, VideoIcon, InfoIcon,
  UserPlusIcon, CheckCircle2Icon, UsersIcon, MegaphoneIcon, ArrowLeftIcon,
  TrashIcon, PenLineIcon, CheckIcon, XIcon, Trash2Icon, PlayCircleIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

// ── Shared-post helpers ───────────────────────────────────────────────────────
interface SharedPost {
  __type: "shared_post";
  postId: number;
  authorName: string;
  authorAvatar: string | null;
  authorHeadline: string | null;
  content: string;
  imageUrl: string | null;
}

interface SharedJob {
  __type: "shared_job";
  jobId: number;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  experienceLevel: string;
}

function parseSharedPost(content: string): SharedPost | null {
  if (!content.startsWith("{")) return null;
  try {
    const obj = JSON.parse(content);
    if (obj.__type === "shared_post") return obj as SharedPost;
  } catch {}
  return null;
}

function extractYouTubeId(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  const m = imageUrl.match(/img\.youtube\.com\/vi\/([A-Za-z0-9_-]{11})\//);
  return m ? m[1] : null;
}

function extractYouTubeIdFromText(text: string): string | null {
  const m = text.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function extractNonYtUrl(text: string): string | null {
  const YT = /(?:youtube\.com|youtu\.be)/;
  const urls = text.match(/https?:\/\/[^\s<>"']+/g) ?? [];
  return urls.find(u => !YT.test(u)) ?? null;
}

function isOnlyUrl(text: string): boolean {
  return /^https?:\/\/\S+$/.test(text.trim());
}

function formatConvPreview(preview: string | null): string {
  if (!preview) return "";
  if (!preview.startsWith("{")) return preview;
  try {
    const obj = JSON.parse(preview);
    if (obj.__type === "shared_post") return `Shared a post by ${obj.authorName ?? "someone"}`;
    if (obj.__type === "shared_job") return `Shared a job: ${obj.title ?? "a job"} at ${obj.company ?? "a company"}`;
  } catch {}
  return preview;
}

function parseSharedJob(content: string): SharedJob | null {
  if (!content.startsWith("{")) return null;
  try {
    const obj = JSON.parse(content);
    if (obj.__type === "shared_job") return obj as SharedJob;
  } catch {}
  return null;
}

function SharedJobCard({ job, isMine }: { job: SharedJob; isMine: boolean }) {
  const fmt = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return null;
    const f = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 });
    if (min && max) return `${f.format(min)} – ${f.format(max)}`;
    if (min) return `${f.format(min)}+`;
    if (max) return `Up to ${f.format(max)}`;
    return null;
  };
  const salary = fmt(job.salaryMin, job.salaryMax, job.currency);

  return (
    <a
      href={`/jobs/${job.jobId}`}
      onClick={e => e.stopPropagation()}
      className={`block rounded-xl overflow-hidden border text-left shadow-sm no-underline transition-colors max-w-[300px] ${isMine ? "border-blue-300 bg-blue-50 hover:bg-blue-100/70" : "border-gray-200 bg-white hover:bg-gray-50"}`}
    >
      {/* Company logo + title */}
      <div className="flex items-start gap-3 px-3 pt-3 pb-2">
        <div className="w-10 h-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
          {job.companyLogo ? (
            <img src={job.companyLogo} alt={job.company} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{job.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{job.company}</p>
        </div>
      </div>

      {/* Details row */}
      <div className="px-3 pb-2.5 flex flex-wrap gap-x-3 gap-y-1">
        {job.location && (
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-.895-2-2-2s-2 .895-2 2 .895 2 2 2 2-.895 2-2z"/><path strokeLinecap="round" strokeLinejoin="round" d="M10 2C6.686 2 4 4.686 4 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6z"/></svg>
            {job.location}
          </span>
        )}
        {job.experienceLevel && (
          <span className="text-[11px] text-gray-400 capitalize">{job.experienceLevel.replace("_", " ")}</span>
        )}
        {salary && (
          <span className="text-[11px] text-gray-400 flex items-center gap-0.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M6 12H4m16 0h-2M7.757 7.757l-1.414-1.414M17.657 17.657l-1.414-1.414M17.657 7.757l-1.414 1.414M7.757 17.657l-1.414 1.414"/></svg>
            {salary}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className={`px-3 py-1.5 text-[10px] font-medium border-t ${isMine ? "text-blue-400 border-blue-200" : "text-gray-400 border-gray-100"}`}>
        Shared job · Tap to view
      </div>
    </a>
  );
}

function SharedLinkPreview({ url }: { url: string }) {
  const { data, isLoading } = useQuery<{
    title: string | null; description: string | null; image: string | null;
    siteName: string | null; domain: string; favicon: string;
  }>({
    queryKey: ["msg-link-preview", url],
    queryFn: () => fetch(`${BASE}api/feed/link-preview?url=${encodeURIComponent(url)}`).then(r => r.json()),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-3 mb-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-gray-200 animate-pulse flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2.5 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-2 bg-gray-200 rounded animate-pulse w-full" />
        </div>
      </div>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="block mx-3 mb-2 rounded-lg border border-gray-200 overflow-hidden bg-white hover:bg-gray-50 transition-colors no-underline"
      onClick={e => e.stopPropagation()}
    >
      {data?.image && (
        <img src={data.image} alt="" className="w-full object-cover max-h-28" />
      )}
      <div className="px-2.5 py-2">
        {(data?.siteName ?? data?.domain) && (
          <div className="flex items-center gap-1 mb-0.5">
            {data?.favicon && <img src={data.favicon} alt="" className="w-3 h-3 flex-shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
            <span className="text-[9px] text-gray-400 uppercase tracking-wide font-medium truncate">{data?.siteName ?? data?.domain}</span>
          </div>
        )}
        {data?.title && <p className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2">{data.title}</p>}
        {!data?.title && <p className="text-[10px] text-gray-400 truncate">{url}</p>}
      </div>
    </a>
  );
}

function SharedPostCard({ shared, isMine }: { shared: SharedPost; isMine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const ytId = extractYouTubeId(shared.imageUrl) ?? extractYouTubeIdFromText(shared.content);
  const linkUrl = !ytId ? extractNonYtUrl(shared.content) : null;
  const initials = (shared.authorName ?? "?").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  // Strip the URL from content if the content is just a URL (or the same URL we're previewing)
  const displayContent = (() => {
    const stripped = shared.content.trim();
    if (isOnlyUrl(stripped)) return null;
    if (linkUrl) {
      const withoutUrl = stripped.replace(linkUrl, "").trim();
      return withoutUrl || null;
    }
    return stripped;
  })();

  return (
    <div className={`rounded-xl overflow-hidden border text-left shadow-sm ${isMine ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white"} max-w-[300px]`}>
      {/* Author row */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
        <Avatar className="w-7 h-7 border border-gray-200 flex-shrink-0">
          <AvatarImage src={shared.authorAvatar || undefined} />
          <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-900 leading-tight truncate">{shared.authorName}</p>
          {shared.authorHeadline && (
            <p className="text-[10px] text-gray-400 leading-tight truncate">{shared.authorHeadline}</p>
          )}
        </div>
      </div>

      {/* Text content (only if meaningful — not a bare URL) */}
      {displayContent && (
        <p className="px-3 pb-2 text-xs text-gray-700 leading-relaxed line-clamp-3">{displayContent}</p>
      )}

      {/* YouTube player */}
      {ytId && (
        playing ? (
          <div className="bg-black aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : (
          <button onClick={() => setPlaying(true)} className="relative w-full block group bg-black">
            <img
              src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="Video thumbnail"
              className="w-full object-cover max-h-40 opacity-90 group-hover:opacity-80 transition-opacity"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
              <span className="text-white text-[10px] font-semibold flex items-center gap-1">
                <svg className="w-3 h-3 fill-white flex-shrink-0" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                Click to play
              </span>
            </div>
          </button>
        )
      )}

      {/* Uploaded image (not YouTube) */}
      {!ytId && !linkUrl && shared.imageUrl && (
        <img src={shared.imageUrl} alt="Post image" className="w-full object-cover max-h-40" />
      )}

      {/* Link preview for non-YouTube URL posts */}
      {linkUrl && <SharedLinkPreview url={linkUrl} />}

      {/* Footer */}
      <div className={`px-3 py-1.5 text-[10px] font-medium border-t ${isMine ? "text-blue-400 border-blue-200" : "text-gray-400 border-gray-100"}`}>
        Shared post
      </div>
    </div>
  );
}

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
  conversationType: "direct" | "team";
  companyProfileId: number | null;
}

interface Message {
  id: number;
  content: string;
  isRead: boolean;
  isDeleted: boolean;
  editedAt: string | null;
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
  const queryString = useSearch();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [hoveredMsgId, setHoveredMsgId] = useState<number | null>(null);
  const [showConvMenu, setShowConvMenu] = useState(false);
  const [showDeleteConvConfirm, setShowDeleteConvConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);
  const convMenuRef = useRef<HTMLDivElement>(null);

  const { isConnected: checkConnected, sendRequest: sendConnectionRequest } = useConnections();
  const [noteInput, setNoteInput] = useState("");

  const { data: conversations = [], isLoading: convsLoading } = useQuery<Conversation[]>({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetch(`${BASE}api/conversations?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!user?.id,
    refetchInterval: 5000,
  });

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;
  const isTeamChannel = activeConv?.conversationType === "team";
  const isCompanyUser = user?.accountType === "company";

  const { data: messages = [], isLoading: msgsLoading } = useQuery<Message[]>({
    queryKey: ["messages", activeConvId, user?.id],
    queryFn: () => fetch(`${BASE}api/conversations/${activeConvId}/messages?profileId=${user?.id}`).then(r => r.json()),
    enabled: !!activeConvId && !!user?.id,
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
      qc.setQueryData<Message[]>(["messages", activeConvId, user?.id], old => [...(old ?? []), newMsg]);
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  const editMsg = useMutation({
    mutationFn: async ({ msgId, content }: { msgId: number; content: string }) => {
      const res = await fetch(`${BASE}api/conversations/${activeConvId}/messages/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: user?.id, content }),
      });
      return res.json();
    },
    onSuccess: (updated) => {
      qc.setQueryData<Message[]>(["messages", activeConvId, user?.id], old =>
        (old ?? []).map(m => m.id === updated.id ? { ...m, content: updated.content, editedAt: updated.editedAt } : m)
      );
      setEditingMsgId(null);
      setEditText("");
    },
  });

  const deleteMsg = useMutation({
    mutationFn: async (msgId: number) => {
      await fetch(`${BASE}api/conversations/${activeConvId}/messages/${msgId}?profileId=${user?.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, msgId) => {
      qc.setQueryData<Message[]>(["messages", activeConvId, user?.id], old =>
        (old ?? []).map(m => m.id === msgId ? { ...m, isDeleted: true, content: "This message was deleted." } : m)
      );
      qc.invalidateQueries({ queryKey: ["conversations", user?.id] });
    },
  });

  const deleteConv = useMutation({
    mutationFn: async (convId: number) => {
      await fetch(`${BASE}api/conversations/${convId}?profileId=${user?.id}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, convId) => {
      qc.setQueryData<Conversation[]>(["conversations", user?.id], old =>
        (old ?? []).filter(c => c.id !== convId)
      );
      setActiveConvId(null);
      setMobileView("list");
      setShowDeleteConvConfirm(false);
      setShowConvMenu(false);
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const convParam = params.get("conv");
    if (!convParam) {
      setActiveConvId(null);
      setMobileView("list");
      return;
    }
    const id = Number(convParam);
    if (!id || isNaN(id)) return;
    setActiveConvId(id);
    setMobileView("chat");
  }, [queryString]);

  useEffect(() => {
    if (activeConvId) markRead.mutate(activeConvId);
  }, [activeConvId]);

  useEffect(() => {
    if (!user?.id || user.accountType !== "company") return;
    fetch(`${BASE}api/messaging/team-channel?companyProfileId=${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
  }, [user?.id]);

  // Close conv menu on outside click
  useEffect(() => {
    if (!showConvMenu) return;
    function onDown(e: MouseEvent) {
      if (convMenuRef.current && !convMenuRef.current.contains(e.target as Node)) {
        setShowConvMenu(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showConvMenu]);

  // Auto-resize edit textarea
  useEffect(() => {
    if (editingMsgId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.style.height = "auto";
      editInputRef.current.style.height = `${editInputRef.current.scrollHeight}px`;
    }
  }, [editingMsgId]);

  function handleSelectConv(conv: Conversation) {
    navigate(`/messaging?conv=${conv.id}`);
    setActiveConvId(conv.id);
    setInput("");
    setNoteInput("");
    setMobileView("chat");
    setEditingMsgId(null);
    setShowConvMenu(false);
  }

  function handleMobileBack() {
    setMobileView("list");
    setEditingMsgId(null);
    setActiveConvId(null);
    navigate("/messaging");
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || sendMsg.isPending) return;
    sendMsg.mutate(trimmed);
  }

  function startEdit(msg: Message) {
    setEditingMsgId(msg.id);
    setEditText(msg.content);
    setHoveredMsgId(null);
  }

  function cancelEdit() {
    setEditingMsgId(null);
    setEditText("");
  }

  function submitEdit() {
    const trimmed = editText.trim();
    if (!trimmed || editMsg.isPending) return;
    editMsg.mutate({ msgId: editingMsgId!, content: trimmed });
  }

  const teamChannels = conversations.filter(c => c.conversationType === "team");
  const directConvs = conversations.filter(c => c.conversationType === "direct");
  const filteredTeam = teamChannels.filter(c => !search || c.otherParticipant?.name.toLowerCase().includes(search.toLowerCase()));
  const filteredDirect = directConvs.filter(c => !search || c.otherParticipant?.name.toLowerCase().includes(search.toLowerCase()));
  const otherInitials = (name?: string | null) => (name ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const totalUnread = conversations.reduce((acc, c) => acc + c.unreadCount, 0);

  return (
    <div className="flex overflow-hidden" style={{ height: "calc(100dvh - 56px)" }}>
      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} flex-col w-full md:w-[336px] md:flex-shrink-0 border-r border-gray-200 bg-white pb-14 md:pb-0`}>
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

        <div className="flex-1 overflow-y-auto">
          {convsLoading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!convsLoading && filteredTeam.length === 0 && filteredDirect.length === 0 && (
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

          {filteredTeam.length > 0 && (
            <>
              <div className="px-4 py-2 flex items-center gap-1.5">
                <UsersIcon className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Team Channels</span>
              </div>
              {filteredTeam.map(conv => {
                const other = conv.otherParticipant;
                const isActive = conv.id === activeConvId;
                return (
                  <button key={conv.id} onClick={() => handleSelectConv(conv)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f2ef] ${isActive ? "bg-[#dce6f0]" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <UsersIcon className="w-5 h-5 text-primary" />
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-sm truncate ${conv.unreadCount > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-800"}`}>
                            {other?.name ?? "Team"}
                          </span>
                          <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-primary/10 text-primary border-0 flex-shrink-0">Team</Badge>
                        </div>
                        <span className={`text-[10px] flex-shrink-0 ${conv.unreadCount > 0 ? "text-primary font-semibold" : "text-gray-400"}`}>
                          {convDateLabel(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                        {formatConvPreview(conv.lastMessagePreview) || "Team announcements channel"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </>
          )}

          {filteredDirect.length > 0 && (
            <>
              {filteredTeam.length > 0 && (
                <div className="px-4 py-2 flex items-center gap-1.5 mt-1 border-t border-gray-100">
                  <SendHorizontalIcon className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Direct Messages</span>
                </div>
              )}
              {filteredDirect.map(conv => {
                const other = conv.otherParticipant;
                const isActive = conv.id === activeConvId;
                return (
                  <button key={conv.id} onClick={() => handleSelectConv(conv)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f3f2ef] ${isActive ? "bg-[#dce6f0]" : ""}`}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-12 h-12 border border-gray-200">
                        <AvatarImage src={other?.avatarUrl || undefined} />
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{otherInitials(other?.name)}</AvatarFallback>
                      </Avatar>
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
                        {formatConvPreview(conv.lastMessagePreview) || "Start a conversation"}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="inline-flex mt-1 min-w-[18px] h-[18px] bg-[#0a66c2] text-white text-[10px] font-bold rounded-full px-1 items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </aside>

      {/* ── MAIN CHAT PANEL ──────────────────────────────────────────────────── */}
      <main className={`${mobileView === "list" ? "hidden md:flex" : "flex"} flex-1 flex-col bg-white min-w-0 pb-14 md:pb-0`}>
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-5">
              <SendHorizontalIcon className="w-12 h-12 text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your inbox</h2>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              Select a conversation to read messages, or find a connection on the Profiles page and start chatting.
            </p>
            <button onClick={() => navigate("/profiles")}
              className="mt-4 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-primary/90 transition-colors">
              Find connections
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 px-3 md:px-6 py-3 border-b border-gray-200">
              <button onClick={handleMobileBack}
                className="md:hidden w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0">
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              {isTeamChannel ? (
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <UsersIcon className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <Avatar className="w-10 h-10 md:w-12 md:h-12 border border-gray-200 flex-shrink-0">
                  <AvatarImage src={activeConv.otherParticipant?.avatarUrl || undefined} />
                  <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                    {otherInitials(activeConv.otherParticipant?.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-sm truncate">
                    {isTeamChannel ? `${activeConv.otherParticipant?.name ?? "Team"} — Team Channel` : activeConv.otherParticipant?.name}
                  </h3>
                  {isTeamChannel && (
                    <Badge className="text-[9px] font-bold px-1.5 py-0 rounded-full bg-primary/10 text-primary border-0 flex-shrink-0">Team</Badge>
                  )}
                </div>
                {isTeamChannel ? (
                  <p className="text-xs text-gray-500">Internal team announcements &amp; replies</p>
                ) : activeConv.otherParticipant?.headline ? (
                  <p className="text-xs text-gray-500 truncate">{activeConv.otherParticipant.headline}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {!isTeamChannel && (
                  <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                    <VideoIcon className="w-4 h-4" />
                  </button>
                )}
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                  <InfoIcon className="w-4 h-4" />
                </button>

                {/* Conv actions menu */}
                <div className="relative" ref={convMenuRef}>
                  <button
                    onClick={() => setShowConvMenu(v => !v)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <MoreHorizontalIcon className="w-4 h-4" />
                  </button>
                  {showConvMenu && (
                    <div className="absolute right-0 top-[calc(100%+4px)] w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                      <button
                        onClick={() => { setShowConvMenu(false); setShowDeleteConvConfirm(true); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2Icon className="w-4 h-4" />
                        Delete conversation
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delete conversation confirmation */}
            {showDeleteConvConfirm && (
              <div className="border-b border-red-100 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trash2Icon className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 font-medium">
                    Delete this conversation? This cannot be undone.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setShowDeleteConvConfirm(false)}
                    className="px-3 py-1 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 border border-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteConv.mutate(activeConvId!)}
                    disabled={deleteConv.isPending}
                    className="px-3 py-1 rounded-full text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteConv.isPending ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 md:px-6 py-4 flex flex-col gap-1">
              {msgsLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {isTeamChannel && messages.length === 0 && !msgsLoading && (
                <div className="flex flex-col items-center text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3">
                    <MegaphoneIcon className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">Team announcements</p>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-xs leading-relaxed">
                    {isCompanyUser
                      ? "Broadcast messages to your entire team here. Employees will see your announcements."
                      : "Company announcements will appear here. You can also reply to the team."}
                  </p>
                </div>
              )}

              {!isTeamChannel && messages.length === 0 && !msgsLoading && (() => {
                const otherId = activeConv.otherParticipant?.id;
                const connected = activeConv.isConnected || (otherId ? checkConnected(otherId) : false);
                return connected ? (
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
                ) : null;
              })()}

              {messages.map((msg, i) => {
                const isMine = msg.senderProfileId === user?.id;
                const prev = messages[i - 1];
                const showAvatar = !isMine && (!prev || prev.senderProfileId !== msg.senderProfileId);
                const showDate = !prev || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60 * 1000;
                const isFirstMsg = i === 0;
                const otherId = activeConv.otherParticipant?.id;
                const connected = activeConv.isConnected || (otherId ? checkConnected(otherId) : false);
                const isIntroMsg = !isTeamChannel && !connected && isFirstMsg && isMine;
                const isEditing = editingMsgId === msg.id;
                const isHovered = hoveredMsgId === msg.id;

                return (
                  <div
                    key={msg.id}
                    onMouseEnter={() => setHoveredMsgId(msg.id)}
                    onMouseLeave={() => setHoveredMsgId(null)}
                  >
                    {showDate && (
                      <div className="flex items-center justify-center my-3">
                        <span className="text-[11px] text-gray-400 bg-gray-50 px-3 py-0.5 rounded-full">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                    {isIntroMsg && (
                      <div className="flex justify-end mb-1">
                        <span className="text-[11px] text-gray-400 flex items-center gap-1">
                          <UserPlusIcon className="w-3 h-3" /> Sent with connection request
                        </span>
                      </div>
                    )}

                    {isTeamChannel && !isMine && showAvatar && (
                      <div className="flex items-center gap-2 mb-1 mt-2">
                        <Avatar className="w-6 h-6 border border-gray-200">
                          <AvatarImage src={msg.senderAvatarUrl || undefined} />
                          <AvatarFallback className="text-[9px] font-bold bg-primary/10 text-primary">
                            {otherInitials(msg.senderName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-semibold text-gray-700">{msg.senderName}</span>
                        <span className="text-[10px] text-gray-400">{msgDateLabel(msg.createdAt)}</span>
                      </div>
                    )}

                    <div className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMine && !isTeamChannel && (
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
                      {!isMine && isTeamChannel && <div className="w-0" />}

                      {/* Message action buttons (own non-deleted messages) */}
                      {isMine && !msg.isDeleted && !isEditing && isHovered && (
                        <div className="flex items-center gap-1 mb-1 opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(msg)}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary transition-colors"
                            title="Edit message"
                          >
                            <PenLineIcon className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteMsg.mutate(msg.id)}
                            disabled={deleteMsg.isPending}
                            className="w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 hover:border-red-300 transition-colors"
                            title="Delete message"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Bubble */}
                      {isEditing ? (
                        <div className="max-w-[75%] md:max-w-[65%] flex flex-col gap-1.5">
                          <div className="bg-white border border-[#0a66c2] rounded-2xl rounded-br-sm px-3 py-2 focus-within:shadow-sm transition-shadow">
                            <textarea
                              ref={editInputRef}
                              value={editText}
                              onChange={e => {
                                setEditText(e.target.value);
                                const el = e.target;
                                el.style.height = "auto";
                                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                              }}
                              onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitEdit(); }
                                if (e.key === "Escape") cancelEdit();
                              }}
                              rows={1}
                              className="w-full resize-none bg-transparent text-sm text-gray-900 outline-none leading-relaxed min-h-[20px] max-h-[120px]"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-[10px] text-gray-400">Esc to cancel · Enter to save</span>
                            <button onClick={cancelEdit}
                              className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100">
                              <XIcon className="w-3 h-3" />
                            </button>
                            <button onClick={submitEdit} disabled={!editText.trim() || editMsg.isPending}
                              className="w-6 h-6 rounded-full bg-primary border border-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-40">
                              <CheckIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (() => {
                        const shared = !msg.isDeleted ? parseSharedPost(msg.content) : null;
                        const sharedJob = !msg.isDeleted && !shared ? parseSharedJob(msg.content) : null;
                        if (shared) {
                          return (
                            <div className="flex flex-col gap-1">
                              <SharedPostCard shared={shared} isMine={isMine} />
                              {!isTeamChannel && (
                                <div className={`text-[10px] flex items-center gap-1 ${isMine ? "justify-end text-gray-400" : "justify-start text-gray-400"}`}>
                                  <span>{msgDateLabel(msg.createdAt)}</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        if (sharedJob) {
                          return (
                            <div className="flex flex-col gap-1">
                              <SharedJobCard job={sharedJob} isMine={isMine} />
                              {!isTeamChannel && (
                                <div className={`text-[10px] flex items-center gap-1 ${isMine ? "justify-end text-gray-400" : "justify-start text-gray-400"}`}>
                                  <span>{msgDateLabel(msg.createdAt)}</span>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div className={`max-w-[75%] md:max-w-[65%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
                            msg.isDeleted
                              ? "bg-gray-100 text-gray-400 italic rounded-br-sm border border-gray-200"
                              : isMine
                              ? "bg-[#0a66c2] text-white rounded-br-sm"
                              : isTeamChannel
                              ? "bg-[#eef3f8] text-gray-900 rounded-bl-sm border border-blue-100"
                              : "bg-[#f3f2ef] text-gray-900 rounded-bl-sm"
                          }`}>
                            {msg.content}
                            {!isTeamChannel && !msg.isDeleted && (
                              <div className={`text-[10px] mt-1 flex items-center gap-1 ${isMine ? "justify-end text-blue-100" : "justify-start text-gray-400"}`}>
                                {msg.editedAt && <span className="italic">edited</span>}
                                <span>{msgDateLabel(msg.createdAt)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom composer panel */}
            {isTeamChannel ? (
              <div className="px-3 md:px-4 py-3 border-t border-gray-200">
                {isCompanyUser && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <MegaphoneIcon className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Broadcast to team</span>
                  </div>
                )}
                <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-2xl px-3 md:px-4 py-2 focus-within:border-[#0a66c2] transition-colors">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    placeholder={isCompanyUser ? "Write an announcement for your team…" : "Reply to the team…"}
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
                  <button onClick={handleSend} disabled={!input.trim() || sendMsg.isPending}
                    className="flex-shrink-0 w-9 h-9 rounded-full bg-[#0a66c2] flex items-center justify-center text-white disabled:opacity-30 hover:bg-[#004182] transition-colors">
                    {sendMsg.isPending
                      ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <SendHorizontalIcon className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>
            ) : (
              (() => {
                const otherId = activeConv.otherParticipant?.id;
                const connected = activeConv.isConnected || (otherId ? checkConnected(otherId) : false);
                const myMsgCount = messages.filter(m => m.senderProfileId === user?.id).length;
                const firstName = activeConv.otherParticipant?.name?.split(" ")[0] ?? "";
                const fullName = activeConv.otherParticipant?.name ?? "";

                if (!connected && myMsgCount >= 1) {
                  return (
                    <div className="border-t border-gray-200 px-4 md:px-6 py-4 md:py-5 bg-[#f3f2ef]">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Connection request sent</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            Your note was sent to <strong>{firstName}</strong>. Once they accept, you can message freely.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (!connected && myMsgCount === 0) {
                  return (
                    <div className="border-t border-gray-200 bg-[#f3f2ef] px-4 md:px-6 py-4">
                      <div className="flex items-center gap-2.5 mb-3">
                        <Avatar className="w-8 h-8 border border-gray-200 flex-shrink-0">
                          <AvatarImage src={activeConv.otherParticipant?.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{otherInitials(fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">Connect with {fullName}</p>
                          <p className="text-xs text-gray-500">Add a note to personalize your request</p>
                        </div>
                      </div>
                      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#0a66c2] transition-colors mb-2">
                        <textarea
                          rows={3}
                          maxLength={300}
                          placeholder={`Hi ${firstName}, I'd like to connect with you on Hire Me Remotely.`}
                          value={noteInput}
                          onChange={e => setNoteInput(e.target.value)}
                          className="w-full resize-none px-3 pt-2.5 pb-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none leading-relaxed"
                        />
                        <div className="flex justify-end px-3 pb-1.5">
                          <span className="text-[11px] text-gray-400">{noteInput.length}/300</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {otherId && (
                          <button onClick={() => sendConnectionRequest(otherId, "")}
                            className="px-4 py-1.5 rounded-full border border-gray-400 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
                            Skip
                          </button>
                        )}
                        <button
                          onClick={() => { if (otherId) sendConnectionRequest(otherId, noteInput.trim()); setNoteInput(""); }}
                          className="px-5 py-1.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                        >
                          <UserPlusIcon className="w-3.5 h-3.5" />
                          Send request
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="px-3 md:px-4 py-3 border-t border-gray-200">
                    <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-2xl px-3 md:px-4 py-2 focus-within:border-[#0a66c2] transition-colors">
                      <textarea
                        ref={inputRef}
                        rows={1}
                        placeholder={`Message ${firstName}…`}
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
                      <button onClick={handleSend} disabled={!input.trim() || sendMsg.isPending}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-[#0a66c2] flex items-center justify-center text-white disabled:opacity-30 hover:bg-[#004182] transition-colors">
                        {sendMsg.isPending
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <SendHorizontalIcon className="w-4 h-4" />
                        }
                      </button>
                    </div>
                  </div>
                );
              })()
            )}
          </>
        )}
      </main>
    </div>
  );
}

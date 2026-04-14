import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetFeedStats, getGetFeedStatsQueryKey, useListFeaturedProfiles, getListFeaturedProfilesQueryKey, useListFeaturedJobs, getListFeaturedJobsQueryKey } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  ThumbsUpIcon,
  MessageSquareIcon,
  Share2Icon,
  SendIcon,
  BriefcaseIcon,
  UsersIcon,
  TrendingUpIcon,
  BookmarkIcon,
  ImageIcon,
  BuildingIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlayCircleIcon,
  XIcon,
  MoreVerticalIcon,
  PencilIcon,
  Trash2Icon,
  CheckIcon,
  SendHorizontalIcon,
  ClockIcon,
  FileTextIcon,
  StarIcon,
  LinkIcon,
  UserPlusIcon,
  UserCheckIcon,
  VideoIcon,
  NewspaperIcon,
  CameraIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUpload } from "@workspace/object-storage-web";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { useStartChat } from "@/hooks/use-start-chat";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useToast } from "@/hooks/use-toast";

// ── Reaction definitions ─────────────────────────────────────────────────────
const REACTIONS = [
  { type: "like",       emoji: "👍", label: "Like",       color: "text-blue-600",   bg: "bg-blue-50" },
  { type: "celebrate",  emoji: "🎉", label: "Celebrate",  color: "text-green-600",  bg: "bg-green-50" },
  { type: "support",    emoji: "🤝", label: "Support",    color: "text-amber-600",  bg: "bg-amber-50" },
  { type: "love",       emoji: "❤️",  label: "Love",       color: "text-red-500",    bg: "bg-red-50" },
  { type: "insightful", emoji: "💡", label: "Insightful", color: "text-orange-500", bg: "bg-orange-50" },
  { type: "funny",      emoji: "😄", label: "Funny",      color: "text-yellow-500", bg: "bg-yellow-50" },
] as const;
type ReactionType = typeof REACTIONS[number]["type"];

function getReaction(type: string | null) {
  return REACTIONS.find(r => r.type === type) ?? REACTIONS[0];
}

// ── YouTube helpers ─────────────────────────────────────────────────────────
function extractYouTubeId(text: string): string | null {
  const match = text.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function ytThumb(id: string) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

function ytUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

interface PostComment {
  id: number;
  content: string;
  createdAt: string;
  profileId: number;
  profileName: string;
  profileHeadline: string;
  profileAvatarUrl: string | null;
}

interface FeedPost {
  id: number;
  content: string;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  profileId: number;
  profileName: string;
  profileHeadline: string;
  profileAvatarUrl: string | null;
  profileAccountType: string;
  reactionCounts: Record<string, number>;
  myReaction: string | null;
}

// ── Comments Section ─────────────────────────────────────────────────────────
function CommentsSection({ postId, currentUserId, currentUserAvatar, currentUserName, onCountChange }: {
  postId: number;
  currentUserId?: number;
  currentUserAvatar?: string;
  currentUserName?: string;
  onCountChange: (delta: number) => void;
}) {
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentInitials = (currentUserName ?? "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: ["comments", postId],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts/${postId}/comments`);
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: currentUserId, content }),
      });
      return res.json() as Promise<PostComment>;
    },
    onSuccess: (created) => {
      setNewComment("");
      qc.setQueryData<PostComment[]>(["comments", postId], old => [...(old ?? []), created]);
      onCountChange(1);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      await fetch(`${import.meta.env.BASE_URL}api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      return commentId;
    },
    onSuccess: (commentId) => {
      qc.setQueryData<PostComment[]>(["comments", postId], old => (old ?? []).filter(c => c.id !== commentId));
      onCountChange(-1);
    },
  });

  function submit() {
    const trimmed = newComment.trim();
    if (!trimmed || !currentUserId || addMutation.isPending) return;
    addMutation.mutate(trimmed);
  }

  return (
    <div className="mt-1 pt-3 border-t border-gray-100">
      {/* Comment list */}
      {isLoading && (
        <div className="flex justify-center py-3">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
      )}

      <div className="space-y-2.5 mb-3">
        {comments.map(comment => {
          const initials = comment.profileName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
          const isOwn = comment.profileId === currentUserId;
          return (
            <div key={comment.id} className="flex gap-2.5">
              <Link href={`/profiles/${comment.profileId}`} className="flex-shrink-0 mt-0.5">
                <Avatar className="w-8 h-8 border border-gray-100">
                  <AvatarImage src={comment.profileAvatarUrl || undefined} />
                  <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 rounded-2xl px-3 py-2 relative group">
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <Link href={`/profiles/${comment.profileId}`}>
                        <span className="text-xs font-semibold text-gray-900 hover:underline leading-tight">{comment.profileName}</span>
                      </Link>
                      {comment.profileHeadline && (
                        <p className="text-[10px] text-gray-400 leading-tight truncate">{comment.profileHeadline}</p>
                      )}
                    </div>
                    {isOwn && (
                      <button
                        onClick={() => deleteMutation.mutate(comment.id)}
                        disabled={deleteMutation.isPending}
                        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
                        title="Delete comment"
                      >
                        <Trash2Icon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-700 mt-1 leading-relaxed whitespace-pre-line">{comment.content}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 ml-3">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* New comment input */}
      {currentUserId ? (
        <div className="flex gap-2 items-end">
          <Avatar className="w-8 h-8 flex-shrink-0 border border-gray-100">
            <AvatarImage src={currentUserAvatar} />
            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">{currentInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex items-end gap-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-primary/50 focus-within:bg-white transition-colors px-3 py-2">
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="Add a comment…"
              value={newComment}
              onChange={e => {
                setNewComment(e.target.value);
                const el = e.target;
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
              }}
              className="flex-1 bg-transparent text-xs resize-none outline-none min-h-[20px] max-h-28 leading-relaxed"
            />
            <button
              onClick={submit}
              disabled={!newComment.trim() || addMutation.isPending}
              className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors mb-px"
            >
              {addMutation.isPending
                ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <SendHorizontalIcon className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        </div>
      ) : (
        <Link href="/login">
          <p className="text-xs text-primary hover:underline text-center py-1">Log in to comment</p>
        </Link>
      )}
    </div>
  );
}

// ── Send-to-connection modal ──────────────────────────────────────────────────
function SendToModal({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const startChat = useStartChat();
  const [, navigate] = useLocation();
  const [sending, setSending] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data } = useQuery({
    queryKey: ["send-search", query],
    queryFn: () =>
      fetch(`${import.meta.env.BASE_URL}api/profiles?${query ? `search=${encodeURIComponent(query)}&` : ""}limit=8`).then(r => r.json()),
  });
  const profiles: any[] = data?.profiles ?? [];

  async function handleSend(profileId: number) {
    setSending(profileId);
    await startChat(profileId);
    navigate("/messaging");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Send to a connection</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Post preview */}
        <div className="mx-4 mt-3 mb-1 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
          <p className="text-xs text-gray-500 font-medium">{post.profileName}</p>
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{post.content}</p>
        </div>

        <div className="px-4 pt-2 pb-3">
          <input
            autoFocus
            type="text"
            placeholder="Search people..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 bg-gray-50"
          />
        </div>

        <div className="max-h-60 overflow-y-auto px-2 pb-3">
          {profiles.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">No people found</p>
          )}
          {profiles.map((p: any) => {
            const initials = p.name.slice(0, 2).toUpperCase();
            return (
              <button
                key={p.id}
                onClick={() => handleSend(p.id)}
                disabled={sending === p.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
              >
                <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                  <AvatarImage src={p.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{p.name}</p>
                  <p className="text-xs text-gray-400 truncate">{p.headline}</p>
                </div>
                {sending === p.id
                  ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : <SendIcon className="w-4 h-4 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, currentUserId, currentUserAvatar, currentUserName }: {
  post: FeedPost; currentUserId?: number; currentUserAvatar?: string; currentUserName?: string;
}) {
  const qc = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editYtId, setEditYtId] = useState<string | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);

  // ── Reactions state ──
  const [myReaction, setMyReaction] = useState<string | null>(post.myReaction);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(post.reactionCounts ?? {});
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const isOwn = currentUserId === post.profileId;
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  async function handleShare() {
    const url = window.location.origin + "/feed";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${post.profileName} on Hire Me Remotely`,
          text: post.content.slice(0, 150),
          url,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied to clipboard" });
      } catch {
        toast({ title: "Could not copy link", variant: "destructive" });
      }
    }
  }

  useEffect(() => {
    setEditYtId(extractYouTubeId(editContent));
  }, [editContent]);

  // ── React mutation ──
  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      if (!currentUserId) return null;
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts/${post.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: currentUserId, reactionType }),
      });
      return res.json() as Promise<{ action: "added" | "removed" | "changed"; reactionType: string | null }>;
    },
    onMutate: (reactionType) => {
      // Optimistic update
      setReactionCounts(prev => {
        const next = { ...prev };
        if (myReaction) {
          // Remove old
          next[myReaction] = Math.max((next[myReaction] ?? 1) - 1, 0);
          if (next[myReaction] === 0) delete next[myReaction];
        }
        if (myReaction !== reactionType) {
          // Add new
          next[reactionType] = (next[reactionType] ?? 0) + 1;
        }
        return next;
      });
      setMyReaction(prev => (prev === reactionType ? null : reactionType));
      setPickerOpen(false);
    },
    onError: () => {
      // Rollback
      setMyReaction(post.myReaction);
      setReactionCounts(post.reactionCounts ?? {});
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageUrl }),
      });
      if (!res.ok) throw new Error("Failed to update post");
      return res.json();
    },
    onSuccess: () => {
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`${import.meta.env.BASE_URL}api/posts/${post.id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts"] }),
  });

  function openPicker() {
    if (pickerTimeout.current) clearTimeout(pickerTimeout.current);
    setPickerOpen(true);
  }
  function closePicker(delay = 200) {
    pickerTimeout.current = setTimeout(() => setPickerOpen(false), delay);
  }

  function startEdit() {
    setEditContent(post.content);
    setEditing(true);
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditContent(post.content);
  }

  function saveEdit() {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    const imageUrl = editYtId ? ytThumb(editYtId) : undefined;
    editMutation.mutate({ content: trimmed, imageUrl });
  }

  function removeEditYt() {
    setEditContent(prev => prev.replace(/https?:\/\/(?:www\.)?(?:youtube\.com\/\S+|youtu\.be\/\S+)/g, "").trim());
  }

  return (
    <>
    {sendOpen && <SendToModal post={post} onClose={() => setSendOpen(false)} />}
    <Card className="rounded-xl overflow-hidden border border-gray-200 shadow-none bg-white">
      <CardContent className="p-4">

        {/* Author row */}
        <div className="flex items-start gap-3 mb-3">
          <Link href={`/profiles/${post.profileId}`}>
            <Avatar className="w-12 h-12 border border-gray-200 flex-shrink-0">
              <AvatarImage src={post.profileAvatarUrl || undefined} />
              <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                {post.profileName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <Link href={`/profiles/${post.profileId}`} className="font-semibold text-sm text-gray-900 hover:underline leading-tight block">
              {post.profileName}
            </Link>
            <p className="text-xs text-gray-500 leading-snug line-clamp-1">{post.profileHeadline}</p>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {post.profileAccountType === "company" && (
              <Badge variant="secondary" className="text-[10px]">
                <BuildingIcon className="w-3 h-3 mr-1" />Company
              </Badge>
            )}
            {/* 3-dot menu — shown for all posts when logged in */}
            {currentUserId && (
              <div className="relative">
                <button
                  onClick={() => { setMenuOpen(o => !o); setConfirmDelete(false); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <MoreVerticalIcon className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div className="absolute right-0 top-9 z-20 w-44 bg-white border border-gray-200 rounded-xl shadow-lg py-1 overflow-hidden">
                      {/* Save / Unsave — for all posts */}
                      <button
                        onClick={() => { toggleBookmark("post", post.id); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <BookmarkIcon className={`w-3.5 h-3.5 ${isBookmarked("post", post.id) ? "fill-primary text-primary" : "text-gray-400"}`} />
                        {isBookmarked("post", post.id) ? "Unsave post" : "Save post"}
                      </button>
                      {/* Edit / Delete — only for own posts */}
                      {isOwn && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <button
                            onClick={startEdit}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <PencilIcon className="w-3.5 h-3.5 text-gray-400" /> Edit post
                          </button>
                          <button
                            onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2Icon className="w-3.5 h-3.5" /> Delete post
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Delete confirmation banner */}
        {confirmDelete && (
          <div className="mb-3 flex items-center justify-between bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 gap-2">
            <p className="text-sm text-red-700 font-medium">Delete this post?</p>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-7 rounded-full text-xs px-3">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="h-7 rounded-full text-xs px-3 bg-red-600 hover:bg-red-700 text-white border-0"
              >
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        )}

        {/* Content — either editing or display */}
        {editing ? (
          <div className="mb-3">
            <Textarea
              autoFocus
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[80px] text-sm resize-none rounded-xl border-gray-200 focus-visible:ring-1 focus-visible:ring-primary"
            />
            {/* YouTube preview while editing */}
            {editYtId && (
              <div className="mt-2 rounded-xl overflow-hidden border border-gray-200 relative bg-black">
                <img src={ytThumb(editYtId)} alt="" className="w-full object-cover max-h-40 opacity-90" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <PlayCircleIcon className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>
                <button
                  onClick={removeEditYt}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                >
                  <XIcon className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit} className="rounded-full h-8 text-xs px-3">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveEdit}
                disabled={!editContent.trim() || editMutation.isPending}
                className="rounded-full h-8 text-xs px-4 gap-1.5"
              >
                {editMutation.isPending ? "Saving…" : <><CheckIcon className="w-3.5 h-3.5" /> Save</>}
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line mb-3">{post.content}</p>
        )}

        {/* YouTube / image preview (display mode only) */}
        {!editing && (() => {
          const ytId = extractYouTubeId(post.content);
          const hasYt = Boolean(ytId);
          const thumb = hasYt ? ytThumb(ytId!) : post.imageUrl;
          if (!thumb) return null;
          return (
            <div
              className="rounded-xl overflow-hidden mb-3 bg-black relative group cursor-pointer"
              onClick={() => hasYt && window.open(ytUrl(ytId!), "_blank")}
            >
              <img
                src={thumb}
                alt=""
                className={`w-full object-cover max-h-72 ${hasYt ? "opacity-85 group-hover:opacity-75 transition-opacity" : ""}`}
              />
              {hasYt && (
                <>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                      <PlayCircleIcon className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-2">
                    <span className="text-white text-xs font-medium flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                      Watch on YouTube
                    </span>
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Reaction summary row */}
        {totalReactions > 0 && (
          <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-0.5">
            <div className="flex items-center gap-1">
              {/* Top 3 reaction emojis */}
              <div className="flex -space-x-0.5">
                {REACTIONS.filter(r => reactionCounts[r.type] > 0)
                  .sort((a, b) => (reactionCounts[b.type] ?? 0) - (reactionCounts[a.type] ?? 0))
                  .slice(0, 3)
                  .map(r => (
                    <span key={r.type} className="text-sm leading-none">{r.emoji}</span>
                  ))
                }
              </div>
              <span>{totalReactions.toLocaleString()}</span>
            </div>
            {commentsCount > 0 && (
              <button onClick={() => setCommentsOpen(o => !o)} className="hover:underline">
                {commentsCount} comment{commentsCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}

        <Separator className="mb-2" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* ── Reaction button with hover picker ── */}
          <div className="relative flex-1" onMouseLeave={() => closePicker()}>
            <button
              onMouseEnter={openPicker}
              onClick={() => {
                if (!currentUserId) return;
                reactMutation.mutate(myReaction ?? "like");
              }}
              className={`w-full flex items-center gap-1.5 justify-center py-1.5 rounded-lg text-xs font-semibold transition-all ${
                myReaction
                  ? `${getReaction(myReaction).color} bg-opacity-10`
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {myReaction ? (
                <span className="text-base leading-none">{getReaction(myReaction).emoji}</span>
              ) : (
                <ThumbsUpIcon className="w-4 h-4" />
              )}
              <span>{myReaction ? getReaction(myReaction).label : "Like"}</span>
            </button>

            {/* Floating reaction picker */}
            {pickerOpen && (
              <div
                className="absolute bottom-full left-0 mb-1 z-30"
                onMouseEnter={openPicker}
                onMouseLeave={() => closePicker()}
              >
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full shadow-xl px-2 py-1.5">
                  {REACTIONS.map(r => (
                    <button
                      key={r.type}
                      onClick={() => { if (currentUserId) reactMutation.mutate(r.type); }}
                      className="group flex flex-col items-center relative"
                      title={r.label}
                    >
                      <span className={`text-2xl leading-none transition-transform group-hover:scale-125 group-hover:-translate-y-1 ${myReaction === r.type ? "scale-110" : ""}`}>
                        {r.emoji}
                      </span>
                      {/* Tooltip */}
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {r.label}
                      </span>
                      {myReaction === r.type && (
                        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setCommentsOpen(o => !o)}
            className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              commentsOpen ? "text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <MessageSquareIcon className="w-4 h-4" />Comment
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Share2Icon className="w-4 h-4" />Share
          </button>
          <button
            onClick={() => setSendOpen(true)}
            className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <SendIcon className="w-4 h-4" />Send
          </button>
        </div>

        {/* Comments section */}
        {commentsOpen && (
          <CommentsSection
            postId={post.id}
            currentUserId={currentUserId}
            currentUserAvatar={currentUserAvatar}
            currentUserName={currentUserName}
            onCountChange={delta => setCommentsCount(c => Math.max(0, c + delta))}
          />
        )}
      </CardContent>
    </Card>
    </>
  );
}

export default function Home() {
  const { user } = useAppAuth();
  const [postContent, setPostContent] = useState("");
  const [postFocused, setPostFocused] = useState(false);
  const [ytId, setYtId] = useState<string | null>(null);
  const [postType, setPostType]       = useState<"text" | "photo" | "video" | "article" | "link">("text");
  const [postPhoto, setPostPhoto]     = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [postLink, setPostLink]       = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const resetComposer = () => {
    setPostFocused(false);
    setPostContent("");
    setPostType("text");
    setPostPhoto(null);
    setPhotoPreview(null);
    setPostLink("");
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const BASE = import.meta.env.BASE_URL;
    const { uploadURL, objectPath } = await fetch(`${BASE}api/storage/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    }).then(r => r.json());
    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    return `${BASE}api/storage/public-objects/${objectPath}`;
  };

  useEffect(() => {
    setYtId(extractYouTubeId(postContent));
  }, [postContent]);

  const queryClient = useQueryClient();

  const currentId       = user?.id ?? 1;
  const currentName     = user?.name ?? "Guest";
  const currentHeadline = user?.headline ?? "";
  const currentAvatar   = user?.avatarUrl ?? undefined;
  const currentInitials = currentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  // Avatar upload / remove / lightbox
  const avatarInputRef  = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showLightbox, setShowLightbox]       = useState(false);
  const { toast } = useToast();

  const { uploadFile } = useUpload({
    async onSuccess(res) {
      const avatarUrl = `/api/storage${res.objectPath}`;
      await fetch(`${import.meta.env.BASE_URL}api/profiles/${user!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
      });
      const raw = localStorage.getItem("app_user_session");
      if (raw) {
        try { localStorage.setItem("app_user_session", JSON.stringify({ ...JSON.parse(raw), avatarUrl })); } catch {}
      }
      setAvatarUploading(false);
      window.location.reload();
    },
    onError() { setAvatarUploading(false); toast({ title: "Upload failed", variant: "destructive" }); },
  });

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    await uploadFile(file);
    e.target.value = "";
  }

  async function removeAvatar() {
    if (!user) return;
    await fetch(`${import.meta.env.BASE_URL}api/profiles/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: null }),
    });
    const raw = localStorage.getItem("app_user_session");
    if (raw) {
      try { localStorage.setItem("app_user_session", JSON.stringify({ ...JSON.parse(raw), avatarUrl: null })); } catch {}
    }
    window.location.reload();
  }

  const { data: stats } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });

  // Personalized application data for the sidebar widget
  const { data: myApplications = [] } = useQuery<any[]>({
    queryKey: ["my-applications", user?.id],
    queryFn: () =>
      fetch(`${import.meta.env.BASE_URL}api/profiles/${user!.id}/applications`).then(r => r.json()),
    enabled: !!user?.id && user.accountType === "individual",
    staleTime: 60_000,
  });

  const appStatusCounts = myApplications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});
  const mostRecentApp = myApplications.at(0);

  const { data: suggestedProfiles } = useListFeaturedProfiles({ query: { queryKey: getListFeaturedProfilesQueryKey() } });
  const { data: featuredJobs } = useListFeaturedJobs({ query: { queryKey: getListFeaturedJobsQueryKey() } });
  const { isConnected: isFeedConnected, toggleConnect: feedToggleConnect } = useConnections();
  const startChat = useStartChat();
  const [, navigate] = useLocation();
  const handleFeedMessage = useCallback(async (profileId: number) => {
    await startChat(profileId);
    navigate("/messaging");
  }, [startChat, navigate]);

  const [visibleCount, setVisibleCount] = useState(10);

  const { data: allPosts = [], isLoading: postsLoading } = useQuery<FeedPost[]>({
    queryKey: ["posts", user?.id],
    queryFn: async () => {
      const url = user?.id
        ? `${import.meta.env.BASE_URL}api/posts?profileId=${user.id}`
        : `${import.meta.env.BASE_URL}api/posts`;
      const res = await fetch(url);
      return res.json();
    },
  });

  const posts = allPosts.slice(0, visibleCount);
  const hasMore = allPosts.length > visibleCount;


  const createPostMutation = useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: currentId, content, imageUrl }),
      });
      return res.json();
    },
    onSuccess: () => {
      resetComposer();
      setYtId(null);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full pb-24 md:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">

        {/* LEFT: Profile summary card */}
        <aside className="hidden lg:flex flex-col gap-3 sticky top-20">

          {/* ── LinkedIn-style profile card ── */}
          <Card className="rounded-xl overflow-hidden border border-gray-200 shadow-none bg-white">

            {/* Banner */}
            <div className="h-[54px] bg-gradient-to-r from-primary/70 via-primary/45 to-indigo-300/60" />

            {/* Avatar with upload / view / remove */}
            <div className="px-3 -mt-[34px] mb-1 flex items-end gap-2">
              {/* Hidden file input */}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />

              <div className="relative group/av">
                {/* Avatar itself — click to view full-size if photo exists */}
                <button
                  type="button"
                  onClick={() => currentAvatar && setShowLightbox(true)}
                  className={`block rounded-full focus:outline-none ${currentAvatar ? "cursor-zoom-in" : "cursor-default"}`}
                  title={currentAvatar ? "View photo" : undefined}
                >
                  <Avatar className={`w-[68px] h-[68px] border-[3px] border-white shadow-sm ring-1 ring-gray-100 transition-opacity ${avatarUploading ? "opacity-40" : ""}`}>
                    <AvatarImage src={currentAvatar} />
                    <AvatarFallback className="font-bold text-xl bg-primary/10 text-primary">{currentInitials}</AvatarFallback>
                  </Avatar>
                </button>

                {/* Hover actions — only shown when logged in */}
                {user && (
                  <div className="absolute -bottom-1 -right-1 flex gap-0.5 opacity-0 group-hover/av:opacity-100 transition-opacity">
                    {/* Upload / change */}
                    <button
                      type="button"
                      title="Upload photo"
                      disabled={avatarUploading}
                      onClick={() => avatarInputRef.current?.click()}
                      className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      <CameraIcon className="w-3 h-3" />
                    </button>
                    {/* Remove — only if photo exists */}
                    {currentAvatar && (
                      <button
                        type="button"
                        title="Remove photo"
                        onClick={removeAvatar}
                        className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm hover:bg-red-600 transition-colors"
                      >
                        <Trash2Icon className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Lightbox */}
            {showLightbox && currentAvatar && (
              <div
                className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center"
                onClick={() => setShowLightbox(false)}
              >
                <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                  <img src={currentAvatar} alt={currentName} className="w-full rounded-2xl shadow-2xl object-cover" />
                  <button
                    onClick={() => setShowLightbox(false)}
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-gray-700 flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                  <div className="flex gap-2 mt-3 justify-center">
                    <button
                      onClick={() => { setShowLightbox(false); avatarInputRef.current?.click(); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-primary px-3 py-1.5 rounded-full hover:bg-primary/90 transition-colors"
                    >
                      <CameraIcon className="w-3.5 h-3.5" /> Change photo
                    </button>
                    <button
                      onClick={() => { setShowLightbox(false); removeAvatar(); }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-white bg-red-500 px-3 py-1.5 rounded-full hover:bg-red-600 transition-colors"
                    >
                      <Trash2Icon className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Name / headline / location */}
            <div className="px-3 pb-3">
              <Link href={user ? `/profiles/${user.id}` : "/login"} className="block group">
                <p className="font-semibold text-sm text-gray-900 leading-snug group-hover:underline">{currentName}</p>
              </Link>
              <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{currentHeadline}</p>
              <Link
                href={user ? `/profiles/${user.id}` : "/login"}
                className="inline-block mt-2 text-xs font-semibold text-primary border border-primary/40 rounded-full px-3 py-0.5 hover:bg-primary/5 transition-colors"
              >
                View profile
              </Link>
            </div>

            <Separator />

            {/* Analytics stats */}
            <div className="px-3 py-2.5 space-y-2.5">
              <div className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-xs text-gray-600 group-hover:underline group-hover:text-primary font-medium">Profile viewers</p>
                  <p className="text-[11px] text-gray-400">Past 90 days</p>
                </div>
                <span className="text-sm font-bold text-primary">{((currentId * 19 + 47) % 251) + 50}</span>
              </div>
              <div className="flex items-center justify-between cursor-pointer group">
                <div>
                  <p className="text-xs text-gray-600 group-hover:underline group-hover:text-primary font-medium">Post impressions</p>
                  <p className="text-[11px] text-gray-400">Past 7 days · <span className="text-green-600">↑ {((currentId * 7 + 11) % 30) + 5}%</span></p>
                </div>
                <span className="text-sm font-bold text-primary">{(((currentId * 113 + 283) % 1800) + 400).toLocaleString()}</span>
              </div>
            </div>

            <div className="px-3 pb-3">
              <Link href="/analytics" className="text-xs font-semibold text-gray-600 hover:text-primary hover:underline flex items-center gap-0.5">
                View all analytics <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <Separator />

            {/* My items */}
            <div className="px-3 py-2.5">
              <Link href="/my-items" className="flex items-center gap-2.5 group">
                <BookmarkIcon className="w-4 h-4 text-gray-500 group-hover:text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 group-hover:text-primary group-hover:underline">My items</span>
              </Link>
            </div>
          </Card>

          {/* ── My Applications / Hiring widget ── */}
          {user && user.accountType === "individual" && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white overflow-hidden">
              <CardContent className="px-3 py-3 space-y-0">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Applications</p>
                  <span className="text-xs font-bold text-primary bg-primary/8 px-2 py-0.5 rounded-full">
                    {myApplications.length}
                  </span>
                </div>

                {myApplications.length === 0 ? (
                  <div className="py-2 text-center">
                    <FileTextIcon className="w-6 h-6 text-gray-200 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-400">No applications yet</p>
                    <Link href="/jobs">
                      <p className="text-xs text-primary font-semibold mt-1 hover:underline cursor-pointer">Browse open roles →</p>
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Status breakdown */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {[
                        { key: "pending",   label: "Submitted", color: "bg-amber-50 text-amber-700" },
                        { key: "reviewing", label: "Reviewing", color: "bg-blue-50 text-blue-700" },
                        { key: "interview", label: "Interview", color: "bg-purple-50 text-purple-700" },
                        { key: "offer",     label: "Offer",     color: "bg-green-50 text-green-700" },
                      ]
                        .filter(s => appStatusCounts[s.key])
                        .map(s => (
                          <span key={s.key} className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                            {appStatusCounts[s.key]} {s.label}
                          </span>
                        ))
                      }
                    </div>

                    {/* Most recent application */}
                    {mostRecentApp && (
                      <Link href="/applications">
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-primary/5 transition-colors cursor-pointer group -mx-0.5">
                          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <BriefcaseIcon className="w-3 h-3 text-primary" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 group-hover:text-primary transition-colors truncate leading-tight">
                              {mostRecentApp.job?.title}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{mostRecentApp.job?.company}</p>
                          </div>
                        </div>
                      </Link>
                    )}
                  </>
                )}

                <div className="pt-2.5">
                  <Link href="/applications" className="text-xs font-semibold text-gray-600 hover:text-primary hover:underline flex items-center gap-0.5">
                    View all applications <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Company hiring quick stats */}
          {user && user.accountType === "company" && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="px-3 py-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Hiring</p>
                {[
                  { icon: BriefcaseIcon, color: "bg-primary/10 text-primary",  value: stats?.totalJobs ?? 0,   label: "Active job posts" },
                  { icon: ClockIcon,     color: "bg-amber-50 text-amber-600",  value: stats?.remoteJobsPostedThisWeek ?? 0, label: "New this week" },
                ].map(({ icon: Icon, color, value, label }) => (
                  <div key={label} className="flex items-center gap-2.5 py-1.5 -mx-1 px-1 rounded-lg">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{value.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-1.5">
                  <Link href="/company-dashboard" className="text-xs font-semibold text-gray-600 hover:text-primary hover:underline flex items-center gap-0.5">
                    Go to dashboard <ChevronRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </aside>

        {/* CENTER: Feed */}
        <div className="flex flex-col gap-4 min-w-0">
          {/* Post composer */}
          <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="w-10 h-10 border border-gray-200 flex-shrink-0">
                  <AvatarImage src={currentAvatar} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{currentInitials}</AvatarFallback>
                </Avatar>
                {/* Hidden file input for photo uploads */}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setPostPhoto(file);
                      setPhotoPreview(URL.createObjectURL(file));
                    }
                    e.target.value = "";
                  }}
                />

                {!postFocused ? (
                  <button
                    onClick={() => { setPostFocused(true); setPostType("text"); }}
                    className="flex-1 text-left text-sm text-gray-400 border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    Share something with the network...
                  </button>
                ) : (
                  <div className="flex-1">
                    <Textarea
                      autoFocus={postType !== "photo"}
                      placeholder={
                        postType === "photo"   ? "Add a caption…" :
                        postType === "video"   ? "Share your thoughts about this video…" :
                        postType === "article" ? "Write your article…" :
                        postType === "link"    ? "Say something about this link…" :
                        "What do you want to talk about?"
                      }
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      className="border-0 focus-visible:ring-0 p-0 min-h-[80px] resize-none text-sm"
                    />

                    {/* Photo preview */}
                    {postType === "photo" && photoPreview && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 relative group">
                        <img src={photoPreview} alt="Preview" className="w-full object-cover max-h-64" />
                        <button
                          onClick={() => { setPostPhoto(null); setPhotoPreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                        >
                          <XIcon className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    )}
                    {postType === "photo" && !photoPreview && (
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        className="mt-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-primary/40 hover:text-primary transition-colors flex flex-col items-center gap-1.5"
                      >
                        <ImageIcon className="w-6 h-6" />
                        Click to choose a photo
                      </button>
                    )}

                    {/* Link input */}
                    {postType === "link" && (
                      <div className="mt-3">
                        <input
                          type="url"
                          placeholder="Paste a link URL…"
                          value={postLink}
                          onChange={e => setPostLink(e.target.value)}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    )}

                    {/* Video hint */}
                    {postType === "video" && !ytId && (
                      <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
                        <VideoIcon className="w-3.5 h-3.5 text-red-400" />
                        Paste a YouTube link in the text above to embed a video preview
                      </p>
                    )}

                    {/* YouTube preview */}
                    {ytId && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-gray-200 relative group bg-black">
                        <img
                          src={ytThumb(ytId)}
                          alt="YouTube thumbnail"
                          className="w-full object-cover max-h-48 opacity-90"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
                            <PlayCircleIcon className="w-7 h-7 text-white fill-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                          <span className="text-white text-xs font-medium">YouTube video detected</span>
                        </div>
                        <button
                          onClick={() => { setPostContent(postContent.replace(/https?:\/\/(?:www\.)?(?:youtube\.com\/\S+|youtu\.be\/\S+)/g, "").trim()); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                          title="Remove YouTube link"
                        >
                          <XIcon className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {postFocused && (
                <div className="flex justify-end gap-2 mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetComposer}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={
                      (postType === "photo" ? !photoPreview : !postContent.trim() && !postLink.trim()) ||
                      createPostMutation.isPending ||
                      photoUploading
                    }
                    onClick={async () => {
                      let imageUrl: string | undefined;
                      if (postPhoto) {
                        setPhotoUploading(true);
                        try { imageUrl = await uploadPhoto(postPhoto); }
                        finally { setPhotoUploading(false); }
                      } else if (ytId) {
                        imageUrl = ytThumb(ytId);
                      }
                      const finalContent = postLink
                        ? `${postContent.trim()}\n\n${postLink}`.trim()
                        : postContent.trim();
                      createPostMutation.mutate({ content: finalContent || " ", imageUrl });
                    }}
                    className="rounded-full text-xs px-5"
                  >
                    {photoUploading ? "Uploading…" : createPostMutation.isPending ? "Posting…" : "Post"}
                  </Button>
                </div>
              )}

              {!postFocused && (
                <div className="flex items-center gap-1 mt-2">
                  <button
                    onClick={() => { setPostFocused(true); setPostType("photo"); photoInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span className="hidden sm:inline">Photo</span>
                  </button>
                  <button
                    onClick={() => { setPostFocused(true); setPostType("video"); }}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <VideoIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                  <button
                    onClick={() => { setPostFocused(true); setPostType("article"); }}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <NewspaperIcon className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    <span className="hidden sm:inline">Article</span>
                  </button>
                  <button
                    onClick={() => { setPostFocused(true); setPostType("link"); }}
                    className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    <LinkIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="hidden sm:inline">Link</span>
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts */}
          {postsLoading ? (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-8 text-center text-sm text-gray-400">Loading feed...</CardContent>
            </Card>
          ) : allPosts.length === 0 ? (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-8 text-center text-sm text-gray-400">No posts yet. Be the first to share something!</CardContent>
            </Card>
          ) : (
            <>
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  currentUserAvatar={user?.avatarUrl ?? undefined}
                  currentUserName={user?.name ?? undefined}
                />
              ))}
              {hasMore && (
                <button
                  onClick={() => setVisibleCount(c => c + 10)}
                  className="w-full py-3 text-sm font-semibold text-primary border border-primary/30 rounded-xl bg-white hover:bg-primary/5 transition-colors"
                >
                  Load more posts
                </button>
              )}
              {!hasMore && allPosts.length > 0 && (
                <p className="text-center text-xs text-gray-400 py-4">You're all caught up!</p>
              )}
            </>
          )}
        </div>

        {/* RIGHT: Suggested connections + jobs */}
        <aside className="hidden lg:flex flex-col gap-4">
          {/* People you may know */}
          {suggestedProfiles && suggestedProfiles.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">People you may know</p>
                <div className="space-y-3">
                  {suggestedProfiles.slice(0, 4).map(profile => (
                    <div key={profile.id} className="flex items-start gap-2.5">
                      <Link href={`/profiles/${profile.id}`}>
                        <Avatar className="w-9 h-9 border border-gray-200 flex-shrink-0 mt-0.5">
                          <AvatarImage src={profile.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                            {profile.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profiles/${profile.id}`} className="text-xs font-semibold text-gray-900 hover:underline block truncate">
                          {profile.name}
                        </Link>
                        <p className="text-[10px] text-gray-400 truncate mb-1.5">{profile.headline}</p>
                        <div className="flex items-center gap-1.5 w-full">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFeedMessage(profile.id)}
                            className="text-[10px] rounded-full px-2 py-0.5 h-6 flex-1 justify-center gap-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                          >
                            <MessageSquareIcon className="w-2.5 h-2.5" /> Message
                          </Button>
                          <Button
                            variant={isFeedConnected(profile.id) ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => feedToggleConnect(profile.id)}
                            className={`text-[10px] rounded-full px-2 py-0.5 h-6 flex-1 justify-center gap-1 ${
                              isFeedConnected(profile.id)
                                ? "bg-primary/10 text-primary border-primary/20 hover:bg-red-50 hover:text-red-500"
                                : "border-primary text-primary hover:bg-primary/5"
                            }`}
                          >
                            {isFeedConnected(profile.id)
                              ? <><UserCheckIcon className="w-2.5 h-2.5" /> Following</>
                              : profile.accountType === "company"
                                ? <><UserPlusIcon className="w-2.5 h-2.5" /> Follow</>
                                : <><UserPlusIcon className="w-2.5 h-2.5" /> Connect</>}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/profiles?tab=discover">
                  <button className="mt-3 text-xs text-gray-500 hover:text-gray-800 hover:underline w-full text-center flex items-center justify-center gap-1">
                    Show more <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Featured jobs */}
          {featuredJobs && featuredJobs.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">Jobs for you</p>
                <div className="space-y-3">
                  {featuredJobs.slice(0, 3).map((job: any) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="group cursor-pointer">
                        <p className="text-xs font-semibold text-gray-900 group-hover:text-primary transition-colors leading-tight">{job.title}</p>
                        <p className="text-[11px] text-gray-500">{job.company}</p>
                        {job.location && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                            <MapPinIcon className="w-3 h-3" />
                            {job.location}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
                <Link href="/jobs">
                  <button className="mt-3 text-xs text-gray-500 hover:text-gray-800 hover:underline w-full text-center flex items-center justify-center gap-1">
                    Show all jobs <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Footer links */}
          <div className="text-[11px] text-gray-400 leading-relaxed px-1">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <a href="#" className="hover:underline">About</a>
              <a href="#" className="hover:underline">Accessibility</a>
              <a href="#" className="hover:underline">Help Center</a>
              <a href="#" className="hover:underline">Privacy</a>
              <a href="#" className="hover:underline">Terms</a>
              <a href="#" className="hover:underline">Advertising</a>
            </div>
            <p className="mt-2">Hire Me Remotely &copy; 2026</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link } from "wouter";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAppAuth } from "@/contexts/app-auth";

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
}

function PostCard({ post, onLike }: { post: FeedPost; onLike: (id: number) => void }) {
  const [liked, setLiked] = useState(false);
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });

  function handleLike() {
    if (!liked) {
      setLiked(true);
      onLike(post.id);
    }
  }

  return (
    <Card className="rounded-xl overflow-hidden border border-gray-200 shadow-none bg-white">
      <CardContent className="p-4">
        {/* Author */}
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
          {post.profileAccountType === "company" && (
            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
              <BuildingIcon className="w-3 h-3 mr-1" />Company
            </Badge>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line mb-3">{post.content}</p>

        {/* YouTube / image preview */}
        {(() => {
          const ytId = extractYouTubeId(post.content);
          const hasYt = Boolean(ytId);
          const thumb = hasYt ? ytThumb(ytId!) : post.imageUrl;
          if (!thumb) return null;
          return (
            <div className="rounded-xl overflow-hidden mb-3 bg-black relative group cursor-pointer"
              onClick={() => hasYt && window.open(ytUrl(ytId!), "_blank")}>
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

        {/* Engagement counts */}
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-1">
          <span>{(post.likesCount + (liked ? 1 : 0)).toLocaleString()} likes</span>
          <span>{post.commentsCount} comments</span>
        </div>

        <Separator className="mb-2" />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              liked ? "text-primary bg-primary/5" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
          >
            <ThumbsUpIcon className="w-4 h-4" />
            Like
          </button>
          <button className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <MessageSquareIcon className="w-4 h-4" />
            Comment
          </button>
          <button className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <Share2Icon className="w-4 h-4" />
            Share
          </button>
          <button className="flex items-center gap-1.5 flex-1 justify-center py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <SendIcon className="w-4 h-4" />
            Send
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user } = useAppAuth();
  const [postContent, setPostContent] = useState("");
  const [postFocused, setPostFocused] = useState(false);
  const [ytId, setYtId] = useState<string | null>(null);

  useEffect(() => {
    setYtId(extractYouTubeId(postContent));
  }, [postContent]);

  const queryClient = useQueryClient();

  const currentId       = user?.id ?? 1;
  const currentName     = user?.name ?? "Guest";
  const currentHeadline = user?.headline ?? "";
  const currentAvatar   = user?.avatarUrl ?? undefined;
  const currentInitials = currentName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const { data: stats } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() } });
  const { data: suggestedProfiles } = useListFeaturedProfiles({ query: { queryKey: getListFeaturedProfilesQueryKey() } });
  const { data: featuredJobs } = useListFeaturedJobs({ query: { queryKey: getListFeaturedJobsQueryKey() } });

  const { data: posts = [], isLoading: postsLoading } = useQuery<FeedPost[]>({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts`);
      return res.json();
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`${import.meta.env.BASE_URL}api/posts/${id}/like`, { method: "POST" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

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
      setPostContent("");
      setPostFocused(false);
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

            {/* Avatar */}
            <div className="px-3 -mt-[34px] mb-1">
              <Link href={user ? `/profiles/${user.id}` : "/login"}>
                <Avatar className="w-[68px] h-[68px] border-[3px] border-white shadow-sm ring-1 ring-gray-100 hover:opacity-90 transition-opacity">
                  <AvatarImage src={currentAvatar} />
                  <AvatarFallback className="font-bold text-xl bg-primary/10 text-primary">{currentInitials}</AvatarFallback>
                </Avatar>
              </Link>
            </div>

            {/* Name / headline / location */}
            <div className="px-3 pb-3">
              <Link href={user ? `/profiles/${user.id}` : "/login"} className="block group">
                <p className="font-semibold text-sm text-gray-900 leading-snug group-hover:underline">{currentName}</p>
              </Link>
              <p className="text-xs text-gray-500 leading-snug mt-0.5 line-clamp-2">{currentHeadline}</p>
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
              <Link href={user ? `/profiles/${user.id}` : "/login"} className="text-xs font-semibold text-gray-600 hover:text-primary hover:underline flex items-center gap-0.5">
                View all analytics <ChevronRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>

            <Separator />

            {/* My items */}
            <div className="px-3 py-2.5">
              <Link href="/applications" className="flex items-center gap-2.5 group">
                <BookmarkIcon className="w-4 h-4 text-gray-500 group-hover:text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-gray-700 group-hover:text-primary group-hover:underline">My items</span>
              </Link>
            </div>
          </Card>

          {/* ── Platform stats card ── */}
          {stats && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="px-3 py-3 space-y-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Platform</p>
                {[
                  { icon: UsersIcon,     color: "bg-primary/10 text-primary",    value: stats.totalProfiles,           label: "Professionals" },
                  { icon: BriefcaseIcon, color: "bg-green-50 text-green-600",    value: stats.totalJobs,               label: "Active Jobs" },
                  { icon: TrendingUpIcon,color: "bg-orange-50 text-orange-500",  value: stats.remoteJobsPostedThisWeek, label: "New this week" },
                ].map(({ icon: Icon, color, value, label }) => (
                  <div key={label} className="flex items-center gap-2.5 py-1.5 hover:bg-gray-50 -mx-1 px-1 rounded-lg cursor-pointer transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 leading-tight">{value.toLocaleString()}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{label}</p>
                    </div>
                  </div>
                ))}
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
                {!postFocused ? (
                  <button
                    onClick={() => setPostFocused(true)}
                    className="flex-1 text-left text-sm text-gray-400 border border-gray-300 rounded-full px-4 py-2 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                  >
                    Share something with the network...
                  </button>
                ) : (
                  <div className="flex-1">
                    <Textarea
                      autoFocus
                      placeholder="What do you want to talk about?"
                      value={postContent}
                      onChange={e => setPostContent(e.target.value)}
                      className="border-0 focus-visible:ring-0 p-0 min-h-[80px] resize-none text-sm"
                    />
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
                    onClick={() => { setPostFocused(false); setPostContent(""); }}
                    className="rounded-full text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!postContent.trim() || createPostMutation.isPending}
                    onClick={() => createPostMutation.mutate({ content: postContent.trim(), imageUrl: ytId ? ytThumb(ytId) : undefined })}
                    className="rounded-full text-xs px-5"
                  >
                    Post
                  </Button>
                </div>
              )}

              {!postFocused && (
                <div className="flex items-center gap-1 mt-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                    <ImageIcon className="w-4 h-4 text-blue-500" />
                    Photo
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                    <BookmarkIcon className="w-4 h-4 text-orange-500" />
                    Article
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-100 transition-colors">
                    <BriefcaseIcon className="w-4 h-4 text-purple-500" />
                    Job
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
          ) : posts.length === 0 ? (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-8 text-center text-sm text-gray-400">No posts yet. Be the first to share something!</CardContent>
            </Card>
          ) : (
            posts.map(post => (
              <PostCard key={post.id} post={post} onLike={id => likeMutation.mutate(id)} />
            ))
          )}
        </div>

        {/* RIGHT: Suggested connections + jobs */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
          {/* People you may know */}
          {suggestedProfiles && suggestedProfiles.length > 0 && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">People you may know</p>
                <div className="space-y-3">
                  {suggestedProfiles.slice(0, 4).map(profile => (
                    <div key={profile.id} className="flex items-center gap-3">
                      <Link href={`/profiles/${profile.id}`}>
                        <Avatar className="w-10 h-10 border border-gray-200 flex-shrink-0">
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
                        <p className="text-[11px] text-gray-400 truncate">{profile.headline}</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-[11px] rounded-full px-2.5 py-1 h-7 border-primary text-primary hover:bg-primary/5 flex-shrink-0">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
                <Link href="/profiles">
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

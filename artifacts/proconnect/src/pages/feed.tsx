import { useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CURRENT_PROFILE_ID = 1;
const CURRENT_AVATAR = "https://i.pravatar.cc/150?u=1";
const CURRENT_NAME = "Alex Chen";
const CURRENT_HEADLINE = "Full-Stack Engineer | React & Node.js";

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

        {post.imageUrl && (
          <div className="rounded-lg overflow-hidden mb-3 bg-gray-100">
            <img src={post.imageUrl} alt="" className="w-full object-cover max-h-80" />
          </div>
        )}

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
  const [postContent, setPostContent] = useState("");
  const [postFocused, setPostFocused] = useState(false);
  const queryClient = useQueryClient();

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
    mutationFn: async (content: string) => {
      const res = await fetch(`${import.meta.env.BASE_URL}api/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: CURRENT_PROFILE_ID, content }),
      });
      return res.json();
    },
    onSuccess: () => {
      setPostContent("");
      setPostFocused(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 w-full pb-24 md:pb-6">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] gap-4 items-start">

        {/* LEFT: Profile summary card */}
        <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
          <Card className="rounded-xl overflow-hidden border border-gray-200 shadow-none bg-white">
            {/* Cover */}
            <div className="h-14 bg-gradient-to-br from-primary/60 to-primary/30" />
            <CardContent className="px-4 pb-4">
              <div className="-mt-8 mb-2">
                <Avatar className="w-16 h-16 border-4 border-white shadow">
                  <AvatarImage src={CURRENT_AVATAR} />
                  <AvatarFallback className="font-bold text-lg bg-primary/10 text-primary">AC</AvatarFallback>
                </Avatar>
              </div>
              <p className="font-bold text-sm text-gray-900 leading-tight">{CURRENT_NAME}</p>
              <p className="text-xs text-gray-500 leading-snug mt-0.5 mb-3">{CURRENT_HEADLINE}</p>

              <Separator className="mb-3" />

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Profile views</span>
                  <span className="font-semibold text-primary">241</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Post impressions</span>
                  <span className="font-semibold text-primary">1,847</span>
                </div>
              </div>

              <Separator className="my-3" />

              <Link href="/profile/edit">
                <Button variant="outline" size="sm" className="w-full text-xs rounded-full border-primary text-primary hover:bg-primary/5">
                  Edit profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Stats card */}
          {stats && (
            <Card className="rounded-xl border border-gray-200 shadow-none bg-white">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Platform Stats</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UsersIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{stats.totalProfiles.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Professionals</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{stats.totalJobs.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Active Jobs</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <TrendingUpIcon className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{stats.remoteJobsPostedThisWeek.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">New this week</p>
                  </div>
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
                  <AvatarImage src={CURRENT_AVATAR} />
                  <AvatarFallback className="text-xs font-semibold">AC</AvatarFallback>
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
                    onClick={() => createPostMutation.mutate(postContent.trim())}
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

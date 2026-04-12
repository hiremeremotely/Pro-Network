import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useAppAuth } from "@/contexts/app-auth";
import { useBookmarks } from "@/hooks/use-bookmarks";
import {
  BookmarkIcon,
  BriefcaseIcon,
  MapPinIcon,
  DollarSignIcon,
  FileTextIcon,
  ClockIcon,
  Trash2Icon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

const LEVEL_COLORS: Record<string, string> = {
  Senior: "bg-purple-50 text-purple-700",
  Staff: "bg-indigo-50 text-indigo-700",
  "Mid-level": "bg-blue-50 text-blue-700",
  Entry: "bg-green-50 text-green-700",
  Manager: "bg-orange-50 text-orange-700",
};

interface SavedJob {
  id: number;
  title: string;
  company: string;
  location?: string | null;
  experienceLevel: string;
  category: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  featured: boolean;
  createdAt: string;
}

interface SavedPost {
  id: number;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  profileId: number;
  profileName: string;
  profileHeadline: string;
  profileAvatarUrl?: string | null;
}

export default function MyItems() {
  const { user } = useAppAuth();
  const [tab, setTab] = useState<"jobs" | "posts">("jobs");
  const { toggleBookmark } = useBookmarks();

  const { data, isLoading, error, refetch } = useQuery<{ jobs: SavedJob[]; posts: SavedPost[] }>({
    queryKey: ["bookmarks", user?.id],
    queryFn: () => fetch(`${BASE}api/bookmarks?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 10_000,
  });

  const jobs = data?.jobs ?? [];
  const posts = data?.posts ?? [];

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <BookmarkIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 mb-4">Sign in to view your saved items</p>
        <Link href="/login"><Button>Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <BookmarkIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">My Items</h1>
        </div>
        <p className="text-muted-foreground">Your saved jobs and posts, all in one place.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setTab("jobs")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            tab === "jobs"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <BriefcaseIcon className="w-4 h-4" />
            Saved Jobs
            {jobs.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full px-2 py-0.5">{jobs.length}</span>
            )}
          </span>
        </button>
        <button
          onClick={() => setTab("posts")}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            tab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <FileTextIcon className="w-4 h-4" />
            Saved Posts
            {posts.length > 0 && (
              <span className="ml-1 bg-primary/10 text-primary text-[11px] font-bold rounded-full px-2 py-0.5">{posts.length}</span>
            )}
          </span>
        </button>
      </div>

      {isLoading && <LoadingState message="Loading saved items…" />}
      {error && <ErrorState message="Failed to load saved items" onRetry={refetch} />}

      {/* Jobs tab */}
      {!isLoading && !error && tab === "jobs" && (
        <div className="flex flex-col gap-3">
          {jobs.length === 0 ? (
            <div className="text-center py-20">
              <BriefcaseIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-1">No saved jobs yet</p>
              <p className="text-gray-400 text-sm mb-4">Bookmark jobs on the jobs page to save them here.</p>
              <Link href="/jobs"><Button variant="outline">Browse Jobs</Button></Link>
            </div>
          ) : (
            jobs.map(job => {
              const salary = job.salaryMin && job.salaryMax
                ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
                : null;
              return (
                <Card key={job.id} className="rounded-xl border border-gray-200 shadow-none bg-white hover:border-primary/30 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BriefcaseIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link href={`/jobs/${job.id}`}>
                              <p className="font-semibold text-sm text-gray-900 hover:text-primary hover:underline transition-colors">{job.title}</p>
                            </Link>
                            <p className="text-xs text-gray-500 mt-0.5">{job.company}</p>
                          </div>
                          <button
                            onClick={() => { toggleBookmark("job", job.id); refetch(); }}
                            title="Remove bookmark"
                            className="w-8 h-8 flex items-center justify-center rounded-full text-primary bg-primary/10 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                          >
                            <BookmarkIcon className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {job.location && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPinIcon className="w-3.5 h-3.5" />{job.location}
                            </span>
                          )}
                          {salary && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <DollarSignIcon className="w-3.5 h-3.5" />{salary}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <ClockIcon className="w-3.5 h-3.5" />
                            {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                          </span>
                          <Badge className={`text-[10px] font-semibold px-2 rounded-full border-0 ${LEVEL_COLORS[job.experienceLevel] || "bg-gray-100 text-gray-500"}`}>
                            {job.experienceLevel}
                          </Badge>
                          {job.featured && (
                            <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded">Featured</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Link href={`/jobs/${job.id}`}>
                        <Button size="sm" className="rounded-full px-5 text-xs h-8">Apply now</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Posts tab */}
      {!isLoading && !error && tab === "posts" && (
        <div className="flex flex-col gap-3">
          {posts.length === 0 ? (
            <div className="text-center py-20">
              <FileTextIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium mb-1">No saved posts yet</p>
              <p className="text-gray-400 text-sm mb-4">Click the bookmark icon on any post in your feed to save it here.</p>
              <Link href="/feed"><Button variant="outline">Go to Feed</Button></Link>
            </div>
          ) : (
            posts.map(post => (
              <Card key={post.id} className="rounded-xl border border-gray-200 shadow-none bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <Link href={`/profiles/${post.profileId}`}>
                      <Avatar className="w-10 h-10 border border-gray-200 flex-shrink-0">
                        <AvatarImage src={post.profileAvatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {post.profileName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/profiles/${post.profileId}`} className="font-semibold text-sm text-gray-900 hover:underline">
                        {post.profileName}
                      </Link>
                      <p className="text-xs text-gray-500 line-clamp-1">{post.profileHeadline}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <button
                      onClick={() => { toggleBookmark("post", post.id); refetch(); }}
                      title="Remove bookmark"
                      className="w-8 h-8 flex items-center justify-center rounded-full text-primary bg-primary/10 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <BookmarkIcon className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 leading-relaxed line-clamp-4 whitespace-pre-line">
                    {post.content}
                  </p>
                  {post.imageUrl && (
                    <div className="mt-3 rounded-xl overflow-hidden border border-gray-100">
                      <img src={post.imageUrl} alt="" className="w-full object-cover max-h-48" />
                    </div>
                  )}
                  <div className="mt-3 flex justify-end">
                    <Link href="/feed">
                      <Button variant="outline" size="sm" className="rounded-full px-4 text-xs h-8">View in feed</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

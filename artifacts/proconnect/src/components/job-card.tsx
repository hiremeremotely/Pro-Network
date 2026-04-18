import { Link } from "wouter";
import { MapPinIcon, BriefcaseIcon, DollarSignIcon, ClockIcon, ChevronRightIcon, BookmarkIcon, SendHorizontalIcon, Share2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Job } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL;

interface JobCardProps {
  job: Job;
  featured?: boolean;
  isBookmarked?: boolean;
  onBookmark?: (e: React.MouseEvent) => void;
  onSend?: (e: React.MouseEvent) => void;
}

export function JobCard({ job, featured, isBookmarked, onBookmark, onSend }: JobCardProps) {
  const { toast } = useToast();
  const timeAgo = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });

  const formatSalary = (min?: number | null, max?: number | null, currency: string = "USD") => {
    if (!min && !max) return "Salary unlisted";
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 });
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `${formatter.format(min)}+`;
    if (max) return `Up to ${formatter.format(max)}`;
    return "Salary unlisted";
  };

  async function handleShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}${BASE}jobs/${job.id}`;
    const shareData = {
      title: `${job.title} at ${job.company}`,
      text: `Check out this remote job: ${job.title} at ${job.company}${job.location ? ` · ${job.location}` : ""}`,
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link copied", description: "Job link copied to clipboard.", duration: 2000 });
      } catch {
        toast({ title: "Could not copy link", variant: "destructive", duration: 2000 });
      }
    }
  }

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className={`h-full flex flex-col hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer group relative ${featured ? 'border-primary/30 shadow-sm' : ''}`} data-testid={`job-card-${job.id}`}>
        {onBookmark && (
          <button
            onClick={onBookmark}
            title={isBookmarked ? "Remove bookmark" : "Save job"}
            className={`absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full transition-colors shadow-sm ${
              isBookmarked
                ? "text-primary bg-primary/10 hover:bg-red-50 hover:text-red-500"
                : "text-gray-400 bg-white border border-gray-200 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <BookmarkIcon className={`w-4 h-4 ${isBookmarked ? "fill-current" : ""}`} />
          </button>
        )}
        <CardHeader className="pb-3 flex flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-lg border bg-card flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt={`${job.company} logo`} className="w-full h-full object-cover" />
            ) : (
              <BriefcaseIcon className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
          <div className={`flex-1 space-y-1 ${onBookmark ? "pr-8" : ""}`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
              </div>
              {featured && (
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">Featured</Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 pb-4 space-y-4">
          <div className="flex flex-wrap gap-y-2 gap-x-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-4 h-4 text-primary/70" />
              <span>{job.location || "Remote"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4 text-primary/70" />
              <span className="capitalize">{job.experienceLevel.replace('_', ' ')}</span>
            </div>
            {(job.salaryMin || job.salaryMax) && (
              <div className="flex items-center gap-1.5">
                <DollarSignIcon className="w-4 h-4 text-primary/70" />
                <span>{formatSalary(job.salaryMin, job.salaryMax, job.currency || "USD")}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {job.tags?.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="bg-muted/50 text-xs font-normal">{tag}</Badge>
            ))}
            {(job.tags?.length || 0) > 4 && (
              <Badge variant="outline" className="bg-muted/50 text-xs font-normal">+{(job.tags?.length || 0) - 4}</Badge>
            )}
          </div>
        </CardContent>

        <CardFooter className="pt-0 flex justify-between items-center border-t mt-auto pt-4 border-border/50 text-sm">
          <span className="text-muted-foreground">{timeAgo}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleShare}
              title="Share job"
              className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Share2Icon className="w-3.5 h-3.5" />
            </button>
            {onSend && (
              <button
                onClick={onSend}
                title="Send to a connection"
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                <SendHorizontalIcon className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
              View Job <ChevronRightIcon className="w-4 h-4" />
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

import { Link } from "wouter";
import { MapPinIcon, BriefcaseIcon, DollarSignIcon, ClockIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Job } from "@workspace/api-client-react";
import { formatDistanceToNow } from "date-fns";

interface JobCardProps {
  job: Job;
  featured?: boolean;
}

export function JobCard({ job, featured }: JobCardProps) {
  const timeAgo = formatDistanceToNow(new Date(job.createdAt), { addSuffix: true });
  
  const formatSalary = (min?: number | null, max?: number | null, currency: string = "USD") => {
    if (!min && !max) return "Salary unlisted";
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    });
    
    if (min && max) return `${formatter.format(min)} - ${formatter.format(max)}`;
    if (min) return `${formatter.format(min)}+`;
    if (max) return `Up to ${formatter.format(max)}`;
    return "Salary unlisted";
  };

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card className={`h-full flex flex-col hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer group ${featured ? 'border-primary/30 shadow-sm' : ''}`} data-testid={`job-card-${job.id}`}>
        <CardHeader className="pb-3 flex flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-lg border bg-card flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {job.companyLogoUrl ? (
              <img src={job.companyLogoUrl} alt={`${job.company} logo`} className="w-full h-full object-cover" />
            ) : (
              <BriefcaseIcon className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                <p className="text-sm font-medium text-muted-foreground">{job.company}</p>
              </div>
              {featured && (
                <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                  Featured
                </Badge>
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
              <Badge key={tag} variant="outline" className="bg-muted/50 text-xs font-normal">
                {tag}
              </Badge>
            ))}
            {(job.tags?.length || 0) > 4 && (
              <Badge variant="outline" className="bg-muted/50 text-xs font-normal">
                +{(job.tags?.length || 0) - 4}
              </Badge>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 flex justify-between items-center border-t mt-auto pt-4 border-border/50 text-sm">
          <span className="text-muted-foreground">{timeAgo}</span>
          <span className="text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
            View Job <ChevronRightIcon className="w-4 h-4" />
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
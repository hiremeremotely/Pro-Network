import { Link } from "wouter";
import { useListProfileApplications, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BriefcaseIcon, CalendarIcon, BuildingIcon, ArrowRightIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CURRENT_PROFILE_ID = 1;

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  reviewing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  rejected: "bg-red-500/10 text-red-700 border-red-500/20",
  accepted: "bg-green-500/10 text-green-700 border-green-500/20",
};

export default function Applications() {
  const { data: applications, isLoading, error, refetch } = useListProfileApplications(CURRENT_PROFILE_ID, {
    query: { queryKey: getListProfileApplicationsQueryKey(CURRENT_PROFILE_ID) }
  });

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <BriefcaseIcon className="w-7 h-7 text-primary" />
          <h1 className="text-3xl font-bold">My Applications</h1>
        </div>
        <p className="text-muted-foreground">Track the status of your job applications.</p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading applications..." />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !applications?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm text-center max-w-sm">Start browsing remote jobs and apply to opportunities that match your skills.</p>
          <Link href="/jobs">
            <Button className="gap-2">
              Browse Jobs <ArrowRightIcon className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id} className="hover:border-primary/40 transition-colors" data-testid={`application-item-${app.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg border bg-muted flex items-center justify-center shrink-0">
                      <BriefcaseIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <Link href={`/jobs/${app.jobId}`} className="hover:underline">
                        <h3 className="font-semibold text-lg leading-tight hover:text-primary transition-colors" data-testid={`text-application-title-${app.id}`}>
                          {app.job?.title}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                        <BuildingIcon className="w-3.5 h-3.5" />
                        <span>{app.job?.company}</span>
                        {app.job?.location && <><span>·</span><span>{app.job.location}</span></>}
                      </div>
                    </div>
                  </div>
                  <Badge className={`shrink-0 capitalize ${STATUS_STYLES[app.status] || "bg-muted text-muted-foreground"}`} data-testid={`badge-status-${app.id}`}>
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {app.coverLetter && (
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground font-medium mb-1">Cover Letter</p>
                    <p className="text-sm line-clamp-3">{app.coverLetter}</p>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="w-3.5 h-3.5" />
                  <span>Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

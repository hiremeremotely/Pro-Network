import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetJob, getGetJobQueryKey, useApplyToJob, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  MapPinIcon, DollarSignIcon, ClockIcon, UsersIcon, ArrowLeftIcon,
  BriefcaseIcon, CalendarIcon, SendIcon, BuildingIcon
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CURRENT_PROFILE_ID = 1;

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const { data: job, isLoading, error, refetch } = useGetJob(id, {
    query: { enabled: !!id, queryKey: getGetJobQueryKey(id) }
  });

  const applyMutation = useApplyToJob();

  function handleApply() {
    applyMutation.mutate(
      { jobId: id, data: { profileId: CURRENT_PROFILE_ID, coverLetter: coverLetter || null } },
      {
        onSuccess: () => {
          toast({ title: "Application submitted!", description: "Your application has been sent successfully." });
          setApplyOpen(false);
          setCoverLetter("");
          queryClient.invalidateQueries({ queryKey: getListProfileApplicationsQueryKey(CURRENT_PROFILE_ID) });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to submit application. Please try again.", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) return <LoadingState message="Loading job..." />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!job) return null;

  const formatSalary = (min?: number | null, max?: number | null, currency: string = "USD") => {
    if (!min && !max) return "Salary unlisted";
    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 });
    if (min && max) return `${fmt.format(min)} – ${fmt.format(max)} / year`;
    if (min) return `${fmt.format(min)}+ / year`;
    if (max) return `Up to ${fmt.format(max)} / year`;
    return "Salary unlisted";
  };

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <Link href="/jobs">
        <Button variant="ghost" size="sm" className="gap-2 mb-6">
          <ArrowLeftIcon className="w-4 h-4" /> Back to Jobs
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-xl border bg-muted flex items-center justify-center shrink-0 shadow-sm">
              {job.companyLogoUrl
                ? <img src={job.companyLogoUrl} alt={`${job.company} logo`} className="w-full h-full object-cover rounded-xl" />
                : <BriefcaseIcon className="w-8 h-8 text-muted-foreground/50" />
              }
            </div>
            <div>
              <h1 className="text-2xl font-bold mb-1" data-testid="text-job-title">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                <span className="font-medium text-foreground flex items-center gap-1">
                  <BuildingIcon className="w-4 h-4" /> {job.company}
                </span>
                {job.location && <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {job.location}</span>}
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="secondary" className="capitalize">{job.experienceLevel}</Badge>
                <Badge variant="outline">{job.category}</Badge>
                {job.featured && <Badge className="bg-primary/10 text-primary border-primary/20">Featured</Badge>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Meta */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1"><DollarSignIcon className="w-3.5 h-3.5" /> Salary</span>
              <span className="font-medium">{formatSalary(job.salaryMin, job.salaryMax, job.currency || "USD")}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1"><ClockIcon className="w-3.5 h-3.5" /> Level</span>
              <span className="font-medium capitalize">{job.experienceLevel}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1"><UsersIcon className="w-3.5 h-3.5" /> Applicants</span>
              <span className="font-medium">{job.applicationCount} applied</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> Posted</span>
              <span className="font-medium">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <h2 className="text-lg font-semibold mb-4">About this role</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-line leading-relaxed">
              {job.description}
            </div>
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Skills & Technologies</h2>
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-sm">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle className="text-base">Apply for this role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is a fully remote position. Applications are reviewed by the team at {job.company}.
              </p>
              <Button
                className="w-full gap-2"
                onClick={() => setApplyOpen(true)}
                data-testid="button-apply-job"
              >
                <SendIcon className="w-4 h-4" /> Apply Now
              </Button>
              <Link href="/jobs">
                <Button variant="outline" className="w-full mt-2">Browse More Jobs</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Apply to {job.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Applying as <span className="font-medium text-foreground">Alex Chen</span> (Profile #1)</p>
            <div>
              <label className="text-sm font-medium mb-2 block">Cover Letter (optional)</label>
              <Textarea
                placeholder="Share why you're a great fit for this role..."
                rows={6}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                data-testid="textarea-cover-letter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applyMutation.isPending} data-testid="button-submit-application">
              {applyMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

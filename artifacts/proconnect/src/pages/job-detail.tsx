import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetJob, getGetJobQueryKey, useApplyToJob, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAppAuth } from "@/contexts/app-auth";
import { useStartChat } from "@/hooks/use-start-chat";
import {
  MapPinIcon, DollarSignIcon, ClockIcon, UsersIcon, ArrowLeftIcon,
  BriefcaseIcon, CalendarIcon, SendIcon, BuildingIcon, Share2Icon,
  SendHorizontalIcon, SearchIcon, XIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Job } from "@workspace/api-client-react";

const BASE = import.meta.env.BASE_URL;

// ── Send-to-connection modal for job detail ────────────────────────────────────
function JobDetailSendModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState<number | null>(null);
  const startChat = useStartChat();
  const { user } = useAppAuth();
  const { toast } = useToast();

  const { data } = useQuery({
    queryKey: ["send-connections", user?.id],
    queryFn: () =>
      fetch(`${BASE}api/connections/network`, { credentials: "include" }).then(r => r.json()),
    enabled: !!user?.id,
  });
  const allConnections: any[] = data?.profiles ?? [];

  const profiles = search.trim()
    ? allConnections.filter((p: any) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.headline ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : allConnections;

  async function handleSend(profileId: number, recipientName: string) {
    setSending(profileId);
    const convId = await startChat(profileId);
    if (convId && user?.id) {
      const payload = JSON.stringify({
        __type: "shared_job",
        jobId: job.id,
        title: job.title,
        company: job.company,
        companyLogo: job.companyLogoUrl ?? null,
        location: job.location ?? null,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        currency: job.currency ?? "USD",
        experienceLevel: job.experienceLevel,
      });
      await fetch(`${BASE}api/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: payload }),
      });
    }
    onClose();
    toast({ title: "Job shared", description: `Sent to ${recipientName}.`, duration: 3000 });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm">Send job to a connection</h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">{job.title} · {job.company}</p>
          </div>
          <button onClick={onClose} className="ml-3 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search connections…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full pl-8 pr-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-64 px-2 pb-3 mt-1">
          {profiles.length === 0 && (
            <p className="text-center text-xs text-gray-400 py-8">
              {allConnections.length === 0 ? "No connections yet" : "No matches found"}
            </p>
          )}
          {profiles.map((p: any) => {
            const initials = p.name?.slice(0, 2).toUpperCase() ?? "??";
            return (
              <button
                key={p.id}
                onClick={() => handleSend(p.id, p.name)}
                disabled={sending === p.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left disabled:opacity-60"
              >
                <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                  <AvatarImage src={p.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  {p.headline && <p className="text-xs text-gray-400 truncate">{p.headline}</p>}
                </div>
                {sending === p.id
                  ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  : <SendHorizontalIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                }
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppAuth();
  const [applyOpen, setApplyOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");

  const { data: job, isLoading, error, refetch } = useGetJob(id, {
    query: { enabled: !!id, queryKey: getGetJobQueryKey(id) }
  });

  const applyMutation = useApplyToJob();

  async function handleShare() {
    if (!job) return;
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

  const currentProfileId = user?.id ?? 0;

  function handleApply() {
    if (!currentProfileId) return;
    applyMutation.mutate(
      { jobId: id, data: { coverLetter: coverLetter || null } },
      {
        onSuccess: () => {
          toast({ title: "Application submitted!", description: "Your application has been sent successfully." });
          setApplyOpen(false);
          setCoverLetter("");
          queryClient.invalidateQueries({ queryKey: getListProfileApplicationsQueryKey(currentProfileId) });
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
              {!user ? (
                <Link href="/login">
                  <Button className="w-full gap-2" data-testid="button-apply-job">
                    <SendIcon className="w-4 h-4" /> Sign in to Apply
                  </Button>
                </Link>
              ) : user.accountType === "individual" ? (
                <Button
                  className="w-full gap-2"
                  onClick={() => setApplyOpen(true)}
                  data-testid="button-apply-job"
                >
                  <SendIcon className="w-4 h-4" /> Apply Now
                </Button>
              ) : null}
              {user && (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setSendOpen(true)}
                >
                  <SendHorizontalIcon className="w-4 h-4" /> Send in Chat
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleShare}
              >
                <Share2Icon className="w-4 h-4" />
                {typeof navigator !== "undefined" && navigator.share ? "Share Job" : "Copy Link"}
              </Button>
              <Link href="/jobs">
                <Button variant="outline" className="w-full">Browse More Jobs</Button>
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
            <p className="text-sm text-muted-foreground">Applying as <span className="font-medium text-foreground">{user?.name ?? "you"}</span></p>
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

      {sendOpen && <JobDetailSendModal job={job} onClose={() => setSendOpen(false)} />}
    </div>
  );
}

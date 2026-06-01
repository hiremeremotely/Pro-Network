import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { formatDistanceToNow } from "date-fns";
import { ClockIcon, CheckCircle2Icon, XCircleIcon, UserPlusIcon, BriefcaseIcon } from "lucide-react";

type InterestRow = {
  id: number;
  status: "pending" | "approved" | "declined";
  companyNote: string | null;
  adminNote: string | null;
  jobId: number | null;
  jobTitle: string | null;
  createdAt: string;
  respondedAt: string | null;
  candidateId: number;
  candidateName: string;
  candidateHeadline: string;
  candidateAvatarUrl: string | null;
};

const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  pending:  { label: "In review",       cls: "bg-amber-50 text-amber-700 border-amber-200",      Icon: ClockIcon },
  approved: { label: "Connected",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2Icon },
  declined: { label: "Not available",   cls: "bg-gray-100 text-gray-600 border-gray-200",         Icon: XCircleIcon },
};

export default function CompanyInterests() {
  const { user } = useAppAuth();
  const BASE = import.meta.env.BASE_URL;

  const { data, isLoading, error, refetch } = useQuery<InterestRow[]>({
    queryKey: ["interest-requests-by-company", user?.id],
    queryFn: () => fetch(`${BASE}api/interest-requests/by-company?companyProfileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id && user?.accountType === "company",
  });

  if (user?.accountType !== "company") {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-sm text-gray-500">This page is for company accounts.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingState message="Loading your interest requests..." />;
  if (error) return <ErrorState error={error as Error} retry={refetch} />;

  const rows = data ?? [];
  const pending  = rows.filter(r => r.status === "pending");
  const approved = rows.filter(r => r.status === "approved");
  const declined = rows.filter(r => r.status === "declined");

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      <header className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Candidate Shortlist</h1>
        <p className="text-sm text-gray-500 mt-1">
          Candidates you've expressed interest in. We'll take care of making the connection.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold">{pending.length} in review</Badge>
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">{approved.length} connected</Badge>
          <Badge className="bg-gray-100 text-gray-600 border-gray-200 font-semibold">{declined.length} not available</Badge>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 px-6 py-16 text-center">
          <UserPlusIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">No interest requests yet</p>
          <p className="text-xs text-gray-400 mt-1">Browse <Link href="/profiles" className="text-primary hover:underline">Talent</Link> and click "Express Interest" on a candidate's profile.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = STATUS_META[r.status];
            const initials = r.candidateName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12 border border-gray-100 flex-shrink-0">
                    <AvatarImage src={r.candidateAvatarUrl ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <Link href={`/profiles/${r.candidateId}`}>
                          <p className="text-sm font-bold text-gray-900 hover:text-primary cursor-pointer truncate">{r.candidateName}</p>
                        </Link>
                        <p className="text-xs text-gray-500 truncate">{r.candidateHeadline}</p>
                      </div>
                      <Badge className={`${meta.cls} text-[10px] font-semibold gap-1 border`}>
                        <meta.Icon className="w-3 h-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    {r.jobTitle && (
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3" /> For role: {r.jobTitle}
                      </p>
                    )}
                    {r.companyNote && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 italic">
                        "{r.companyNote}"
                      </p>
                    )}
                    {r.status === "declined" && r.adminNote && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 italic">"{r.adminNote}"</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-2">
                      Sent {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}
                      {r.respondedAt && ` · responded ${formatDistanceToNow(new Date(r.respondedAt), { addSuffix: true })}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

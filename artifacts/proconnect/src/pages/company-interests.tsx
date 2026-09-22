import { useListCompanyInterestRequests, getListCompanyInterestRequestsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { formatDistanceToNow } from "date-fns";
import { ClockIcon, CheckCircle2Icon, XCircleIcon, UserPlusIcon, BriefcaseIcon, ShieldCheckIcon } from "lucide-react";

type InterestRow = {
  id: number;
  status?: string;
  companyNote: string | null;
  jobId?: number | null;
  createdAt?: string;
  respondedAt?: string | null;
  roleTitle?: string | null;
  conversationId?: number | null;
  candidate?: { id?: number; name?: string; headline?: string; avatarUrl?: string | null; label?: string };
};

const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  pending:  { label: "HMR review",       cls: "bg-amber-50 text-amber-700 border-amber-200",      Icon: ClockIcon },
  pending_hmr: { label: "HMR review", cls: "bg-amber-50 text-amber-700 border-amber-200", Icon: ClockIcon },
  pending_candidate: { label: "Pending professional", cls: "bg-indigo-50 text-indigo-700 border-indigo-200", Icon: ClockIcon },
  approved: { label: "Connected",       cls: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2Icon },
  declined: { label: "Not available",   cls: "bg-gray-100 text-gray-600 border-gray-200", Icon: XCircleIcon },
  declined_hmr: { label: "Declined by HMR", cls: "bg-gray-100 text-gray-600 border-gray-200", Icon: XCircleIcon },
  declined_candidate: { label: "Declined by professional", cls: "bg-gray-100 text-gray-600 border-gray-200", Icon: XCircleIcon },
};

export default function CompanyInterests() {
  const { user } = useAppAuth();
  const { data: response, isLoading, error, refetch } = useListCompanyInterestRequests({ query: { queryKey: getListCompanyInterestRequestsQueryKey(), enabled: user?.accountType === "company" } });

  if (user?.accountType !== "company") {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 text-center">
        <p className="text-sm text-gray-500">This page is for company accounts.</p>
      </div>
    );
  }

  if (isLoading) return <LoadingState message="Loading your interest requests..." />;
  if (error) return <ErrorState error={error as Error} retry={refetch} />;

  // The generated client types the endpoint as `{ requests?: [...] }`. Keep a
  // defensive read for older deployments that briefly returned `{ data: ... }`
  // so a valid 200 response can never collapse into the empty state.
  const payload = response as unknown as { requests?: InterestRow[]; data?: { requests?: InterestRow[] } } | InterestRow[] | undefined;
  const rows = (Array.isArray(payload) ? payload : payload?.requests ?? payload?.data?.requests ?? []) as InterestRow[];
  const pending  = rows.filter(r => ["pending", "pending_hmr", "pending_candidate"].includes(r.status ?? ""));
  const approved = rows.filter(r => r.status === "approved");
  const declined = rows.filter(r => ["declined", "declined_hmr", "declined_candidate"].includes(r.status ?? ""));

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 space-y-4">
      <header className="bg-white rounded-2xl border border-gray-200 px-6 py-5">
        <h1 className="text-xl font-bold text-gray-900">Candidate Shortlist</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your outreach, tracked in one place. Candidates will appear here once contacted.
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
            const meta = STATUS_META[r.status ?? "declined"] ?? STATUS_META.declined;
            const isApproved = r.status === "approved";
            const displayName = isApproved ? (r.candidate?.name ?? r.candidate?.label ?? "Connected professional") : "Available professional";
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full border border-indigo-100 bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600"><ShieldCheckIcon className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        {isApproved ? <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p> : <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>}
                        <p className="text-xs text-gray-500 truncate">{isApproved ? (r.candidate?.headline ?? "Connected professional") : "Identity released only after professional approval"}</p>
                      </div>
                      <Badge className={`${meta.cls} text-[10px] font-semibold gap-1 border`}>
                        <meta.Icon className="w-3 h-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    {r.roleTitle && (
                      <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                        <BriefcaseIcon className="w-3 h-3" /> For role: {r.roleTitle}
                      </p>
                    )}
                    {r.companyNote && (
                      <p className="text-xs text-gray-600 mt-2 p-2 bg-gray-50 rounded-lg border border-gray-100 italic">
                        "{r.companyNote}"
                      </p>
                    )}
                    {isApproved && r.conversationId && <Link href={`/messaging?conv=${r.conversationId}`} className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white">Open chat</Link>}
                    <p className="text-[10px] text-gray-400 mt-2">
                      {r.createdAt ? `Sent ${formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}` : ""}
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

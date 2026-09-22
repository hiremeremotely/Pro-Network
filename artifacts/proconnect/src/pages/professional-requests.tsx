import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getListCandidateInterestRequestsQueryKey, useApproveInterestRequest, useDeclineInterestRequest, useListCandidateInterestRequests } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightIcon, BriefcaseIcon, CheckCircle2Icon, Clock3Icon, ShieldCheckIcon, XCircleIcon } from "lucide-react";

const scopeOptions = [["identity", "Identity"], ["contact", "Contact details"], ["currentEmployer", "Current employer"], ["socialLinks", "Social links"], ["portfolio", "Portfolio"], ["experience", "Experience"], ["education", "Education"], ["skills", "Skills"]] as const;
const statusLabel: Record<string, string> = { pending_candidate: "Awaiting your review", approved: "Connected", declined_candidate: "Declined — identity stayed private", declined_hmr: "Declined by HMR" };

export default function ProfessionalRequests() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const requests = useListCandidateInterestRequests({ query: { queryKey: getListCandidateInterestRequestsQueryKey() } });
  const approve = useApproveInterestRequest();
  const decline = useDeclineInterestRequest();
  const [scope, setScope] = useState<string[]>(["identity", "portfolio", "skills"]);

  function approveRequest(id: number) {
    approve.mutate({ id, data: { releaseScope: scope } }, { onSuccess: result => { qc.invalidateQueries({ queryKey: getListCandidateInterestRequestsQueryKey() }); toast({ title: "Introduction approved", description: "Your selected professional details are now available." }); if (result.conversationId) navigate(`/messaging?conv=${result.conversationId}`); }, onError: () => toast({ title: "Could not approve request", variant: "destructive" }) });
  }
  function declineRequest(id: number) {
    decline.mutate({ id }, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListCandidateInterestRequestsQueryKey() }); toast({ title: "Request declined", description: "Your identity stayed hidden from this company." }); }, onError: () => toast({ title: "Could not decline request", variant: "destructive" }) });
  }

  if (requests.isLoading) return <LoadingState message="Loading professional introductions…" />;
  if (requests.isError) return <ErrorState error={requests.error as Error} retry={() => requests.refetch()} />;
  const rows = requests.data?.requests ?? [];
  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 pb-24">
    <header><p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Professional Hub</p><h1 className="mt-1 text-3xl font-bold text-gray-900">Introduction requests</h1><p className="mt-2 max-w-2xl text-sm text-gray-600">HMR reviews every company request first. Your name and direct profile remain private until you approve the release scope.</p></header>
    <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900"><ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0" /><p><strong>Privacy checkpoint.</strong> Approving creates a conversation and releases only the fields you select.</p></div>
    {!rows.length ? <Card><CardContent className="py-16 text-center"><CheckCircle2Icon className="mx-auto h-10 w-10 text-emerald-500" /><h2 className="mt-3 font-semibold">No introductions waiting</h2><p className="mt-1 text-sm text-gray-500">New HMR-reviewed requests will appear here.</p></CardContent></Card> : <div className="space-y-4">{rows.map((row: any) => <Card key={row.id} className="overflow-hidden"><CardContent className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><Badge className="gap-1 border-amber-200 bg-amber-50 text-amber-700"><Clock3Icon className="h-3 w-3" /> {statusLabel[row.status] ?? row.status}</Badge><h2 className="mt-3 text-lg font-bold text-gray-900">A company is interested in your work</h2><p className="text-sm text-gray-600">{row.roleTitle || "A professional opportunity"} · mediated by HMR</p></div><BriefcaseIcon className="h-5 w-5 text-gray-300" /></div>
      {row.companyNote && <blockquote className="border-l-2 border-primary/30 bg-gray-50 px-3 py-2 text-sm italic text-gray-600">“{row.companyNote}”</blockquote>}
      <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">Release scope</p><div className="grid gap-2 sm:grid-cols-2">{scopeOptions.map(([key, label]) => <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 p-2 text-sm hover:bg-gray-50"><Checkbox checked={scope.includes(key)} onCheckedChange={checked => setScope(s => checked ? [...new Set([...s, key])] : s.filter(x => x !== key))} />{label}</label>)}</div></div>
      <div className="flex flex-wrap gap-2 border-t pt-3"><Button onClick={() => approveRequest(row.id)} disabled={approve.isPending} className="gap-2">Approve & connect <ArrowRightIcon className="h-4 w-4" /></Button><Button variant="outline" onClick={() => declineRequest(row.id)} disabled={decline.isPending} className="gap-2 text-gray-600"><XCircleIcon className="h-4 w-4" /> Decline</Button></div>
    </CardContent></Card>)}</div>}
  </div>;
}
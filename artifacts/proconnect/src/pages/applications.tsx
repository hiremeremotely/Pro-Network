import { useState, useCallback, useEffect } from "react";
import { Link } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useListProfileApplications, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon,
  CalendarIcon,
  BuildingIcon,
  ArrowRightIcon,
  MapPinIcon,
  UsersIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const BASE = import.meta.env.BASE_URL;

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  reviewing: "bg-blue-50 text-blue-700 border-blue-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  accepted:  "bg-green-50 text-green-700 border-green-200",
  interview: "bg-purple-50 text-purple-700 border-purple-200",
  offer:     "bg-indigo-50 text-indigo-700 border-indigo-200",
};

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-yellow-400",
  reviewing: "bg-blue-400",
  rejected:  "bg-red-400",
  accepted:  "bg-green-400",
  interview: "bg-purple-400",
  offer:     "bg-indigo-400",
};

const STATUS_OPTIONS = ["pending", "reviewing", "interview", "offer", "accepted", "rejected"];

interface CompanyApplication {
  id: number;
  jobId: number;
  profileId: number;
  coverLetter?: string | null;
  status: string;
  appliedAt: string;
  profile: {
    id: number;
    name: string;
    headline?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
  } | null;
  job: {
    id: number;
    title: string;
    company: string;
    location?: string | null;
  } | null;
}

function CompanyApplicationsView() {
  const { user } = useAppAuth();
  const [applications, setApplications] = useState<CompanyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");
  const [converting, setConverting] = useState<number | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}api/companies/${user.id}/applications`);
      if (!res.ok) throw new Error("Failed to load applications");
      setApplications(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);

  const updateStatus = async (appId: number, status: string) => {
    setUpdatingStatus(appId);
    try {
      const res = await fetch(`${BASE}api/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      const updated = await res.json();
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: updated.status } : a));
      toast({ title: "Status updated", description: `Application moved to ${status}.` });
    } catch {
      toast({ title: "Error", description: "Could not update status.", variant: "destructive" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const convertToEmployee = async (app: CompanyApplication) => {
    if (!user?.id || !app.profile) return;
    if (!confirm(`Convert ${app.profile.name} to a team employee?`)) return;
    setConverting(app.id);
    try {
      const res = await fetch(`${BASE}api/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyProfileId: user.id,
          individualProfileId: app.profileId,
          jobId: app.jobId,
          role: app.job?.title ?? "Employee",
          status: "active",
          startDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Conversion failed");
      await updateStatus(app.id, "accepted");
      toast({
        title: "Converted to employee!",
        description: `${app.profile.name} has been added to your team.`,
      });
    } catch {
      toast({ title: "Error", description: "Could not convert to employee.", variant: "destructive" });
    } finally {
      setConverting(null);
    }
  };

  if (loading) return <LoadingState message="Loading applications…" />;
  if (error) return <ErrorState error={new Error(error)} retry={fetchApplications} />;

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = applications.filter(a => a.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <UsersIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">Applications</h1>
          </div>
          <p className="text-muted-foreground">Candidates who applied to your jobs.</p>
        </div>
        {applications.length > 0 && (
          <div className="flex-shrink-0 mt-1">
            <ViewToggle view={view} onChange={setView} options={["list", "grid", "table"]} />
          </div>
        )}
      </div>

      {/* Funnel pills */}
      {applications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_OPTIONS.map(s => counts[s] > 0 && (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[s] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s] || "bg-gray-400"}`} />
              {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
            </div>
          ))}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm text-center max-w-sm">Post jobs to start receiving candidate applications.</p>
          <Link href="/jobs">
            <Button className="gap-2">Post a Job <ArrowRightIcon className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>

          {/* LIST VIEW */}
          {view === "list" && (
            <div className="flex flex-col gap-2">
              {applications.map((app) => {
                const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                return (
                  <div key={app.id} className="bg-white rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-4 px-4 py-3.5">
                      <Link href={`/profiles/${app.profileId}`}>
                        <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0 hover:opacity-80 transition-opacity">
                          <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/profiles/${app.profileId}`}>
                          <p className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors truncate">{app.profile?.name ?? "Unknown"}</p>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <BriefcaseIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{app.job?.title}</span>
                          {app.profile?.location && <><span>·</span><MapPinIcon className="w-3 h-3 flex-shrink-0" /><span>{app.profile.location.split(",")[0]}</span></>}
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                      </div>
                      {/* Status selector */}
                      <select
                        value={app.status}
                        disabled={updatingStatus === app.id}
                        onChange={e => updateStatus(app.id, e.target.value)}
                        className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none bg-white cursor-pointer flex-shrink-0 ${STATUS_STYLES[app.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                      {/* Convert to employee */}
                      {app.status === "accepted" && (
                        <Button
                          size="sm"
                          disabled={converting === app.id}
                          onClick={() => convertToEmployee(app)}
                          className="rounded-full text-[10px] gap-1 h-7 px-2.5 flex-shrink-0 bg-green-600 hover:bg-green-700"
                        >
                          <UserPlusIcon className="w-3 h-3" />
                          {converting === app.id ? "…" : "Hire"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID VIEW */}
          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => {
                const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                return (
                  <Card key={app.id} className="hover:border-primary/30 transition-all hover:shadow-md">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Link href={`/profiles/${app.profileId}`}>
                          <Avatar className="w-11 h-11 border border-gray-100 flex-shrink-0">
                            <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                            <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profiles/${app.profileId}`} className="hover:underline">
                            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">{app.profile?.name ?? "Unknown"}</h3>
                          </Link>
                          {app.profile?.headline && <p className="text-xs text-muted-foreground truncate mt-0.5">{app.profile.headline}</p>}
                        </div>
                        <select
                          value={app.status}
                          disabled={updatingStatus === app.id}
                          onChange={e => updateStatus(app.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full border px-2 py-0.5 focus:outline-none bg-white cursor-pointer flex-shrink-0 ${STATUS_STYLES[app.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BriefcaseIcon className="w-3.5 h-3.5" />
                        {app.job?.title}
                      </div>
                      {app.coverLetter && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs text-muted-foreground font-medium mb-1">Cover Letter</p>
                          <p className="text-sm line-clamp-2">{app.coverLetter}</p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarIcon className="w-3.5 h-3.5" />
                          Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </div>
                        {app.status === "accepted" && (
                          <Button
                            size="sm"
                            disabled={converting === app.id}
                            onClick={() => convertToEmployee(app)}
                            className="rounded-full text-[10px] gap-1 h-7 px-2.5 bg-green-600 hover:bg-green-700"
                          >
                            <UserPlusIcon className="w-3 h-3" />
                            {converting === app.id ? "…" : "Convert to Employee"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Candidate</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => {
                    const initials = app.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                    return (
                      <tr key={app.id} className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                              <AvatarImage src={app.profile?.avatarUrl ?? undefined} />
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                            </Avatar>
                            <Link href={`/profiles/${app.profileId}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">
                              {app.profile?.name ?? "Unknown"}
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{app.job?.title ?? "—"}</td>
                        <td className="px-4 py-3">
                          <select
                            value={app.status}
                            disabled={updatingStatus === app.id}
                            onChange={e => updateStatus(app.id, e.target.value)}
                            className={`text-xs font-semibold rounded-full border px-2.5 py-1 focus:outline-none bg-white cursor-pointer ${STATUS_STYLES[app.status] || "bg-gray-50 text-gray-600 border-gray-200"}`}
                          >
                            {STATUS_OPTIONS.map(s => (
                              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                        </td>
                        <td className="px-4 py-3">
                          {app.status === "accepted" ? (
                            <Button
                              size="sm"
                              disabled={converting === app.id}
                              onClick={() => convertToEmployee(app)}
                              className="rounded-full text-[10px] gap-1 h-7 px-2.5 bg-green-600 hover:bg-green-700"
                            >
                              <UserPlusIcon className="w-3 h-3" />
                              {converting === app.id ? "…" : "Hire"}
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function IndividualApplicationsView({ userId }: { userId: number }) {
  const [view, setView] = useState<ViewMode>("list");

  const { data: applications, isLoading, error, refetch } = useListProfileApplications(userId, {
    query: { queryKey: getListProfileApplicationsQueryKey(userId) }
  });

  return (
    <div className="container mx-auto px-4 py-10 pb-24">
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BriefcaseIcon className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-bold">My Applications</h1>
          </div>
          <p className="text-muted-foreground">Track the status of your job applications.</p>
        </div>
        {applications && applications.length > 0 && (
          <div className="flex-shrink-0 mt-1">
            <ViewToggle view={view} onChange={setView} options={["list", "grid", "table"]} />
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingState message="Loading applications…" />
      ) : error ? (
        <ErrorState error={error} retry={refetch} />
      ) : !applications?.length ? (
        <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
          <BriefcaseIcon className="w-12 h-12 opacity-30" />
          <p className="text-lg font-medium">No applications yet</p>
          <p className="text-sm text-center max-w-sm">Start browsing remote jobs and apply to opportunities that match your skills.</p>
          <Link href="/jobs">
            <Button className="gap-2">Browse Jobs <ArrowRightIcon className="w-4 h-4" /></Button>
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">{applications.length} application{applications.length !== 1 ? "s" : ""}</p>

          {view === "list" && (
            <div className="flex flex-col gap-2">
              {applications.map((app) => (
                <div key={app.id} className="flex items-center gap-4 px-4 py-3.5 bg-white rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/jobs/${app.jobId}`}>
                      <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{app.job?.title}</p>
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      <BuildingIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{app.job?.company}</span>
                      {app.job?.location && <><span>·</span><MapPinIcon className="w-3 h-3 flex-shrink-0" /><span>{app.job.location}</span></>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 flex-shrink-0">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                  </div>
                  <Badge className={`capitalize text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 border ${STATUS_STYLES[app.status] || "bg-gray-100 text-gray-500"}`}>
                    {app.status === "accepted"  && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                    {app.status === "rejected"  && <XCircleIcon className="w-3 h-3 mr-1" />}
                    {app.status === "reviewing" && <ClockIcon className="w-3 h-3 mr-1" />}
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {view === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {applications.map((app) => (
                <Card key={app.id} className="hover:border-primary/40 transition-all hover:shadow-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <BriefcaseIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/jobs/${app.jobId}`} className="hover:underline">
                            <h3 className="font-semibold text-base leading-tight hover:text-primary transition-colors">{app.job?.title}</h3>
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            <BuildingIcon className="w-3.5 h-3.5" />
                            <span>{app.job?.company}</span>
                            {app.job?.location && <><span>·</span><span>{app.job.location}</span></>}
                          </div>
                        </div>
                      </div>
                      <Badge className={`shrink-0 capitalize text-xs border ${STATUS_STYLES[app.status] || "bg-muted text-muted-foreground"}`}>
                        {app.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {app.coverLetter && (
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground font-medium mb-1">Cover Letter</p>
                        <p className="text-sm line-clamp-2">{app.coverLetter}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Applied {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {view === "table" && (
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app, i) => (
                    <tr key={app.id} className={`border-b border-gray-100 hover:bg-primary/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${app.jobId}`} className="font-semibold text-sm text-gray-900 hover:text-primary transition-colors">
                          {app.job?.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{app.job?.company}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{app.job?.location || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[app.status] || "bg-gray-300"}`} />
                          <span className="text-sm capitalize text-gray-700">{app.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {formatDistanceToNow(new Date(app.appliedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Applications() {
  const { user } = useAppAuth();

  if (!user) {
    return (
      <div className="flex flex-col items-center py-24 text-muted-foreground gap-4">
        <BriefcaseIcon className="w-12 h-12 opacity-30" />
        <p className="text-lg font-medium">Please log in</p>
        <Link href="/login"><Button>Log In</Button></Link>
      </div>
    );
  }

  if (user.accountType === "company") {
    return <CompanyApplicationsView />;
  }

  return <IndividualApplicationsView userId={user.id} />;
}

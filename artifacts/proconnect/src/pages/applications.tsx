import { useState } from "react";
import { Link } from "wouter";
import { useListProfileApplications, getListProfileApplicationsQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { ViewToggle, type ViewMode } from "@/components/view-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BriefcaseIcon, CalendarIcon, BuildingIcon, ArrowRightIcon, MapPinIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CURRENT_PROFILE_ID = 1;

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  reviewing: "bg-blue-50 text-blue-700 border-blue-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  accepted:  "bg-green-50 text-green-700 border-green-200",
};

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-yellow-400",
  reviewing: "bg-blue-400",
  rejected:  "bg-red-400",
  accepted:  "bg-green-400",
};

export default function Applications() {
  const [view, setView] = useState<ViewMode>("list");

  const { data: applications, isLoading, error, refetch } = useListProfileApplications(CURRENT_PROFILE_ID, {
    query: { queryKey: getListProfileApplicationsQueryKey(CURRENT_PROFILE_ID) }
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
        <LoadingState message="Loading applications..." />
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

          {/* LIST VIEW — default, clean rows */}
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
                  <Badge className={`capitalize text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${STATUS_STYLES[app.status] || "bg-gray-100 text-gray-500"}`}>
                    {app.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* GRID VIEW — cards */}
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
                      <Badge className={`shrink-0 capitalize text-xs ${STATUS_STYLES[app.status] || "bg-muted text-muted-foreground"}`}>
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

          {/* TABLE VIEW — compact tabular */}
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

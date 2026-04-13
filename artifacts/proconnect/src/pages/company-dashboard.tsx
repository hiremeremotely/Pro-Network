import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useConnections } from "@/hooks/use-connections";
import { useEffect, useState, useCallback } from "react";
import {
  useListJobs, getListJobsQueryKey,
  useListProfiles, getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  BriefcaseIcon,
  UsersIcon,
  PlusCircleIcon,
  SearchIcon,
  ClipboardListIcon,
  PencilIcon,
  BarChart2Icon,
  MapPinIcon,
  ArrowRightIcon,
  BuildingIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  DollarSignIcon,
  UserCheckIcon,
  ClockIcon,
  XIcon,
  SaveIcon,
  UserMinusIcon,
  EyeIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

type EmployeeStatus = "active" | "contractor" | "on-leave";

interface EmployeeProfile {
  id: number;
  name: string;
  headline: string;
  avatarUrl?: string | null;
  location?: string | null;
}

interface EmployeeRecord {
  id: number;
  companyProfileId: number;
  individualProfileId: number;
  jobId?: number | null;
  role: string;
  salary?: number | null;
  currency: string;
  startDate?: string | null;
  status: EmployeeStatus;
  createdAt: string;
  profile: EmployeeProfile | null;
  job: { title: string; company: string } | null;
}

const STATUS_STYLES: Record<EmployeeStatus, string> = {
  active:      "bg-green-50 text-green-700 border-green-200",
  contractor:  "bg-blue-50 text-blue-700 border-blue-200",
  "on-leave":  "bg-amber-50 text-amber-700 border-amber-200",
};

const STATUS_DOT: Record<EmployeeStatus, string> = {
  active:      "bg-green-500",
  contractor:  "bg-blue-500",
  "on-leave":  "bg-amber-500",
};

function TeamMemberModal({
  emp,
  companyId,
  onClose,
  onUpdate,
  onRemove,
}: {
  emp: EmployeeRecord;
  companyId: number;
  onClose: () => void;
  onUpdate: (updated: EmployeeRecord) => void;
  onRemove: (id: number) => void;
}) {
  const [role, setRole] = useState(emp.role);
  const [salary, setSalary] = useState(emp.salary ? String(emp.salary) : "");
  const [status, setStatus] = useState<EmployeeStatus>(emp.status);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE}api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          salary: salary ? parseInt(salary) : null,
          status,
          companyProfileId: companyId,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      onUpdate(updated);
      toast({ title: "Saved", description: "Employee record updated." });
    } catch {
      toast({ title: "Error", description: "Could not save changes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Remove ${emp.profile?.name ?? "this employee"} from your team?`)) return;
    setRemoving(true);
    try {
      await fetch(`${BASE}api/employees/${emp.id}?companyProfileId=${companyId}`, { method: "DELETE" });
      onRemove(emp.id);
      onClose();
      toast({ title: "Removed", description: "Employee removed from team." });
    } catch {
      toast({ title: "Error", description: "Could not remove employee.", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/80 to-indigo-500/70 h-20 relative">
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 -mt-10 pb-6">
          <Avatar className="w-16 h-16 border-4 border-white shadow-md mb-3">
            <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
            <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
          </Avatar>
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900">{emp.profile?.name ?? "Unknown"}</h2>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[emp.status]}`} />
          </div>
          {emp.profile?.headline && <p className="text-sm text-gray-500 mb-1">{emp.profile.headline}</p>}
          {emp.profile?.location && (
            <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
              <MapPinIcon className="w-3 h-3" />
              {emp.profile.location}
            </div>
          )}

          {/* Editable fields */}
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Role</label>
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Salary / yr</label>
                <input
                  type="number"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  placeholder="e.g. 85000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as EmployeeStatus)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary/50 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="contractor">Contractor</option>
                  <option value="on-leave">On Leave</option>
                </select>
              </div>
            </div>
            {emp.startDate && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Start Date</label>
                <p className="text-sm text-gray-700">{new Date(emp.startDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            )}
            {emp.job && (
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Hired For</label>
                <p className="text-sm text-gray-700">{emp.job.title}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/profiles/${emp.individualProfileId}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
                <EyeIcon className="w-3.5 h-3.5" /> View Profile
              </Button>
            </Link>
            <Button size="sm" onClick={save} disabled={saving} className="flex-1 gap-1.5 text-xs">
              <SaveIcon className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={remove} disabled={removing} className="text-red-500 border-red-200 hover:bg-red-50 gap-1.5 text-xs">
              <UserMinusIcon className="w-3.5 h-3.5" /> Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboard() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const { isConnected, toggleConnect } = useConnections();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [companyApps, setCompanyApps] = useState<{ status: string }[]>([]);

  useEffect(() => {
    if (user && user.accountType !== "company") navigate("/feed");
    if (!user) navigate("/login");
  }, [user, navigate]);

  const { data: jobsData } = useListJobs(
    { limit: 5, offset: 0 },
    { query: { queryKey: getListJobsQueryKey({ limit: 5, offset: 0 }) } }
  );

  const { data: talentData } = useListProfiles(
    { limit: 6, offset: 0 },
    { query: { queryKey: getListProfilesQueryKey({ limit: 6, offset: 0 }) } }
  );

  const fetchEmployees = useCallback(async () => {
    if (!user?.id) return;
    setLoadingEmployees(true);
    try {
      const [empRes, appRes] = await Promise.all([
        fetch(`${BASE}api/employees?companyId=${user.id}`),
        fetch(`${BASE}api/companies/${user.id}/applications`),
      ]);
      if (empRes.ok) setEmployees(await empRes.json());
      if (appRes.ok) setCompanyApps(await appRes.json());
    } finally {
      setLoadingEmployees(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const openToWork = (talentData?.profiles ?? []).filter(p => p.openToWork && p.accountType !== "company");
  const myJobs = (jobsData?.jobs ?? []).filter(j => j.companyProfileId === user?.id);
  const recentJobs = jobsData?.jobs ?? [];

  const companyInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : "CO";

  const activeCount     = employees.filter(e => e.status === "active").length;
  const contractorCount = employees.filter(e => e.status === "contractor").length;
  const avgSalary       = employees.filter(e => e.salary).length
    ? Math.round(employees.filter(e => e.salary).reduce((s, e) => s + (e.salary ?? 0), 0) / employees.filter(e => e.salary).length)
    : null;

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {/* Company hero banner */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-primary">{companyInitials}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{user?.name ?? "Your Company"}</h1>
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-semibold rounded-full">Company</Badge>
              </div>
              {user?.headline && <p className="text-gray-500 text-sm mb-3">{user.headline}</p>}
              <div className="flex items-center gap-3 flex-wrap">
                <Link href={`/profiles/${user?.id}`}>
                  <Button variant="outline" size="sm" className="rounded-full border-primary/30 text-primary hover:bg-primary/5 text-xs gap-1.5">
                    <EyeIcon className="w-3.5 h-3.5" /> View Company Page
                  </Button>
                </Link>
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5">
                    <PencilIcon className="w-3.5 h-3.5" /> Edit Profile
                  </Button>
                </Link>
              </div>
            </div>
            <Link href="/jobs">
              <Button className="rounded-full gap-2 shadow-sm flex-shrink-0">
                <PlusCircleIcon className="w-4 h-4" /> Post a Job
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Main content (2 cols) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* HR Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              {
                label: "Total Headcount",
                value: employees.length,
                icon: UsersIcon,
                color: "text-indigo-600 bg-indigo-50",
              },
              {
                label: "Active Employees",
                value: activeCount,
                icon: UserCheckIcon,
                color: "text-green-600 bg-green-50",
              },
              {
                label: "Open Roles",
                value: myJobs.length,
                icon: BriefcaseIcon,
                color: "text-blue-600 bg-blue-50",
              },
              {
                label: "Avg Salary / yr",
                value: avgSalary ? `$${Math.round(avgSalary / 1000)}k` : "—",
                icon: DollarSignIcon,
                color: "text-amber-600 bg-amber-50",
              },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "Post a Job",    icon: PlusCircleIcon,   href: "/jobs",         color: "bg-primary text-white hover:bg-primary/90" },
                { label: "Find Talent",   icon: SearchIcon,       href: "/profiles",     color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Applications", icon: ClipboardListIcon, href: "/applications", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Analytics",    icon: BarChart2Icon,     href: "/analytics",    color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
                { label: "Edit Profile", icon: PencilIcon,        href: "/profile/edit", color: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50" },
              ].map(({ label, icon: Icon, href, color }) => (
                <Link key={label} href={href}>
                  <button className={`w-full rounded-xl px-3 py-3.5 text-sm font-semibold flex flex-col items-center gap-2 transition-colors ${color}`}>
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                </Link>
              ))}
            </div>
          </div>

          {/* My Team */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">My Team</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {employees.length === 0
                    ? "No team members yet — convert an applicant to get started"
                    : `${employees.length} member${employees.length !== 1 ? "s" : ""} · ${activeCount} active${contractorCount ? ` · ${contractorCount} contractor${contractorCount !== 1 ? "s" : ""}` : ""}`}
                </p>
              </div>
              <Link href="/applications">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                  Applications <ArrowRightIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            {loadingEmployees ? (
              <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading team…</div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                <UsersIcon className="w-10 h-10 opacity-25" />
                <p className="text-sm font-medium">Your team is empty</p>
                <p className="text-xs text-center max-w-xs">Accept an application and click "Convert to Employee" to add team members here.</p>
                <Link href="/applications">
                  <Button size="sm" className="rounded-full text-xs mt-1">View Applications</Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {employees.map(emp => {
                  const initials = emp.profile?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "?";
                  return (
                    <button
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group text-left"
                    >
                      <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={emp.profile?.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">{emp.profile?.name ?? "Unknown"}</p>
                        <p className="text-xs text-gray-500 truncate">{emp.role}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                        {emp.salary && (
                          <span className="text-xs text-gray-500 font-medium">
                            ${(emp.salary / 1000).toFixed(0)}k
                          </span>
                        )}
                        <Badge className={`capitalize text-[10px] font-semibold rounded-full border ${STATUS_STYLES[emp.status]}`}>
                          {emp.status === "on-leave" ? "On Leave" : emp.status.charAt(0).toUpperCase() + emp.status.slice(1)}
                        </Badge>
                      </div>
                      {emp.startDate && (
                        <div className="hidden md:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                          <ClockIcon className="w-3 h-3" />
                          {new Date(emp.startDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </div>
                      )}
                      <ChevronRightIcon className="w-4 h-4 text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Recent Platform Jobs</h2>
                <p className="text-xs text-gray-400 mt-0.5">Browse what others are hiring for</p>
              </div>
              <Link href="/jobs">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1">
                  See all <ArrowRightIcon className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                <BriefcaseIcon className="w-10 h-10 opacity-30" />
                <p className="text-sm">No jobs yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentJobs.map((job) => {
                  const salary = job.salaryMin && job.salaryMax
                    ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
                    : null;
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors cursor-pointer group">
                        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <BuildingIcon className="w-4 h-4 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{job.title}</p>
                          <p className="text-xs text-gray-400 truncate">{job.company} · {job.location}</p>
                        </div>
                        {salary && <span className="hidden sm:block text-xs text-gray-500 font-medium flex-shrink-0">{salary}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">

          {/* Hiring funnel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 text-sm">Hiring Funnel</h2>
              <TrendingUpIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="space-y-3">
              {(() => {
                const stages = [
                  { label: "Applied",    status: "pending",   color: "bg-yellow-400" },
                  { label: "Reviewing",  status: "reviewing", color: "bg-blue-400" },
                  { label: "Interview",  status: "interview", color: "bg-purple-400" },
                  { label: "Offer Sent", status: "offer",     color: "bg-indigo-400" },
                  { label: "Hired",      status: "accepted",  color: "bg-green-500" },
                ];
                const maxCount = Math.max(...stages.map(s => companyApps.filter(a => a.status === s.status).length), 1);
                return stages.map(({ label, status, color }) => {
                  const count = companyApps.filter(a => a.status === status).length;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                      <span className="text-xs text-gray-600 flex-1">{label}</span>
                      <span className="text-xs font-bold text-gray-900">{count}</span>
                      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${count === 0 ? 0 : Math.max((count / maxCount) * 100, 6)}%` }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <Link href="/applications" className="inline-flex items-center gap-0.5 mt-4 text-xs font-semibold text-primary hover:underline">
              Manage applications <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Setup checklist */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-gray-900 text-sm">Get hiring faster</h2>
            </div>
            <div className="space-y-3">
              {[
                { done: !!user?.avatarUrl,  label: "Add a company logo" },
                { done: !!user?.headline,   label: "Write a company tagline" },
                { done: myJobs.length > 0,  label: "Post your first job" },
                { done: employees.length > 0, label: "Add a team member" },
              ].map(({ done, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-green-500" : "border-2 border-gray-200"}`}>
                    {done && <CheckCircleIcon className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm ${done ? "line-through text-gray-400" : "text-gray-700"}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-gray-100 rounded-full h-1.5 overflow-hidden">
              {(() => {
                const items = [!!user?.avatarUrl, !!user?.headline, myJobs.length > 0, employees.length > 0];
                const pct = (items.filter(Boolean).length / items.length) * 100;
                return <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />;
              })()}
            </div>
          </div>

          {/* Open to Work talent */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900 text-sm">Open to Work</h2>
                <p className="text-[10px] text-gray-400">Ready to hear from you</p>
              </div>
              <Link href="/profiles">
                <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7 px-2">
                  All <ArrowRightIcon className="w-3 h-3" />
                </Button>
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {openToWork.slice(0, 5).map((profile) => {
                const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <Link key={profile.id} href={`/profiles/${profile.id}`}>
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group">
                      <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                        <AvatarImage src={profile.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">{profile.name}</p>
                        {profile.headline && <p className="text-[11px] text-gray-400 truncate">{profile.headline}</p>}
                        {profile.location && (
                          <div className="flex items-center gap-0.5 mt-0.5">
                            <MapPinIcon className="w-2.5 h-2.5 text-gray-300" />
                            <span className="text-[10px] text-gray-400">{profile.location.split(",")[0]}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={isConnected(profile.id) ? "secondary" : "outline"}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleConnect(profile.id); }}
                        className={`rounded-full px-2.5 text-[10px] flex-shrink-0 hidden group-hover:flex gap-1 ${
                          isConnected(profile.id)
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "border-primary/30 text-primary hover:bg-primary/5"
                        }`}
                      >
                        {isConnected(profile.id) ? "Following" : "Connect"}
                      </Button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* HR tip */}
          <div className="bg-gradient-to-br from-primary/5 to-indigo-100/60 rounded-xl border border-primary/15 p-5">
            <p className="text-xs font-semibold text-primary mb-1.5">HR tip</p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Remote teams with structured onboarding retain employees <strong>50% longer</strong>. Once you hire, use the onboarding toolkit to guide new hires from day one.
            </p>
          </div>
        </div>
      </div>

      {/* Team member modal */}
      {selectedEmployee && (
        <TeamMemberModal
          emp={selectedEmployee}
          companyId={user?.id ?? 0}
          onClose={() => setSelectedEmployee(null)}
          onUpdate={updated => {
            setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
            setSelectedEmployee(updated);
          }}
          onRemove={id => setEmployees(prev => prev.filter(e => e.id !== id))}
        />
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TimerIcon,
  CalendarIcon,
  PlusIcon,
  SaveIcon,
  BuildingIcon,
  ClockIcon,
  CheckCircleIcon,
  ThumbsUpIcon,
  TrashIcon,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL;

interface EmploymentRecord {
  id: number;
  companyProfileId: number;
  individualProfileId: number;
  role: string;
  salary: number | null;
  currency: string;
  startDate: string | null;
  status: string;
}

interface WorkLog {
  id: number;
  employeeId: number;
  date: string;
  hours: string;
  description: string | null;
  createdAt: string;
}

interface TimeOffRequest {
  id: number;
  employeeId: number;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_DOT: Record<string, string> = {
  active:      "bg-green-500",
  contractor:  "bg-blue-500",
  "on-leave":  "bg-amber-500",
};

interface CompanyInfo {
  id: number;
  name: string;
  avatarUrl: string | null;
  headline: string | null;
}

function EngagementPanel({
  record,
  company,
  individualProfileId,
}: {
  record: EmploymentRecord;
  company: CompanyInfo | null;
  individualProfileId: number;
}) {
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [timeOff, setTimeOff] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLog, setNewLog] = useState({ date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
  const [newTOR, setNewTOR] = useState({ startDate: "", endDate: "", reason: "" });
  const [addingLog, setAddingLog] = useState(false);
  const [addingTOR, setAddingTOR] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showTORForm, setShowTORForm] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [logRes, torRes] = await Promise.all([
        fetch(`${BASE}api/employees/${record.id}/work-logs?individualProfileId=${individualProfileId}`),
        fetch(`${BASE}api/employees/${record.id}/time-off?individualProfileId=${individualProfileId}`),
      ]);
      if (logRes.ok) setLogs(await logRes.json());
      if (torRes.ok) setTimeOff(await torRes.json());
    } finally {
      setLoading(false);
    }
  }, [record.id, individualProfileId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const submitLog = async () => {
    if (!newLog.hours || isNaN(Number(newLog.hours))) return;
    setAddingLog(true);
    try {
      const res = await fetch(`${BASE}api/employees/${record.id}/work-logs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newLog, individualProfileId }),
      });
      if (!res.ok) throw new Error("Failed");
      const log = await res.json();
      setLogs(prev => [...prev, log]);
      setNewLog({ date: new Date().toISOString().slice(0, 10), hours: "", description: "" });
      setShowLogForm(false);
      toast({ title: "Work hours logged" });
    } catch {
      toast({ title: "Error", description: "Could not log work.", variant: "destructive" });
    } finally {
      setAddingLog(false);
    }
  };

  const deleteLog = async (logId: number) => {
    try {
      await fetch(`${BASE}api/employees/${record.id}/work-logs/${logId}?individualProfileId=${individualProfileId}`, { method: "DELETE" });
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch {
      toast({ title: "Error", description: "Could not delete log.", variant: "destructive" });
    }
  };

  const submitTOR = async () => {
    if (!newTOR.startDate || !newTOR.endDate) return;
    setAddingTOR(true);
    try {
      const res = await fetch(`${BASE}api/employees/${record.id}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTOR, individualProfileId }),
      });
      if (!res.ok) throw new Error("Failed");
      const tor = await res.json();
      setTimeOff(prev => [...prev, tor]);
      setNewTOR({ startDate: "", endDate: "", reason: "" });
      setShowTORForm(false);
      toast({ title: "Time-off request submitted", description: "Waiting for company approval." });
    } catch {
      toast({ title: "Error", description: "Could not submit request.", variant: "destructive" });
    } finally {
      setAddingTOR(false);
    }
  };

  // Month summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const thisMonthLogs = logs.filter(l => l.date >= monthStart && l.date <= monthEnd);
  const totalHours = thisMonthLogs.reduce((s, l) => s + Number(l.hours), 0);
  const approvedTOR = timeOff.filter(r => r.status === "approved" && r.startDate >= monthStart);
  const totalDaysOff = approvedTOR.reduce((s, r) => {
    return s + Math.max(1, Math.round((new Date(r.endDate).getTime() - new Date(r.startDate).getTime()) / 86400000) + 1);
  }, 0);
  const pendingCount = timeOff.filter(r => r.status === "pending").length;

  const companyInitials = company?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) ?? "CO";

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Company header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <Avatar className="w-10 h-10 border border-gray-200 flex-shrink-0">
          <AvatarImage src={company?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">{companyInitials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 truncate">{company?.name ?? `Company #${record.companyProfileId}`}</p>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[record.status] ?? "bg-gray-400"}`} />
          </div>
          <p className="text-xs text-gray-500 truncate">{record.role}</p>
        </div>
        <Badge className="text-[10px] font-semibold capitalize rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex-shrink-0">
          {record.status === "on-leave" ? "On Leave" : record.status}
        </Badge>
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Monthly summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-center">
              <TimerIcon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-indigo-700">{totalHours.toFixed(1)}</p>
              <p className="text-[10px] text-indigo-500">hrs this month</p>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <CalendarIcon className="w-4 h-4 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-700">{totalDaysOff}</p>
              <p className="text-[10px] text-green-500">approved days off</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <ClockIcon className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-700">{pendingCount}</p>
              <p className="text-[10px] text-amber-500">pending requests</p>
            </div>
          </div>

          {/* Work Logs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log Work Hours</h3>
              <button
                onClick={() => setShowLogForm(v => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Log hours
              </button>
            </div>
            {showLogForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={newLog.date}
                    onChange={e => setNewLog(l => ({ ...l, date: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                  />
                  <input
                    type="number"
                    value={newLog.hours}
                    onChange={e => setNewLog(l => ({ ...l, hours: e.target.value }))}
                    placeholder="Hours worked"
                    min="0.5"
                    max="24"
                    step="0.5"
                    className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                  />
                </div>
                <input
                  value={newLog.description}
                  onChange={e => setNewLog(l => ({ ...l, description: e.target.value }))}
                  placeholder="What did you work on? (optional)"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                />
                <Button size="sm" onClick={submitLog} disabled={addingLog || !newLog.hours} className="w-full text-xs gap-1">
                  <SaveIcon className="w-3 h-3" /> {addingLog ? "Saving…" : "Save Log"}
                </Button>
              </div>
            )}
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">No work logged yet — log your first hours above</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...logs].reverse().map(log => (
                  <div key={log.id} className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800">{Number(log.hours)}h</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(log.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </div>
                      {log.description && <p className="text-[11px] text-gray-500 truncate mt-0.5">{log.description}</p>}
                    </div>
                    <button onClick={() => deleteLog(log.id)} className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-50 flex-shrink-0 mt-0.5">
                      <TrashIcon className="w-3 h-3 text-gray-300 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time-Off Requests */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Time-Off Requests</h3>
              <button
                onClick={() => setShowTORForm(v => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Request time off
              </button>
            </div>
            {showTORForm && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">From</label>
                    <input
                      type="date"
                      value={newTOR.startDate}
                      onChange={e => setNewTOR(t => ({ ...t, startDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">To</label>
                    <input
                      type="date"
                      value={newTOR.endDate}
                      onChange={e => setNewTOR(t => ({ ...t, endDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>
                <input
                  value={newTOR.reason}
                  onChange={e => setNewTOR(t => ({ ...t, reason: e.target.value }))}
                  placeholder="Reason (optional)"
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-primary/50"
                />
                <Button size="sm" onClick={submitTOR} disabled={addingTOR || !newTOR.startDate || !newTOR.endDate} className="w-full text-xs gap-1">
                  <SaveIcon className="w-3 h-3" /> {addingTOR ? "Submitting…" : "Submit Request"}
                </Button>
              </div>
            )}
            {timeOff.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">No time-off requests — submit one above</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {[...timeOff].reverse().map(tor => {
                  const days = Math.max(1, Math.round((new Date(tor.endDate).getTime() - new Date(tor.startDate).getTime()) / 86400000) + 1);
                  return (
                    <div key={tor.id} className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-medium text-gray-700">
                            {new Date(tor.startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" – "}
                            {new Date(tor.endDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            <span className="text-gray-400 ml-1">({days}d)</span>
                          </span>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_BADGE[tor.status] ?? "bg-gray-50 text-gray-500"}`}>
                          {tor.status}
                        </span>
                      </div>
                      {tor.reason && <p className="text-[11px] text-gray-500 truncate">{tor.reason}</p>}
                      {tor.status === "approved" && tor.reviewNote && (
                        <p className="text-[10px] text-green-600 mt-0.5 flex items-center gap-1">
                          <CheckCircleIcon className="w-2.5 h-2.5" /> {tor.reviewNote}
                        </p>
                      )}
                      {tor.status === "rejected" && tor.reviewNote && (
                        <p className="text-[10px] text-red-500 mt-0.5">{tor.reviewNote}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyWork() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const [employment, setEmployment] = useState<EmploymentRecord[]>([]);
  const [companies, setCompanies] = useState<Record<number, CompanyInfo>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.accountType === "company") navigate("/company-dashboard");
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${BASE}api/my-employment?individualProfileId=${user.id}`);
        if (!res.ok) return;
        const records: EmploymentRecord[] = await res.json();
        setEmployment(records);

        // Fetch company profiles
        const uniqueCompanyIds = [...new Set(records.map(r => r.companyProfileId))];
        if (uniqueCompanyIds.length > 0) {
          const companyData: Record<number, CompanyInfo> = {};
          await Promise.all(
            uniqueCompanyIds.map(async (cid) => {
              const pRes = await fetch(`${BASE}api/profiles/${cid}`);
              if (pRes.ok) {
                const p = await pRes.json();
                companyData[cid] = { id: cid, name: p.name, avatarUrl: p.avatarUrl, headline: p.headline };
              }
            })
          );
          setCompanies(companyData);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  if (!user || user.accountType === "company") return null;

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
              <TimerIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Work</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                Log your hours and manage time-off requests with companies you work with
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center py-20 text-gray-400 gap-3">
            <ClockIcon className="w-10 h-10 opacity-30 animate-pulse" />
            <p className="text-sm">Loading your engagements…</p>
          </div>
        ) : employment.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-gray-400 gap-4">
            <BuildingIcon className="w-12 h-12 opacity-20" />
            <div className="text-center">
              <p className="text-base font-semibold text-gray-600">No active engagements yet</p>
              <p className="text-sm mt-1 max-w-sm">
                When a company adds you as a team member, your engagement will appear here.
                You can then log work hours and submit time-off requests.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">
              {employment.length} engagement{employment.length !== 1 ? "s" : ""} found
            </p>
            {employment.map(record => (
              <EngagementPanel
                key={record.id}
                record={record}
                company={companies[record.companyProfileId] ?? null}
                individualProfileId={user.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

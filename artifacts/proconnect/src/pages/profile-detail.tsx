import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useGetProfile, getGetProfileQueryKey,
  useUpdateProfile,
  useListEducation, getListEducationQueryKey, useCreateEducation, useDeleteEducation,
  useListExperience, getListExperienceQueryKey, useCreateExperience, useDeleteExperience,
  useListProfileSkills, getListProfileSkillsQueryKey, useAddProfileSkill, useDeleteProfileSkill,
} from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useUpload } from "@workspace/object-storage-web";
import { useAppAuth } from "@/contexts/app-auth";
import {
  MapPinIcon, GlobeIcon, GithubIcon, LinkedinIcon, TwitterIcon,
  GraduationCapIcon, BriefcaseIcon, ZapIcon, PencilIcon,
  PlusIcon, TrashIcon, XIcon, CheckIcon, CameraIcon,
  UserCheckIcon, UserPlusIcon, MessageSquareIcon, BuildingIcon, UsersIcon,
  ArrowRightIcon, DollarSignIcon, ClockIcon, StarIcon,
  ThumbsUpIcon, ActivityIcon, TrendingUpIcon, EyeIcon, FileTextIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { useStartChat } from "@/hooks/use-start-chat";
import { useConnections } from "@/hooks/use-connections";
import { ConnectModal } from "@/components/connect-modal";
import { DisconnectConfirmDialog } from "@/components/disconnect-confirm-dialog";
import { ExpressInterestModal } from "@/components/express-interest-modal";

// ── Modal wrapper ─────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ── Edit Basic Info Modal ─────────────────────────────────────────────────────
function EditInfoModal({ profile, profileId, onClose }: { profile: any; profileId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAppAuth();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    name: profile.name ?? "",
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    website: profile.website ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    twitterUrl: profile.twitterUrl ?? "",
    openToWork: profile.openToWork ?? false,
  });

  function save() {
    updateProfile.mutate(
      {
        id: profileId,
        data: {
          name: form.name,
          headline: form.headline,
          bio: form.bio || null,
          location: form.location || null,
          avatarUrl: form.avatarUrl || null,
          website: form.website || null,
          linkedinUrl: form.linkedinUrl || null,
          githubUrl: form.githubUrl || null,
          twitterUrl: form.twitterUrl || null,
          openToWork: form.openToWork,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          if (user) {
            const stored = localStorage.getItem("app_user_session");
            if (stored) {
              const parsed = JSON.parse(stored);
              localStorage.setItem("app_user_session", JSON.stringify({ ...parsed, name: form.name, headline: form.headline, avatarUrl: form.avatarUrl || null }));
            }
          }
          toast({ title: "Profile updated!" });
          onClose();
        },
        onError: () => toast({ title: "Failed to save", variant: "destructive" }),
      }
    );
  }

  return (
    <Modal title="Edit intro" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Name *</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Headline</Label>
          <Input placeholder="Full-Stack Engineer | React & Node.js" value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Location</Label>
          <Input placeholder="San Francisco, CA (Remote)" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">About / Bio</Label>
          <Textarea placeholder="Tell your story..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="text-sm min-h-[80px] resize-none" />
        </div>
        <Separator />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Links</p>
        <div className="grid grid-cols-1 gap-3">
          {[
            { key: "website", icon: GlobeIcon, placeholder: "https://yourwebsite.com" },
            { key: "linkedinUrl", icon: LinkedinIcon, placeholder: "https://linkedin.com/in/..." },
            { key: "githubUrl", icon: GithubIcon, placeholder: "https://github.com/..." },
            { key: "twitterUrl", icon: TwitterIcon, placeholder: "https://twitter.com/..." },
          ].map(({ key, icon: Icon, placeholder }) => (
            <div key={key} className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <Input placeholder={placeholder} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="h-9 text-sm" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-1">
          <div>
            <p className="text-sm font-medium text-gray-800">Open to Work</p>
            <p className="text-xs text-gray-400">Show recruiters you're available</p>
          </div>
          <Switch checked={form.openToWork} onCheckedChange={v => setForm(f => ({ ...f, openToWork: v }))} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 rounded-xl text-sm">Cancel</Button>
          <Button onClick={save} disabled={updateProfile.isPending || !form.name} className="flex-1 h-9 rounded-xl text-sm">
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Experience Modal ──────────────────────────────────────────────────────
function AddExperienceModal({ profileId, onClose }: { profileId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createExperience = useCreateExperience();
  const [form, setForm] = useState({ company: "", title: "", location: "", remote: false, startDate: "", endDate: "", current: false, description: "" });

  function save() {
    if (!form.company || !form.title || !form.startDate) return;
    createExperience.mutate(
      { profileId, data: { company: form.company, title: form.title, location: form.location || null, remote: form.remote, startDate: form.startDate, endDate: form.current ? null : (form.endDate || null), current: form.current, description: form.description || null } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListExperienceQueryKey(profileId) }); toast({ title: "Experience added!" }); onClose(); } }
    );
  }

  return (
    <Modal title="Add experience" onClose={onClose}>
      <div className="space-y-4">
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Job title *</Label><Input placeholder="e.g. Senior Engineer" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="h-9 text-sm" /></div>
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Company *</Label><Input placeholder="e.g. Vercel" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="h-9 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Start date *</Label><Input type="month" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} className="h-9 text-sm" /></div>
          <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">End date</Label><Input type="month" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} disabled={form.current} className="h-9 text-sm disabled:opacity-40" /></div>
        </div>
        <div className="flex items-center gap-2"><Switch checked={form.current} onCheckedChange={v => setForm(f => ({ ...f, current: v, endDate: v ? "" : f.endDate }))}/><Label className="text-sm text-gray-700">I currently work here</Label></div>
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Location</Label><Input placeholder="San Francisco, CA" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} className="h-9 text-sm" /></div>
        <div className="flex items-center gap-2"><Switch checked={form.remote} onCheckedChange={v => setForm(f => ({ ...f, remote: v }))}/><Label className="text-sm text-gray-700">Remote</Label></div>
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Description</Label><Textarea placeholder="Describe your role and achievements..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm min-h-[80px] resize-none" /></div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 rounded-xl text-sm">Cancel</Button>
          <Button onClick={save} disabled={createExperience.isPending || !form.company || !form.title || !form.startDate} className="flex-1 h-9 rounded-xl text-sm">{createExperience.isPending ? "Adding..." : "Add experience"}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Education Modal ───────────────────────────────────────────────────────
function AddEducationModal({ profileId, onClose }: { profileId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const createEducation = useCreateEducation();
  const [form, setForm] = useState({ school: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" });

  function save() {
    if (!form.school || !form.startYear) return;
    createEducation.mutate(
      { profileId, data: { school: form.school, degree: form.degree || null, fieldOfStudy: form.fieldOfStudy || null, startYear: parseInt(form.startYear), endYear: form.endYear ? parseInt(form.endYear) : null } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListEducationQueryKey(profileId) }); toast({ title: "Education added!" }); onClose(); } }
    );
  }

  return (
    <Modal title="Add education" onClose={onClose}>
      <div className="space-y-4">
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">School *</Label><Input placeholder="e.g. MIT" value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} className="h-9 text-sm" /></div>
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Degree</Label><Input placeholder="e.g. Bachelor of Science" value={form.degree} onChange={e => setForm(f => ({ ...f, degree: e.target.value }))} className="h-9 text-sm" /></div>
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Field of study</Label><Input placeholder="e.g. Computer Science" value={form.fieldOfStudy} onChange={e => setForm(f => ({ ...f, fieldOfStudy: e.target.value }))} className="h-9 text-sm" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Start year *</Label><Input type="number" placeholder="2018" value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: e.target.value }))} className="h-9 text-sm" /></div>
          <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">End year</Label><Input type="number" placeholder="2022" value={form.endYear} onChange={e => setForm(f => ({ ...f, endYear: e.target.value }))} className="h-9 text-sm" /></div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 rounded-xl text-sm">Cancel</Button>
          <Button onClick={save} disabled={createEducation.isPending || !form.school || !form.startYear} className="flex-1 h-9 rounded-xl text-sm">{createEducation.isPending ? "Adding..." : "Add education"}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Add Skill Modal ───────────────────────────────────────────────────────────
function AddSkillModal({ profileId, onClose }: { profileId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const addSkill = useAddProfileSkill();
  const [name, setName] = useState("");
  const [level, setLevel] = useState("");

  function save() {
    if (!name) return;
    addSkill.mutate(
      { profileId, data: { name, level: level || null } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getListProfileSkillsQueryKey(profileId) }); onClose(); } }
    );
  }

  return (
    <Modal title="Add skill" onClose={onClose}>
      <div className="space-y-4">
        <div><Label className="text-xs font-semibold text-gray-600 mb-1 block">Skill *</Label><Input placeholder="e.g. TypeScript" value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm" autoFocus /></div>
        <div>
          <Label className="text-xs font-semibold text-gray-600 mb-1 block">Level</Label>
          <div className="flex gap-2 flex-wrap">
            {["Beginner", "Intermediate", "Advanced", "Expert"].map(l => (
              <button key={l} type="button" onClick={() => setLevel(level === l ? "" : l)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${level === l ? "bg-primary text-white border-primary" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 h-9 rounded-xl text-sm">Cancel</Button>
          <Button onClick={save} disabled={addSkill.isPending || !name} className="flex-1 h-9 rounded-xl text-sm">{addSkill.isPending ? "Adding..." : "Add skill"}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Company Profile View ──────────────────────────────────────────────────────
function CompanyProfileView({ profile, id, isOwn, onEditInfo, avatarInputRef, avatarUploading, handleAvatarFile, isFollowing, isFollowPending, onFollow, onMessage, msgLoading }: {
  profile: any; id: number; isOwn: boolean; onEditInfo: () => void;
  avatarInputRef: React.RefObject<HTMLInputElement>; avatarUploading: boolean;
  handleAvatarFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isFollowing: boolean; isFollowPending: boolean; onFollow: () => void;
  onMessage: () => void; msgLoading: boolean;
}) {
  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

  // Fetch jobs that match this company's name
  const { data: jobsData } = useListJobs(
    { search: profile.name, limit: 10, offset: 0 },
    { query: { queryKey: getListJobsQueryKey({ search: profile.name, limit: 10, offset: 0 }) } }
  );
  const jobs = jobsData?.jobs ?? [];

  return (
    <div className="bg-[#f3f2ef] min-h-screen pb-24">
      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">

        {/* ── Company hero card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Full-width banner */}
          <div className="relative h-44 bg-gradient-to-br from-primary/80 via-indigo-500/60 to-purple-400/50">
            {profile.coverUrl && <img src={profile.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          </div>

          <div className="px-6 pb-6">
            {/* Logo row */}
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="relative">
                <div className={`w-20 h-20 rounded-xl border-4 border-white shadow-lg overflow-hidden bg-white flex items-center justify-center transition-opacity ${avatarUploading ? "opacity-50" : ""}`}>
                  {profile.avatarUrl
                    ? <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-bold text-primary">{initials}</span>
                  }
                </div>
                {isOwn && (
                  <>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      className="absolute bottom-1 right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
                    >
                      {avatarUploading
                        ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <CameraIcon className="w-3.5 h-3.5" />
                      }
                    </button>
                  </>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-12">
                {isOwn ? (
                  <Button variant="outline" size="sm" onClick={onEditInfo} className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                    <PencilIcon className="w-3.5 h-3.5" /> Edit profile
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant={isFollowing ? "secondary" : "default"}
                      onClick={onFollow}
                      className={`rounded-full h-9 px-5 text-sm font-semibold gap-1.5 ${
                        isFollowing
                          ? "bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                          : isFollowPending
                            ? "bg-amber-50 text-amber-600 border border-amber-300 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                            : ""
                      }`}
                    >
                      {isFollowing
                        ? <><UserCheckIcon className="w-3.5 h-3.5" /> Following</>
                        : isFollowPending
                          ? <><ClockIcon className="w-3.5 h-3.5" /> Pending</>
                          : <><StarIcon className="w-3.5 h-3.5" /> Follow</>}
                    </Button>
                    {profile.website && (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                          <GlobeIcon className="w-3.5 h-3.5" /> Visit website
                        </Button>
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Company name + tagline */}
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
                <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold rounded-full px-2">Company</Badge>
              </div>
              {profile.headline && (
                <p className="text-sm text-gray-600 font-medium mb-2">{profile.headline}</p>
              )}

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                {profile.location && (
                  <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" />{profile.location}</span>
                )}
                {jobs.length > 0 && (
                  <span className="flex items-center gap-1"><BriefcaseIcon className="w-3.5 h-3.5" />{jobs.length} open position{jobs.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {/* Links */}
              {(profile.website || profile.linkedinUrl || profile.twitterUrl || profile.githubUrl) && (
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      <GlobeIcon className="w-3.5 h-3.5" />{profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      <LinkedinIcon className="w-3.5 h-3.5" />LinkedIn
                    </a>
                  )}
                  {profile.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      <TwitterIcon className="w-3.5 h-3.5" />X
                    </a>
                  )}
                  {profile.githubUrl && (
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      <GithubIcon className="w-3.5 h-3.5" />GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Left: About + Jobs ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* About */}
            {(profile.bio || isOwn) && (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <BuildingIcon className="w-4 h-4 text-primary" /> About
                  </h2>
                  {isOwn && (
                    <button onClick={onEditInfo} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <PencilIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {profile.bio ? (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic cursor-pointer hover:text-primary" onClick={onEditInfo}>
                    + Add a company description to help candidates understand your mission and culture.
                  </p>
                )}
              </div>
            )}

            {/* Open Positions */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BriefcaseIcon className="w-4 h-4 text-primary" /> Open Positions
                  {jobs.length > 0 && <span className="text-xs font-normal text-gray-400">({jobs.length})</span>}
                </h2>
                <Link href="/jobs">
                  <Button variant="ghost" size="sm" className="text-primary text-xs gap-1 h-7">
                    All jobs <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              {jobs.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-gray-400 gap-3">
                  <BriefcaseIcon className="w-10 h-10 opacity-20" />
                  <p className="text-sm">No open positions right now</p>
                  {isOwn && (
                    <Link href="/jobs">
                      <Button size="sm" className="rounded-full text-xs">Post a Job</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {jobs.map((job) => {
                    const salary = job.salaryMin && job.salaryMax
                      ? `$${(job.salaryMin / 1000).toFixed(0)}k – $${(job.salaryMax / 1000).toFixed(0)}k`
                      : null;
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <div className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {profile.avatarUrl
                              ? <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
                              : <BuildingIcon className="w-5 h-5 text-gray-400" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors">{job.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{job.location}</p>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              {job.experienceLevel && (
                                <Badge className="bg-indigo-50 text-indigo-600 border-0 text-[10px] font-medium rounded-full px-2">{job.experienceLevel}</Badge>
                              )}
                              {job.category && (
                                <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px] font-medium rounded-full px-2">{job.category}</Badge>
                              )}
                              {salary && (
                                <span className="flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                                  <DollarSignIcon className="w-3 h-3" />{salary}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 pt-1">
                            <Button size="sm" className="rounded-full text-xs h-7 px-3 hidden group-hover:flex">Apply</Button>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-4">
            {/* Company highlights */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-4">Company Highlights</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{jobs.length > 0 ? jobs.length : "—"}</p>
                    <p className="text-xs text-gray-400">Open positions</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <GlobeIcon className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Remote-First</p>
                    <p className="text-xs text-gray-400">Work style</p>
                  </div>
                </div>
                {profile.location && (
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{profile.location.split(",")[0]}</p>
                      <p className="text-xs text-gray-400">Headquarters</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Why join us */}
            <div className="bg-gradient-to-br from-primary/5 to-indigo-100/60 rounded-2xl border border-primary/15 p-5">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Why join {profile.name.split(" ")[0]}?</h2>
              <ul className="space-y-2.5">
                {[
                  "100% remote-first culture",
                  "Competitive salary & equity",
                  "Flexible working hours",
                  "Growth & learning budget",
                ].map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckIcon className="w-4 h-4 text-primary flex-shrink-0" />
                    {perk}
                  </li>
                ))}
              </ul>
            </div>

            {/* Share profile */}
            {!isOwn && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 text-sm mb-3">Share this company</h2>
                <div className="flex gap-2">
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors text-gray-600">
                      <LinkedinIcon className="w-3.5 h-3.5" />LinkedIn
                    </a>
                  )}
                  {profile.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors text-gray-600">
                      <TwitterIcon className="w-3.5 h-3.5" />X
                    </a>
                  )}
                  {(!profile.linkedinUrl && !profile.twitterUrl) && (
                    <p className="text-xs text-gray-400">No social links added yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, icon: Icon, isOwn, onAdd, onEdit }: { title: string; icon: any; isOwn: boolean; onAdd?: () => void; onEdit?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />{title}
      </h2>
      {isOwn && (
        <div className="flex items-center gap-1">
          {onEdit && (
            <button onClick={onEdit} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
          {onAdd && (
            <button onClick={onAdd} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <PlusIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Profile Page ─────────────────────────────────────────────────────────
export default function ProfileDetail() {
  const { user } = useAppAuth();
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const startChat = useStartChat();
  const { isConnected, isPending, sendRequest, cancelRequest, disconnect } = useConnections();
  const [showConnectModal, setShowConnectModal] = useState(false);
  const deleteExperience = useDeleteExperience();
  const deleteEducation = useDeleteEducation();
  const deleteSkill = useDeleteProfileSkill();
  const updateProfile = useUpdateProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [modal, setModal] = useState<"info" | "exp" | "edu" | "skill" | "interest" | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const isCompanyViewer = user?.accountType === "company";
  const interestStatusKey = ["interest-status", user?.id, id];
  const { data: interestStatusData, refetch: refetchInterestStatus } = useQuery<{ status: "pending" | "approved" | "declined" | null }>({
    queryKey: interestStatusKey,
    queryFn: () => fetch(`${BASE}api/interest-requests/status?companyProfileId=${user!.id}&candidateProfileId=${id}`).then(r => r.json()),
    enabled: isCompanyViewer && !!user?.id && !!id,
    staleTime: 30_000,
  });
  const interestStatus = interestStatusData?.status ?? null;
  const [coverUploading, setCoverUploading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [disconnectConfirmOpen, setDisconnectConfirmOpen] = useState(false);

  async function handleMessage() {
    setMsgLoading(true);
    const convId = await startChat(id);
    setMsgLoading(false);
    navigate(convId ? `/messaging?conv=${convId}` : "/messaging");
  }

  const { uploadFile } = useUpload({
    onSuccess: async (res) => {
      const avatarUrl = `/api/storage${res.objectPath}`;
      updateProfile.mutate(
        { id, data: { avatarUrl } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetProfileQueryKey(id) });
            qc.invalidateQueries({ queryKey: ["my-full-profile", id] });
            const stored = localStorage.getItem("app_user_session");
            if (stored) {
              const parsed = JSON.parse(stored);
              localStorage.setItem("app_user_session", JSON.stringify({ ...parsed, avatarUrl }));
            }
            toast({ title: "Profile photo updated!" });
            setAvatarUploading(false);
          },
        }
      );
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
      setAvatarUploading(false);
    },
  });

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    await uploadFile(file);
    e.target.value = "";
  }

  const { uploadFile: uploadCover } = useUpload({
    onSuccess: async (res) => {
      const coverUrl = `/api/storage${res.objectPath}`;
      updateProfile.mutate(
        { id, data: { coverUrl } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetProfileQueryKey(id) });
            qc.invalidateQueries({ queryKey: ["my-full-profile", id] });
            toast({ title: "Cover photo updated!" });
            setCoverUploading(false);
          },
        }
      );
    },
    onError: () => {
      toast({ title: "Upload failed", variant: "destructive" });
      setCoverUploading(false);
    },
  });

  async function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    await uploadCover(file);
    e.target.value = "";
  }

  const BASE = import.meta.env.BASE_URL;

  const { data: profile, isLoading, error, refetch } = useGetProfile(id, {
    query: { enabled: !!id, queryKey: getGetProfileQueryKey(id) }
  });
  const { data: experience = [] } = useListExperience(id, { query: { queryKey: getListExperienceQueryKey(id) } });
  const { data: education = [] } = useListEducation(id, { query: { queryKey: getListEducationQueryKey(id) } });
  const { data: skills = [] } = useListProfileSkills(id, { query: { queryKey: getListProfileSkillsQueryKey(id) } });

  const { data: profilePosts = [] } = useQuery<any[]>({
    queryKey: ["profile-posts", id],
    queryFn: () => fetch(`${BASE}api/posts?authorProfileId=${id}`).then(r => r.json()),
    enabled: !!id,
    staleTime: 30_000,
  });

  const { data: networkData } = useQuery<{ total: number; connectionCount: number; followingCount: number; connections: any[]; following: any[] }>({
    queryKey: ["profile-network", id],
    queryFn: () => fetch(`${BASE}api/connections/network`, { credentials: "include" }).then(r => r.json()),
    enabled: !!id,
    staleTime: 60_000,
  });

  const connectionCount = networkData?.connectionCount ?? 0;
  const followingCount  = networkData?.followingCount ?? 0;

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!profile) return null;

  const isOwn = user?.id === id;
  const isCompany = profile.accountType === "company";
  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

  function fmtDate(d: string) {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return m ? `${months[parseInt(m)-1]} ${y}` : y;
  }

  // ── Company profile branch ─────────────────────────────────────────────────
  if (isCompany) {
    return (
      <>
        {modal === "info" && <EditInfoModal profile={profile} profileId={id} onClose={() => setModal(null)} />}
        <DisconnectConfirmDialog
          open={disconnectConfirmOpen}
          profileName={profile.name}
          onConfirm={() => { setDisconnectConfirmOpen(false); disconnect(id); }}
          onCancel={() => setDisconnectConfirmOpen(false)}
        />
        <CompanyProfileView
          profile={profile}
          id={id}
          isOwn={isOwn}
          onEditInfo={() => setModal("info")}
          avatarInputRef={avatarInputRef}
          avatarUploading={avatarUploading}
          handleAvatarFile={handleAvatarFile}
          isFollowing={isConnected(id)}
          isFollowPending={isPending(id)}
          onFollow={() => {
            if (isConnected(id)) setDisconnectConfirmOpen(true);
            else if (isPending(id)) cancelRequest(id);
            else sendRequest(id, "");
          }}
          onMessage={handleMessage}
          msgLoading={msgLoading}
        />
      </>
    );
  }

  return (
    <div className="bg-[#f3f2ef] min-h-screen pb-24">
      {/* Modals */}
      {modal === "info"  && <EditInfoModal profile={profile} profileId={id} onClose={() => setModal(null)} />}
      {modal === "exp"   && <AddExperienceModal profileId={id} onClose={() => setModal(null)} />}
      {modal === "edu"   && <AddEducationModal  profileId={id} onClose={() => setModal(null)} />}
      {modal === "skill" && <AddSkillModal      profileId={id} onClose={() => setModal(null)} />}
      {modal === "interest" && user && interestStatus !== "pending" && (
        <ExpressInterestModal
          candidateId={id}
          candidateName={profile.name}
          companyProfileId={user.id}
          onClose={() => setModal(null)}
          onSent={() => refetchInterestStatus()}
        />
      )}
      {showConnectModal && (
        <ConnectModal
          profile={profile}
          onSend={(msg) => { sendRequest(id, msg); setShowConnectModal(false); }}
          onClose={() => setShowConnectModal(false)}
        />
      )}
      <DisconnectConfirmDialog
        open={disconnectConfirmOpen}
        profileName={profile.name}
        onConfirm={() => { setDisconnectConfirmOpen(false); disconnect(id); }}
        onCancel={() => setDisconnectConfirmOpen(false)}
      />

      <div className="max-w-[1320px] mx-auto px-4 pt-6 pb-24 md:pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

          {/* ── Left column (main content) ── */}
          <div className="lg:col-span-2 space-y-3">

            {/* Profile header card */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Banner */}
              <div className={`relative h-40 bg-gradient-to-r from-primary/70 via-primary/45 to-indigo-300/60 group transition-opacity ${coverUploading ? "opacity-60" : ""}`}>
                {profile.coverUrl && <img src={profile.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                {isOwn && (
                  <>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverFile}
                    />
                    <button
                      onClick={() => coverInputRef.current?.click()}
                      disabled={coverUploading}
                      title="Upload cover photo"
                      className="absolute top-3 right-3 w-9 h-9 bg-white/80 hover:bg-white disabled:opacity-50 rounded-full flex items-center justify-center text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {coverUploading
                        ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        : <CameraIcon className="w-4 h-4" />}
                    </button>
                  </>
                )}
              </div>

              <div className="px-6 pb-6">
                {/* Avatar + action buttons row */}
                <div className="flex items-end justify-between -mt-12 mb-4">
                  <div className="relative">
                    <Avatar className={`w-28 h-28 border-4 border-white shadow-md transition-opacity ${avatarUploading ? "opacity-50" : ""}`}>
                      <AvatarImage src={profile.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    {isOwn && (
                      <>
                        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                        <button
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={avatarUploading}
                          title="Upload profile photo"
                          className="absolute bottom-1 right-1 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 shadow-sm disabled:opacity-50 transition-colors"
                        >
                          {avatarUploading
                            ? <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            : <CameraIcon className="w-3.5 h-3.5" />}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-14 flex-wrap justify-end">
                    {isOwn ? (
                      <Button variant="outline" size="sm" onClick={() => setModal("info")} className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                        <PencilIcon className="w-3.5 h-3.5" /> Edit profile
                      </Button>
                    ) : user?.accountType === "company" ? (
                      interestStatus === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5 border-amber-300 text-amber-600 opacity-100 cursor-not-allowed"
                        >
                          <ClockIcon className="w-3.5 h-3.5" /> Interest Sent
                        </Button>
                      ) : interestStatus === "approved" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled
                          className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5 border-emerald-300 text-emerald-600 opacity-100 cursor-not-allowed"
                        >
                          <CheckIcon className="w-3.5 h-3.5" /> Contacted
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setModal("interest")}
                          className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5"
                        >
                          <UserPlusIcon className="w-3.5 h-3.5" /> Express Interest
                        </Button>
                      )
                    ) : (
                      <>
                        {isConnected(id) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDisconnectConfirmOpen(true)}
                            className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                          >
                            <UserCheckIcon className="w-3.5 h-3.5" /> Connected
                          </Button>
                        ) : isPending(id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelRequest(id)}
                            className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5 border-amber-300 text-amber-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
                          >
                            <ClockIcon className="w-3.5 h-3.5" /> Pending
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setShowConnectModal(true)}
                            className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5"
                          >
                            <UserPlusIcon className="w-3.5 h-3.5" /> Connect
                          </Button>
                        )}
                        {isConnected(id) && (
                          <Button variant="outline" size="sm" onClick={handleMessage} disabled={msgLoading} className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                            <MessageSquareIcon className="w-3.5 h-3.5" /> {msgLoading ? "Opening…" : "Message"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Name / headline / meta */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
                    {profile.openToWork && (
                      <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] font-semibold px-2 rounded-full border">Open to Work</Badge>
                    )}
                  </div>
                  {profile.headline && <p className="text-base text-gray-600 leading-snug">{profile.headline}</p>}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 pt-1">
                    {profile.location && (
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-3.5 h-3.5" /> {profile.location}
                      </span>
                    )}
                    {connectionCount > 0 && (
                      <Link href="/profiles?tab=connections">
                        <span className="text-primary font-semibold cursor-pointer hover:underline">
                          {connectionCount} connection{connectionCount !== 1 ? "s" : ""}
                        </span>
                      </Link>
                    )}
                    {followingCount > 0 && (
                      <Link href="/profiles?tab=following">
                        <span className="text-primary font-semibold cursor-pointer hover:underline">
                          {followingCount} following
                        </span>
                      </Link>
                    )}
                  </div>

                  {/* Social links */}
                  {(profile.website || profile.githubUrl || profile.linkedinUrl || profile.twitterUrl) && (
                    <div className="flex items-center gap-3 pt-2 flex-wrap">
                      {profile.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <GlobeIcon className="w-3 h-3" /> {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {profile.githubUrl && (
                        <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <GithubIcon className="w-3 h-3" /> GitHub
                        </a>
                      )}
                      {profile.linkedinUrl && (
                        <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <LinkedinIcon className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                      {profile.twitterUrl && (
                        <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
                          <TwitterIcon className="w-3 h-3" /> X
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analytics strip — own profile only */}
            {isOwn && (
              <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUpIcon className="w-4 h-4 text-primary" /> Profile analytics
                  </h2>
                  <Link href="/analytics">
                    <span className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1">
                      See all analytics <ArrowRightIcon className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <EyeIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">Profile views</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">—</p>
                    <p className="text-xs text-gray-400">Past 90 days</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <FileTextIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">Post impressions</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{profilePosts.reduce((acc: number, p: any) => acc + (p.likesCount ?? 0), 0)}</p>
                    <p className="text-xs text-gray-400">Total reactions</p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <UsersIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">Connections</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{connectionCount}</p>
                    {followingCount > 0 && (
                      <p className="text-xs text-gray-400">{followingCount} following</p>
                    )}
                    <Link href="/profiles?tab=discover">
                      <p className="text-xs text-primary cursor-pointer hover:underline">Grow network</p>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Activity section */}
            {(profilePosts.length > 0 || isOwn) && (
              <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                    <ActivityIcon className="w-4 h-4 text-primary" /> Activity
                  </h2>
                  <Link href="/feed">
                    <span className="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1">
                      See all posts <ArrowRightIcon className="w-3 h-3" />
                    </span>
                  </Link>
                </div>
                <p className="text-xs text-gray-400 mb-4">{profile.name.split(" ")[0]} has {profilePosts.length} post{profilePosts.length !== 1 ? "s" : ""}</p>

                {/* Posts tab strip */}
                <div className="flex gap-0 border-b border-gray-100 mb-4">
                  <button className="px-4 py-2 text-sm font-semibold text-primary border-b-2 border-primary -mb-px">Posts</button>
                </div>

                {profilePosts.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-gray-400 gap-2">
                    <FileTextIcon className="w-10 h-10 opacity-20" />
                    <p className="text-sm">{isOwn ? "Share your first post on the feed." : "No posts yet."}</p>
                    {isOwn && (
                      <Link href="/feed">
                        <Button size="sm" className="rounded-full text-xs mt-1">Create a post</Button>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(profilePosts as any[]).slice(0, 4).map((post: any) => {
                      const totalReactions = Object.values(post.reactionCounts ?? {}).reduce((a: number, b: unknown) => a + (b as number), 0);
                      return (
                        <div key={post.id} className="border border-gray-100 rounded-xl p-4 hover:border-primary/20 hover:bg-gray-50/50 transition-colors">
                          <p className="text-sm text-gray-800 leading-relaxed line-clamp-3 whitespace-pre-line">{post.content}</p>
                          {post.imageUrl && (
                            <img src={post.imageUrl} alt="" className="mt-3 rounded-lg max-h-44 w-full object-cover" />
                          )}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-400 border-t border-gray-100 pt-3">
                            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                            {(totalReactions as number) > 0 && (
                              <span className="flex items-center gap-1">
                                <ThumbsUpIcon className="w-3 h-3" /> {totalReactions as number}
                              </span>
                            )}
                            {post.commentsCount > 0 && (
                              <span className="flex items-center gap-1">
                                <MessageSquareIcon className="w-3 h-3" /> {post.commentsCount}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {profilePosts.length > 4 && (
                      <Link href="/feed">
                        <button className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-primary border border-gray-200 hover:border-primary/30 rounded-xl transition-colors">
                          Show all {profilePosts.length} posts
                        </button>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* About */}
            {(profile.bio || isOwn) && (
              <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
                <SectionHeader title="About" icon={UserCheckIcon} isOwn={isOwn} onEdit={() => setModal("info")} />
                {profile.bio ? (
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Add a bio to let others know more about you.</p>
                )}
              </div>
            )}

            {/* Experience */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
              <SectionHeader title="Experience" icon={BriefcaseIcon} isOwn={isOwn} onAdd={() => setModal("exp")} />
              {(experience as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 italic">{isOwn ? "Add your work experience." : "No experience listed."}</p>
              ) : (
                <div className="space-y-5">
                  {(experience as any[]).map((exp: any, i: number) => (
                    <div key={exp.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BriefcaseIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{exp.title}</p>
                              <p className="text-sm text-primary font-medium">{exp.company}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {fmtDate(exp.startDate)} – {exp.current ? "Present" : fmtDate(exp.endDate || "")}
                                {exp.location && ` · ${exp.location}`}
                                {exp.remote && <span className="ml-1 text-primary font-medium">· Remote</span>}
                              </p>
                            </div>
                            {isOwn && (
                              <button onClick={() => deleteExperience.mutate({ profileId: id, id: exp.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListExperienceQueryKey(id) }) })}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0">
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {exp.description && <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{exp.description}</p>}
                        </div>
                      </div>
                      {i < experience.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
              <SectionHeader title="Education" icon={GraduationCapIcon} isOwn={isOwn} onAdd={() => setModal("edu")} />
              {(education as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 italic">{isOwn ? "Add your education history." : "No education listed."}</p>
              ) : (
                <div className="space-y-5">
                  {(education as any[]).map((edu: any, i: number) => (
                    <div key={edu.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <GraduationCapIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-sm text-gray-900">{edu.school}</p>
                              {edu.degree && <p className="text-sm text-primary font-medium">{edu.degree}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}</p>}
                              <p className="text-xs text-gray-400 mt-0.5">{edu.startYear} – {edu.endYear ?? "Present"}</p>
                            </div>
                            {isOwn && (
                              <button onClick={() => deleteEducation.mutate({ profileId: id, id: edu.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListEducationQueryKey(id) }) })}
                                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0">
                                <TrashIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      {i < education.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Skills */}
            <div className="bg-white rounded-2xl border border-gray-200 px-6 py-4">
              <SectionHeader title="Skills" icon={ZapIcon} isOwn={isOwn} onAdd={() => setModal("skill")} />
              {(skills as any[]).length === 0 ? (
                <p className="text-sm text-gray-400 italic">{isOwn ? "Add skills to showcase your expertise." : "No skills listed."}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(skills as any[]).map((skill: any) => (
                    <div key={skill.id} className="group flex items-center gap-1 bg-gray-50 hover:bg-primary/5 border border-gray-200 hover:border-primary/30 rounded-full px-3 py-1.5 transition-colors">
                      <span className="text-xs font-medium text-gray-700">{skill.name}</span>
                      {skill.level && <span className="text-[10px] text-gray-400">· {skill.level}</span>}
                      {isOwn && (
                        <button onClick={() => deleteSkill.mutate({ profileId: id, id: skill.id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListProfileSkillsQueryKey(id) }) })}
                          className="ml-1 w-3.5 h-3.5 flex items-center justify-center text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                          <XIcon className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* ── Right sidebar ── */}
          <div className="space-y-3">

            {/* Open to work */}
            {profile.openToWork && (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <BriefcaseIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">Open to work</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {isOwn ? "You are visible to recruiters as open to new opportunities." : `${profile.name.split(" ")[0]} is actively exploring remote roles.`}
                </p>
              </div>
            )}

            {/* Network stats */}
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                <UsersIcon className="w-4 h-4 text-primary" /> Network
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-2xl font-bold text-gray-900">
                    {connectionCount}
                    <span className="text-sm font-normal text-gray-400 ml-1">connection{connectionCount !== 1 ? "s" : ""}</span>
                  </p>
                  {followingCount > 0 && (
                    <p className="text-sm text-gray-500">
                      {followingCount} <span className="text-gray-400">following</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <FileTextIcon className="w-3.5 h-3.5" />
                  <span>{profilePosts.length} post{profilePosts.length !== 1 ? "s" : ""} shared</span>
                </div>
              </div>
              {isOwn && (
                <Link href="/profiles?tab=discover">
                  <Button variant="outline" size="sm" className="mt-4 w-full rounded-full text-xs gap-1.5">
                    <UsersIcon className="w-3.5 h-3.5" /> Grow my network
                  </Button>
                </Link>
              )}
            </div>

            {/* Top skills */}
            {(skills as any[]).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <ZapIcon className="w-4 h-4 text-primary" /> Top skills
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(skills as any[]).slice(0, 6).map((skill: any) => (
                    <span key={skill.id} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full border border-primary/20">
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Latest experience */}
            {(experience as any[]).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <BriefcaseIcon className="w-4 h-4 text-primary" /> Current role
                </h3>
                {(() => {
                  const current = (experience as any[]).find((e: any) => e.current) ?? (experience as any[])[0];
                  return (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <BriefcaseIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{current.title}</p>
                        <p className="text-xs text-primary font-medium">{current.company}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{current.current ? "Present" : fmtDate(current.endDate || "")}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Latest education */}
            {(education as any[]).length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
                  <GraduationCapIcon className="w-4 h-4 text-primary" /> Education
                </h3>
                {(() => {
                  const latest = (education as any[])[0];
                  return (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <GraduationCapIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{latest.school}</p>
                        {latest.degree && <p className="text-xs text-primary font-medium">{latest.degree}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{latest.startYear} – {latest.endYear ?? "Present"}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

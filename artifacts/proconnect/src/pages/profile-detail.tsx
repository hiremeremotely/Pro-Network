import { useState, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
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
  UserCheckIcon, MessageSquareIcon,
} from "lucide-react";

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
  const deleteExperience = useDeleteExperience();
  const deleteEducation = useDeleteEducation();
  const deleteSkill = useDeleteProfileSkill();
  const updateProfile = useUpdateProfile();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [modal, setModal] = useState<"info" | "exp" | "edu" | "skill" | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { uploadFile } = useUpload({
    onSuccess: async (res) => {
      const avatarUrl = `/api/storage${res.objectPath}`;
      updateProfile.mutate(
        { id, data: { avatarUrl } },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetProfileQueryKey(id) });
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

  const { data: profile, isLoading, error, refetch } = useGetProfile(id, {
    query: { enabled: !!id, queryKey: getGetProfileQueryKey(id) }
  });
  const { data: experience = [] } = useListExperience(id, { query: { queryKey: getListExperienceQueryKey(id) } });
  const { data: education = [] } = useListEducation(id, { query: { queryKey: getListEducationQueryKey(id) } });
  const { data: skills = [] } = useListProfileSkills(id, { query: { queryKey: getListProfileSkillsQueryKey(id) } });

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!profile) return null;

  const isOwn = user?.id === id;
  const initials = profile.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);

  function fmtDate(d: string) {
    if (!d) return "";
    const [y, m] = d.split("-");
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return m ? `${months[parseInt(m)-1]} ${y}` : y;
  }

  return (
    <div className="bg-[#f3f2ef] min-h-screen pb-24">
      {/* Modals */}
      {modal === "info"  && <EditInfoModal profile={profile} profileId={id} onClose={() => setModal(null)} />}
      {modal === "exp"   && <AddExperienceModal profileId={id} onClose={() => setModal(null)} />}
      {modal === "edu"   && <AddEducationModal  profileId={id} onClose={() => setModal(null)} />}
      {modal === "skill" && <AddSkillModal      profileId={id} onClose={() => setModal(null)} />}

      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-3">

        {/* ── Profile card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Banner */}
          <div className="relative h-36 bg-gradient-to-r from-primary/70 via-primary/45 to-indigo-300/60 group">
            {profile.coverUrl && <img src={profile.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            {isOwn && (
              <button className="absolute top-3 right-3 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="px-5 pb-5">
            {/* Avatar row */}
            <div className="flex items-end justify-between -mt-12 mb-3">
              <div className="relative">
                <Avatar className={`w-24 h-24 border-4 border-white shadow-md transition-opacity ${avatarUploading ? "opacity-50" : ""}`}>
                  <AvatarImage src={profile.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                {isOwn && (
                  <>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarFile}
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={avatarUploading}
                      title="Upload profile photo"
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
              <div className="flex items-center gap-2 pt-14">
                {isOwn ? (
                  <Button variant="outline" size="sm" onClick={() => setModal("info")} className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                    <PencilIcon className="w-3.5 h-3.5" /> Edit profile
                  </Button>
                ) : (
                  <>
                    <Button size="sm" className="rounded-full h-9 px-5 text-sm font-semibold gap-1.5">
                      <UserCheckIcon className="w-3.5 h-3.5" /> Connect
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-full h-9 px-5 text-sm font-semibold border-gray-700 text-gray-700 hover:bg-gray-50 gap-1.5">
                      <MessageSquareIcon className="w-3.5 h-3.5" /> Message
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Name / headline / meta */}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">{profile.name}</h1>
                {profile.openToWork && (
                  <Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] font-semibold px-2 rounded-full border">Open to Work</Badge>
                )}
              </div>
              {profile.headline && <p className="text-sm text-gray-600 mt-0.5 leading-snug">{profile.headline}</p>}
              {profile.location && (
                <p className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                  <MapPinIcon className="w-3.5 h-3.5" /> {profile.location}
                </p>
              )}

              {/* Links row */}
              {(profile.website || profile.githubUrl || profile.linkedinUrl || profile.twitterUrl) && (
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <GlobeIcon className="w-3 h-3" /> {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  )}
                  {profile.githubUrl && (
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <GithubIcon className="w-3 h-3" /> GitHub
                    </a>
                  )}
                  {profile.linkedinUrl && (
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <LinkedinIcon className="w-3 h-3" /> LinkedIn
                    </a>
                  )}
                  {profile.twitterUrl && (
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <TwitterIcon className="w-3 h-3" /> Twitter
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── About ── */}
        {(profile.bio || isOwn) && (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
            <SectionHeader title="About" icon={UserCheckIcon} isOwn={isOwn} onEdit={() => setModal("info")} />
            {profile.bio ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{profile.bio}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">Add a bio to let others know more about you.</p>
            )}
          </div>
        )}

        {/* ── Experience ── */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
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

        {/* ── Education ── */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
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

        {/* ── Skills ── */}
        <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4">
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
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfile, getGetProfileQueryKey,
  useUpdateProfile,
  useListEducation, getListEducationQueryKey, useCreateEducation, useDeleteEducation,
  useListExperience, getListExperienceQueryKey, useCreateExperience, useDeleteExperience,
  useListPortfolio, getListPortfolioQueryKey, useCreatePortfolioProject, useDeletePortfolioProject,
  useListProfileSkills, getListProfileSkillsQueryKey, useAddProfileSkill, useDeleteProfileSkill,
} from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { PlusIcon, TrashIcon, SaveIcon, UserIcon, GraduationCapIcon, BriefcaseIcon, FolderIcon, ZapIcon } from "lucide-react";
import { useAppAuth } from "@/contexts/app-auth";
import { useLocation } from "wouter";

export default function ProfileEdit() {
  const { user } = useAppAuth();
  const [, navigate] = useLocation();
  const profileId = user?.id ?? 0;
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: profile, isLoading, error, refetch } = useGetProfile(profileId, {
    query: { enabled: profileId > 0, queryKey: getGetProfileQueryKey(profileId) }
  });
  const { data: education } = useListEducation(profileId, { query: { enabled: profileId > 0, queryKey: getListEducationQueryKey(profileId) } });
  const { data: experience } = useListExperience(profileId, { query: { enabled: profileId > 0, queryKey: getListExperienceQueryKey(profileId) } });
  const { data: portfolio } = useListPortfolio(profileId, { query: { enabled: profileId > 0, queryKey: getListPortfolioQueryKey(profileId) } });
  const { data: skills } = useListProfileSkills(profileId, { query: { enabled: profileId > 0, queryKey: getListProfileSkillsQueryKey(profileId) } });

  const CURRENT_PROFILE_ID = profileId;

  const updateProfile = useUpdateProfile();
  const createEducation = useCreateEducation();
  const deleteEducation = useDeleteEducation();
  const createExperience = useCreateExperience();
  const deleteExperience = useDeleteExperience();
  const createPortfolio = useCreatePortfolioProject();
  const deletePortfolio = useDeletePortfolioProject();
  const addSkill = useAddProfileSkill();
  const deleteSkill = useDeleteProfileSkill();

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    name: profile?.name ?? "",
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    location: profile?.location ?? "",
    website: profile?.website ?? "",
    linkedinUrl: profile?.linkedinUrl ?? "",
    githubUrl: profile?.githubUrl ?? "",
    twitterUrl: profile?.twitterUrl ?? "",
    openToWork: profile?.openToWork ?? false,
  });

  // Education form
  const [eduForm, setEduForm] = useState({ school: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" });
  // Experience form
  const [expForm, setExpForm] = useState({ company: "", title: "", location: "", remote: false, startDate: "", endDate: "", current: false, description: "" });
  // Portfolio form
  const [portForm, setPortForm] = useState({ title: "", description: "", projectUrl: "", tags: "" });
  // Skill form
  const [skillForm, setSkillForm] = useState({ name: "", level: "" });

  if (!user) { navigate("/login"); return null; }
  if (isLoading) return <LoadingState message="Loading your profile..." />;
  if (error) return <ErrorState error={error} retry={refetch} />;

  const currentName = profile?.name ?? "";
  const formName = profileForm.name;

  // Sync profile form once on load
  if (profile && profileForm.name === "" && profile.name !== "") {
    setProfileForm({
      name: profile.name,
      headline: profile.headline,
      bio: profile.bio ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      linkedinUrl: profile.linkedinUrl ?? "",
      githubUrl: profile.githubUrl ?? "",
      twitterUrl: profile.twitterUrl ?? "",
      openToWork: profile.openToWork,
    });
  }

  function saveProfile() {
    updateProfile.mutate(
      { id: CURRENT_PROFILE_ID, data: { ...profileForm, bio: profileForm.bio || null, location: profileForm.location || null, website: profileForm.website || null, linkedinUrl: profileForm.linkedinUrl || null, githubUrl: profileForm.githubUrl || null, twitterUrl: profileForm.twitterUrl || null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProfileQueryKey(CURRENT_PROFILE_ID) });
          toast({ title: "Profile saved!" });
        },
        onError: () => toast({ title: "Error saving profile", variant: "destructive" }),
      }
    );
  }

  function addEducation() {
    if (!eduForm.school || !eduForm.startYear) return;
    createEducation.mutate(
      { profileId: CURRENT_PROFILE_ID, data: { school: eduForm.school, degree: eduForm.degree || null, fieldOfStudy: eduForm.fieldOfStudy || null, startYear: parseInt(eduForm.startYear), endYear: eduForm.endYear ? parseInt(eduForm.endYear) : null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListEducationQueryKey(CURRENT_PROFILE_ID) });
          setEduForm({ school: "", degree: "", fieldOfStudy: "", startYear: "", endYear: "" });
          toast({ title: "Education added!" });
        },
      }
    );
  }

  function removeEducation(id: number) {
    deleteEducation.mutate({ profileId: CURRENT_PROFILE_ID, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListEducationQueryKey(CURRENT_PROFILE_ID) }),
    });
  }

  function addExperience() {
    if (!expForm.company || !expForm.title || !expForm.startDate) return;
    createExperience.mutate(
      { profileId: CURRENT_PROFILE_ID, data: { company: expForm.company, title: expForm.title, location: expForm.location || null, remote: expForm.remote, startDate: expForm.startDate, endDate: expForm.endDate || null, current: expForm.current, description: expForm.description || null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListExperienceQueryKey(CURRENT_PROFILE_ID) });
          setExpForm({ company: "", title: "", location: "", remote: false, startDate: "", endDate: "", current: false, description: "" });
          toast({ title: "Experience added!" });
        },
      }
    );
  }

  function removeExperience(id: number) {
    deleteExperience.mutate({ profileId: CURRENT_PROFILE_ID, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListExperienceQueryKey(CURRENT_PROFILE_ID) }),
    });
  }

  function addPortfolio() {
    if (!portForm.title) return;
    createPortfolio.mutate(
      { profileId: CURRENT_PROFILE_ID, data: { title: portForm.title, description: portForm.description || null, projectUrl: portForm.projectUrl || null, imageUrl: null, tags: portForm.tags.split(",").map(t => t.trim()).filter(Boolean), featured: false } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListPortfolioQueryKey(CURRENT_PROFILE_ID) });
          setPortForm({ title: "", description: "", projectUrl: "", tags: "" });
          toast({ title: "Project added!" });
        },
      }
    );
  }

  function removePortfolio(id: number) {
    deletePortfolio.mutate({ profileId: CURRENT_PROFILE_ID, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPortfolioQueryKey(CURRENT_PROFILE_ID) }),
    });
  }

  function addSkillFn() {
    if (!skillForm.name) return;
    addSkill.mutate(
      { profileId: CURRENT_PROFILE_ID, data: { name: skillForm.name, level: skillForm.level || null } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListProfileSkillsQueryKey(CURRENT_PROFILE_ID) });
          setSkillForm({ name: "", level: "" });
        },
      }
    );
  }

  function removeSkillFn(id: number) {
    deleteSkill.mutate({ profileId: CURRENT_PROFILE_ID, id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListProfileSkillsQueryKey(CURRENT_PROFILE_ID) }),
    });
  }

  return (
    <div className="container mx-auto px-4 py-10 pb-24 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">Edit Profile</h1>
        <p className="text-muted-foreground">Manage your professional presence on Hire Me Remotely.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-8 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="gap-2"><UserIcon className="w-4 h-4" /> Profile</TabsTrigger>
          <TabsTrigger value="experience" className="gap-2"><BriefcaseIcon className="w-4 h-4" /> Experience</TabsTrigger>
          <TabsTrigger value="education" className="gap-2"><GraduationCapIcon className="w-4 h-4" /> Education</TabsTrigger>
          <TabsTrigger value="portfolio" className="gap-2"><FolderIcon className="w-4 h-4" /> Portfolio</TabsTrigger>
          <TabsTrigger value="skills" className="gap-2"><ZapIcon className="w-4 h-4" /> Skills</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" data-testid="input-profile-name" />
                </div>
                <div className="space-y-2">
                  <Label>Headline</Label>
                  <Input value={profileForm.headline} onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Senior Frontend Engineer" data-testid="input-profile-headline" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell the world about yourself..." rows={4} data-testid="textarea-profile-bio" />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={profileForm.location} onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. London, UK (Remote)" data-testid="input-profile-location" />
              </div>

              <Separator />
              <h3 className="font-medium text-sm">Links</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={profileForm.website} onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yoursite.com" />
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input value={profileForm.linkedinUrl} onChange={e => setProfileForm(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/..." />
                </div>
                <div className="space-y-2">
                  <Label>GitHub URL</Label>
                  <Input value={profileForm.githubUrl} onChange={e => setProfileForm(p => ({ ...p, githubUrl: e.target.value }))} placeholder="https://github.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>X (Twitter) URL</Label>
                  <Input value={profileForm.twitterUrl} onChange={e => setProfileForm(p => ({ ...p, twitterUrl: e.target.value }))} placeholder="https://x.com/..." />
                </div>
              </div>

              <Separator />
              <div className="flex items-center gap-3">
                <Switch checked={profileForm.openToWork} onCheckedChange={v => setProfileForm(p => ({ ...p, openToWork: v }))} id="open-to-work" data-testid="switch-open-to-work" />
                <Label htmlFor="open-to-work">Open to Work</Label>
                <span className="text-sm text-muted-foreground">(shows green badge on your profile)</span>
              </div>

              <Button onClick={saveProfile} disabled={updateProfile.isPending} className="gap-2" data-testid="button-save-profile">
                <SaveIcon className="w-4 h-4" /> {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Experience Tab */}
        <TabsContent value="experience" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Work Experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {experience?.map((exp) => (
                <div key={exp.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border" data-testid={`experience-row-${exp.id}`}>
                  <div>
                    <p className="font-semibold">{exp.title}</p>
                    <p className="text-sm text-primary">{exp.company}</p>
                    <p className="text-xs text-muted-foreground">{exp.startDate} — {exp.current ? "Present" : (exp.endDate || "")}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeExperience(exp.id)} data-testid={`button-delete-experience-${exp.id}`}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add Experience</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={expForm.company} onChange={e => setExpForm(p => ({ ...p, company: e.target.value }))} placeholder="Company name" data-testid="input-experience-company" />
                </div>
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={expForm.title} onChange={e => setExpForm(p => ({ ...p, title: e.target.value }))} placeholder="Job title" data-testid="input-experience-title" />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input value={expForm.startDate} onChange={e => setExpForm(p => ({ ...p, startDate: e.target.value }))} placeholder="e.g. 2022-01" data-testid="input-experience-startdate" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input value={expForm.endDate} onChange={e => setExpForm(p => ({ ...p, endDate: e.target.value }))} placeholder="e.g. 2024-06 (leave blank if current)" disabled={expForm.current} />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={expForm.location} onChange={e => setExpForm(p => ({ ...p, location: e.target.value }))} placeholder="City or Remote" />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={expForm.remote} onCheckedChange={v => setExpForm(p => ({ ...p, remote: v }))} id="remote" />
                  <Label htmlFor="remote">Remote</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={expForm.current} onCheckedChange={v => setExpForm(p => ({ ...p, current: v, endDate: v ? "" : p.endDate }))} id="current" />
                  <Label htmlFor="current">Current Role</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your responsibilities and achievements..." rows={3} />
              </div>
              <Button onClick={addExperience} disabled={createExperience.isPending} className="gap-2" data-testid="button-add-experience">
                <PlusIcon className="w-4 h-4" /> Add Experience
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Education Tab */}
        <TabsContent value="education" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Education History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {education?.map((edu) => (
                <div key={edu.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border" data-testid={`education-row-${edu.id}`}>
                  <div>
                    <p className="font-semibold">{edu.school}</p>
                    {edu.degree && <p className="text-sm text-primary">{edu.degree}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}</p>}
                    <p className="text-xs text-muted-foreground">{edu.startYear} — {edu.endYear || "Present"}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeEducation(edu.id)} data-testid={`button-delete-education-${edu.id}`}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add Education</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School</Label>
                  <Input value={eduForm.school} onChange={e => setEduForm(p => ({ ...p, school: e.target.value }))} placeholder="University or institution" data-testid="input-education-school" />
                </div>
                <div className="space-y-2">
                  <Label>Degree</Label>
                  <Input value={eduForm.degree} onChange={e => setEduForm(p => ({ ...p, degree: e.target.value }))} placeholder="e.g. B.S., M.A." />
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input value={eduForm.fieldOfStudy} onChange={e => setEduForm(p => ({ ...p, fieldOfStudy: e.target.value }))} placeholder="e.g. Computer Science" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Start Year</Label>
                    <Input value={eduForm.startYear} onChange={e => setEduForm(p => ({ ...p, startYear: e.target.value }))} placeholder="2018" data-testid="input-education-startyear" />
                  </div>
                  <div className="space-y-2">
                    <Label>End Year</Label>
                    <Input value={eduForm.endYear} onChange={e => setEduForm(p => ({ ...p, endYear: e.target.value }))} placeholder="2022" />
                  </div>
                </div>
              </div>
              <Button onClick={addEducation} disabled={createEducation.isPending} className="gap-2" data-testid="button-add-education">
                <PlusIcon className="w-4 h-4" /> Add Education
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portfolio Tab */}
        <TabsContent value="portfolio" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Portfolio Projects</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {portfolio?.map((proj) => (
                <div key={proj.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 border" data-testid={`portfolio-row-${proj.id}`}>
                  <div>
                    <p className="font-semibold">{proj.title}</p>
                    {proj.description && <p className="text-sm text-muted-foreground line-clamp-1">{proj.description}</p>}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {proj.tags.map(tag => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removePortfolio(proj.id)} data-testid={`button-delete-portfolio-${proj.id}`}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Add Project</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Project Title</Label>
                <Input value={portForm.title} onChange={e => setPortForm(p => ({ ...p, title: e.target.value }))} placeholder="My Awesome Project" data-testid="input-portfolio-title" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={portForm.description} onChange={e => setPortForm(p => ({ ...p, description: e.target.value }))} placeholder="What did you build and what impact did it have?" rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project URL</Label>
                  <Input value={portForm.projectUrl} onChange={e => setPortForm(p => ({ ...p, projectUrl: e.target.value }))} placeholder="https://github.com/..." />
                </div>
                <div className="space-y-2">
                  <Label>Tags (comma-separated)</Label>
                  <Input value={portForm.tags} onChange={e => setPortForm(p => ({ ...p, tags: e.target.value }))} placeholder="React, TypeScript, Node.js" data-testid="input-portfolio-tags" />
                </div>
              </div>
              <Button onClick={addPortfolio} disabled={createPortfolio.isPending} className="gap-2" data-testid="button-add-portfolio">
                <PlusIcon className="w-4 h-4" /> Add Project
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader><CardTitle>Skills</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-2 min-h-[60px]">
                {skills?.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="gap-2 px-3 py-1.5 text-sm" data-testid={`badge-skill-${skill.id}`}>
                    {skill.name}
                    {skill.level && <span className="text-muted-foreground text-xs">· {skill.level}</span>}
                    <button onClick={() => removeSkillFn(skill.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors" data-testid={`button-delete-skill-${skill.id}`}>
                      ×
                    </button>
                  </Badge>
                ))}
                {!skills?.length && <p className="text-sm text-muted-foreground">No skills added yet.</p>}
              </div>

              <Separator />

              <div className="flex gap-3">
                <Input
                  value={skillForm.name}
                  onChange={e => setSkillForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Skill name (e.g. React)"
                  className="max-w-xs"
                  onKeyDown={e => { if (e.key === "Enter") addSkillFn(); }}
                  data-testid="input-skill-name"
                />
                <Input
                  value={skillForm.level}
                  onChange={e => setSkillForm(p => ({ ...p, level: e.target.value }))}
                  placeholder="Level (optional)"
                  className="max-w-xs"
                />
                <Button onClick={addSkillFn} disabled={addSkill.isPending} className="gap-2" data-testid="button-add-skill">
                  <PlusIcon className="w-4 h-4" /> Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

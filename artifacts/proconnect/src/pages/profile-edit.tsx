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
import {
  PlusIcon, TrashIcon, SaveIcon, UserIcon, GraduationCapIcon, BriefcaseIcon,
  FolderIcon, ZapIcon, BuildingIcon, ArrowRightIcon, XIcon,
  LayoutDashboardIcon, LinkIcon, Settings2Icon, LogOutIcon, HelpCircleIcon,
  SunIcon, MoonIcon, MenuIcon, XCircleIcon, ChevronRightIcon,
} from "lucide-react";
import { useAppAuth } from "@/contexts/app-auth";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout";

export default function ProfileEdit() {
  const { user, logout } = useAppAuth();
  const [, navigate] = useLocation();
  const profileId = user?.id ?? 0;
  const isCompany = user?.accountType === "company";
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

  // Company settings sidebar state
  const [settingsSection, setSettingsSection] = useState<"details" | "links">("details");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTheme, setSidebarTheme] = useState<"dark" | "light">(() => (localStorage.getItem("hmr_sidebar_theme_v1") as "dark" | "light") ?? "dark");

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
    industry: profile?.industry ?? "",
    customLinks: (profile?.customLinks ?? []) as Array<{ label: string; url: string }>,
  });
  const [newLink, setNewLink] = useState({ label: "", url: "" });

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
      industry: profile.industry ?? "",
      customLinks: (profile.customLinks ?? []) as Array<{ label: string; url: string }>,
    });
  }

  function saveProfile(afterSave?: () => void) {
    updateProfile.mutate(
      {
        id: CURRENT_PROFILE_ID,
        data: {
          ...profileForm,
          bio: profileForm.bio || null,
          location: profileForm.location || null,
          website: profileForm.website || null,
          linkedinUrl: profileForm.linkedinUrl || null,
          githubUrl: profileForm.githubUrl || null,
          twitterUrl: profileForm.twitterUrl || null,
          industry: profileForm.industry || null,
          customLinks: profileForm.customLinks,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetProfileQueryKey(CURRENT_PROFILE_ID) });
          toast({ title: isCompany ? "Company settings saved!" : "Profile saved!" });
          afterSave?.();
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

  const isOnboarding = user?.accountType === "company" &&
    new URLSearchParams(window.location.search).get("onboarding") === "true";

  function addCustomLink() {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    setProfileForm(p => ({ ...p, customLinks: [...p.customLinks, { label: newLink.label.trim(), url: newLink.url.trim() }] }));
    setNewLink({ label: "", url: "" });
  }

  function removeCustomLink(idx: number) {
    setProfileForm(p => ({ ...p, customLinks: p.customLinks.filter((_, i) => i !== idx) }));
  }

  // ── Company layout (sidebar + main, no outer nav) ───────────────────────────
  if (isCompany) {
    const dk = sidebarTheme === "dark";
    const companyInitials = (user?.name ?? "C").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

    const settingsSections: Array<{ id: "details" | "links"; label: string; icon: React.ElementType }> = [
      { id: "details", label: "Company Details", icon: BuildingIcon },
      { id: "links",   label: "Links",            icon: LinkIcon    },
    ];

    const SidebarContent = () => (
      <div className="flex flex-col h-full">
        {/* Company identity */}
        <div className={`px-4 py-5 border-b ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 ${dk ? "bg-white/10 border border-white/15" : "bg-primary/10 border border-primary/20"}`}>
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                : <span className={`text-sm font-bold ${dk ? "text-white" : "text-primary"}`}>{companyInitials}</span>
              }
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold truncate leading-tight ${dk ? "text-white" : "text-gray-900"}`}>{user?.name ?? "Your Company"}</p>
              <p className={`text-[10px] truncate ${dk ? "text-white/40" : "text-gray-400"}`}>Company Settings</p>
            </div>
          </div>
        </div>

        {/* Settings sections */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider ${dk ? "text-white/25" : "text-gray-400"}`}>Settings</p>
          {settingsSections.map(({ id, label, icon: Icon }) => {
            const active = settingsSection === id;
            return (
              <button
                key={id}
                onClick={() => { setSettingsSection(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? dk ? "bg-white/10 text-white" : "bg-primary text-white"
                    : dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{label}</span>
                {active && <ChevronRightIcon className="w-3.5 h-3.5 opacity-60" />}
              </button>
            );
          })}

          <div className={`my-2 border-t ${dk ? "border-white/[0.08]" : "border-gray-100"}`} />
          <p className={`px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider ${dk ? "text-white/25" : "text-gray-400"}`}>Navigation</p>
          <button
            onClick={() => navigate("/company-dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            <LayoutDashboardIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Dashboard</span>
          </button>
          <button
            onClick={() => navigate(`/profiles/${profileId}`)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            <UserIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">View Profile</span>
          </button>
        </nav>

        {/* Bottom */}
        <div className={`px-2 py-3 border-t space-y-0.5 ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
          <button
            onClick={() => setSidebarTheme(t => t === "dark" ? "light" : "dark")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}
          >
            {dk ? <SunIcon className="w-4 h-4 flex-shrink-0" /> : <MoonIcon className="w-4 h-4 flex-shrink-0" />}
            {dk ? "Light mode" : "Dark mode"}
          </button>
          <a href="mailto:support@hiremeremotely.com">
            <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dk ? "text-white/50 hover:bg-white/5 hover:text-white/80" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
              <HelpCircleIcon className="w-4 h-4 flex-shrink-0" />
              Help
            </button>
          </a>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${dk ? "text-red-400 hover:bg-red-500/10 hover:text-red-300" : "text-red-500 hover:bg-red-50 hover:text-red-600"}`}
          >
            <LogOutIcon className="w-4 h-4 flex-shrink-0" />
            Logout
          </button>
        </div>
      </div>
    );

    return (
      <div className={`flex min-h-screen ${dk ? "bg-[#f0f0f0]" : "bg-gray-50"}`}>

        {/* Desktop sidebar */}
        <aside className={`hidden lg:flex flex-col w-56 flex-shrink-0 sticky top-0 h-screen overflow-hidden ${dk ? "bg-[#18181b]" : "bg-white border-r border-gray-200"}`}>
          <SidebarContent />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <aside className={`absolute left-0 top-0 bottom-0 w-56 shadow-2xl flex flex-col ${dk ? "bg-[#18181b]" : "bg-white"}`}>
              <div className={`flex items-center justify-between px-4 py-3 border-b ${dk ? "border-white/[0.08]" : "border-gray-100"}`}>
                <span className={`text-sm font-bold ${dk ? "text-white" : "text-gray-800"}`}>Settings</span>
                <button onClick={() => setSidebarOpen(false)} className={`p-1 rounded ${dk ? "hover:bg-white/10" : "hover:bg-gray-100"}`}>
                  <XCircleIcon className={`w-5 h-5 ${dk ? "text-white/40" : "text-gray-400"}`} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <SidebarContent />
              </div>
            </aside>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Sticky topbar */}
          <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center gap-3 flex-shrink-0 sticky top-0 z-10">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Settings2Icon className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-semibold text-gray-700">Company Settings</span>
              <span className="text-gray-300 text-sm">/</span>
              <span className="text-sm text-gray-500">{settingsSection === "details" ? "Company Details" : "Links"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {isOnboarding && (
                <button
                  onClick={() => navigate("/company-dashboard")}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                >
                  Go to Dashboard <ArrowRightIcon className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => navigate("/company-dashboard")}
                className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                <LayoutDashboardIcon className="w-3.5 h-3.5" /> Dashboard
              </button>
            </div>
          </header>

          {/* Onboarding banner */}
          {isOnboarding && (
            <div className="bg-indigo-600 text-white px-6 py-3.5 flex items-center gap-3">
              <BuildingIcon className="w-4 h-4 shrink-0 opacity-80" />
              <p className="text-sm flex-1">
                <span className="font-semibold">Welcome, {user?.name}!</span>
                {" "}Fill in your company profile so candidates know who you are.
              </p>
              <button
                onClick={() => navigate("/company-dashboard")}
                className="flex items-center gap-1 text-xs font-semibold text-white/70 hover:text-white transition-colors shrink-0"
              >
                Skip <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 p-6 lg:p-8 max-w-3xl">

            {/* Section header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {settingsSection === "details" ? "Company Details" : "Links & Presence"}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {settingsSection === "details"
                  ? "Your company name, tagline, description, location and industry."
                  : "Website and social links shown on your company profile."}
              </p>
            </div>

            {/* Company Details section */}
            {settingsSection === "details" && (
              <Card className="shadow-sm">
                <CardContent className="space-y-5 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company Name</Label>
                      <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Your company name" data-testid="input-profile-name" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Tagline</Label>
                      <Input value={profileForm.headline} onChange={e => setProfileForm(p => ({ ...p, headline: e.target.value }))} placeholder="e.g. Building the future of remote work" data-testid="input-profile-headline" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">About Us</Label>
                    <Textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell candidates what your company does, your culture, and what makes you unique..." rows={5} data-testid="textarea-profile-bio" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">HQ / Location</Label>
                      <Input value={profileForm.location} onChange={e => setProfileForm(p => ({ ...p, location: e.target.value }))} placeholder="e.g. San Francisco, CA (Remote-friendly)" data-testid="input-profile-location" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Industry</Label>
                      <Input value={profileForm.industry} onChange={e => setProfileForm(p => ({ ...p, industry: e.target.value }))} placeholder="e.g. Software, Fintech, HealthTech" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t">
                    {isOnboarding ? (
                      <>
                        <Button
                          onClick={() => saveProfile(() => navigate("/company-dashboard"))}
                          disabled={updateProfile.isPending}
                          className="gap-2"
                          data-testid="button-save-profile"
                        >
                          <SaveIcon className="w-4 h-4" />
                          {updateProfile.isPending ? "Saving…" : "Save & go to dashboard"}
                        </Button>
                        <button
                          type="button"
                          onClick={() => navigate("/company-dashboard")}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Skip for now
                        </button>
                      </>
                    ) : (
                      <>
                        <Button onClick={() => saveProfile()} disabled={updateProfile.isPending} className="gap-2" data-testid="button-save-profile">
                          <SaveIcon className="w-4 h-4" /> {updateProfile.isPending ? "Saving…" : "Save Details"}
                        </Button>
                        <p className="text-xs text-gray-400">Changes are visible on your public profile immediately.</p>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Links section */}
            {settingsSection === "links" && (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Essential Links</CardTitle>
                    <p className="text-xs text-gray-500">Shown prominently on your company profile page.</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Company Website</Label>
                      <Input value={profileForm.website} onChange={e => setProfileForm(p => ({ ...p, website: e.target.value }))} placeholder="https://yourcompany.com" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">LinkedIn Company Page</Label>
                      <Input value={profileForm.linkedinUrl} onChange={e => setProfileForm(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/company/..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">X (Twitter)</Label>
                      <Input value={profileForm.twitterUrl} onChange={e => setProfileForm(p => ({ ...p, twitterUrl: e.target.value }))} placeholder="https://x.com/..." />
                    </div>
                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Button onClick={() => saveProfile()} disabled={updateProfile.isPending} className="gap-2">
                        <SaveIcon className="w-4 h-4" /> {updateProfile.isPending ? "Saving…" : "Save Links"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Custom Links</CardTitle>
                    <p className="text-xs text-gray-500">Add Glassdoor, Crunchbase, job boards, or any other relevant links.</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profileForm.customLinks.length > 0 ? (
                      <div className="space-y-2">
                        {profileForm.customLinks.map((link, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50/60">
                            <LinkIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{link.label}</p>
                              <p className="text-xs text-gray-400 truncate">{link.url}</p>
                            </div>
                            <button
                              onClick={() => removeCustomLink(idx)}
                              className="shrink-0 p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center">
                        <LinkIcon className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                        <p className="text-sm text-gray-400">No custom links yet</p>
                      </div>
                    )}

                    <Separator />

                    <div className="flex gap-2">
                      <Input
                        value={newLink.label}
                        onChange={e => setNewLink(p => ({ ...p, label: e.target.value }))}
                        placeholder="Label (e.g. Glassdoor)"
                        className="w-36 shrink-0"
                        onKeyDown={e => { if (e.key === "Enter") addCustomLink(); }}
                      />
                      <Input
                        value={newLink.url}
                        onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
                        placeholder="https://..."
                        className="flex-1"
                        onKeyDown={e => { if (e.key === "Enter") addCustomLink(); }}
                      />
                      <Button variant="outline" onClick={addCustomLink} className="gap-1.5 shrink-0">
                        <PlusIcon className="w-4 h-4" /> Add
                      </Button>
                    </div>
                    {profileForm.customLinks.length > 0 && (
                      <div className="flex items-center gap-3 pt-1 border-t">
                        <Button onClick={() => saveProfile()} disabled={updateProfile.isPending} className="gap-2">
                          <SaveIcon className="w-4 h-4" /> {updateProfile.isPending ? "Saving…" : "Save Links"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

          </main>
        </div>
      </div>
    );
  }

  // ── Individual profile layout (with top nav via Layout) ─────────────────────
  return (
    <Layout>
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

              <Button onClick={() => saveProfile()} disabled={updateProfile.isPending} className="gap-2" data-testid="button-save-profile">
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
    </Layout>
  );
}

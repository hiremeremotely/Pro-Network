type ProfileCompletionFields = {
  avatarUrl?: string | null;
  headline?: string | null;
  location?: string | null;
  bio?: string | null;
};

export function getProfileCompletion(profile: ProfileCompletionFields, experienceCount: number) {
  const steps = [
    { label: "Add a profile photo", done: !!profile.avatarUrl },
    { label: "Write your headline", done: !!profile.headline?.trim() },
    { label: "Add your location", done: !!profile.location?.trim() },
    { label: "Write your about section", done: !!profile.bio?.trim() },
    { label: "Add work experience", done: experienceCount > 0 },
  ];
  const completed = steps.filter((step) => step.done).length;
  return {
    percentage: Math.round((completed / steps.length) * 100),
    completed,
    total: steps.length,
    nextStep: steps.find((step) => !step.done)?.label ?? null,
  };
}
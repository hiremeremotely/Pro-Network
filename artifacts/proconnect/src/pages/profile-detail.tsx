import { useParams, Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { LoadingState, ErrorState } from "@/components/loading-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MapPinIcon, GlobeIcon, GithubIcon, LinkedinIcon, TwitterIcon,
  GraduationCapIcon, BriefcaseIcon, FolderIcon, ZapIcon,
  ExternalLinkIcon, ArrowLeftIcon, PencilIcon
} from "lucide-react";

const CURRENT_PROFILE_ID = 1;

export default function ProfileDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id, 10);

  const { data: profile, isLoading, error, refetch } = useGetProfile(id, {
    query: { enabled: !!id, queryKey: getGetProfileQueryKey(id) }
  });

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  if (!profile) return null;

  const initials = profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
  const isCurrentUser = profile.id === CURRENT_PROFILE_ID;

  return (
    <div className="pb-24">
      {/* Cover */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        {profile.coverUrl && (
          <img src={profile.coverUrl} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      <div className="container mx-auto px-4">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="flex items-end gap-4">
              <Avatar className="w-28 h-28 border-4 border-background shadow-lg" data-testid="img-profile-avatar">
                {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.name} />}
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="mb-2">
                {profile.openToWork && (
                  <Badge className="bg-green-500/10 text-green-700 border-green-500/20 mb-2">Open to Work</Badge>
                )}
                <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-profile-name">{profile.name}</h1>
                <p className="text-muted-foreground font-medium">{profile.headline}</p>
              </div>
            </div>
            <div className="flex gap-3 mb-2">
              {isCurrentUser && (
                <Link href="/profile/edit">
                  <Button variant="outline" size="sm" className="gap-2">
                    <PencilIcon className="w-4 h-4" /> Edit Profile
                  </Button>
                </Link>
              )}
              <Link href="/profiles">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeftIcon className="w-4 h-4" /> Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="w-4 h-4 text-primary/70" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <GlobeIcon className="w-4 h-4 text-primary/70" />
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
                {profile.githubUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <GithubIcon className="w-4 h-4 text-primary/70" />
                    <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>
                  </div>
                )}
                {profile.linkedinUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkedinIcon className="w-4 h-4 text-primary/70" />
                    <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
                  </div>
                )}
                {profile.twitterUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <TwitterIcon className="w-4 h-4 text-primary/70" />
                    <a href={profile.twitterUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Twitter</a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ZapIcon className="w-4 h-4 text-primary" /> Skills
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {profile.skills.map((skill) => (
                    <Badge key={skill.id} variant="secondary" className="text-sm" data-testid={`badge-skill-${skill.id}`}>
                      {skill.name}
                      {skill.level && <span className="ml-1 text-xs text-muted-foreground">· {skill.level}</span>}
                    </Badge>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {profile.bio && (
              <div>
                <h2 className="text-lg font-semibold mb-3">About</h2>
                <p className="text-muted-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Experience */}
            {profile.experience && profile.experience.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <BriefcaseIcon className="w-5 h-5 text-primary" /> Experience
                </h2>
                <div className="space-y-6">
                  {profile.experience.map((exp, i) => (
                    <div key={exp.id} data-testid={`experience-item-${exp.id}`}>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center shrink-0 mt-1">
                          <BriefcaseIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{exp.title}</h3>
                              <p className="text-primary font-medium text-sm">{exp.company}</p>
                            </div>
                            {exp.remote && <Badge variant="outline" className="text-xs shrink-0">Remote</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.startDate} — {exp.current ? "Present" : (exp.endDate || "")}
                            {exp.location && ` · ${exp.location}`}
                          </p>
                          {exp.description && <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p>}
                        </div>
                      </div>
                      {i < profile.experience.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {profile.education && profile.education.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <GraduationCapIcon className="w-5 h-5 text-primary" /> Education
                </h2>
                <div className="space-y-5">
                  {profile.education.map((edu) => (
                    <div key={edu.id} className="flex gap-4" data-testid={`education-item-${edu.id}`}>
                      <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center shrink-0 mt-1">
                        <GraduationCapIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{edu.school}</h3>
                        {edu.degree && <p className="text-sm text-primary font-medium">{edu.degree}{edu.fieldOfStudy ? ` · ${edu.fieldOfStudy}` : ""}</p>}
                        <p className="text-xs text-muted-foreground">{edu.startYear} — {edu.endYear || "Present"}</p>
                        {edu.description && <p className="mt-1 text-sm text-muted-foreground">{edu.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Portfolio */}
            {profile.portfolio && profile.portfolio.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FolderIcon className="w-5 h-5 text-primary" /> Portfolio
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.portfolio.map((project) => (
                    <Card key={project.id} className="hover:border-primary/40 transition-colors" data-testid={`portfolio-item-${project.id}`}>
                      {project.imageUrl && (
                        <img src={project.imageUrl} alt={project.title} className="w-full h-32 object-cover rounded-t-lg" />
                      )}
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold">{project.title}</h3>
                          {project.projectUrl && (
                            <a href={project.projectUrl} target="_blank" rel="noopener noreferrer" className="text-primary shrink-0">
                              <ExternalLinkIcon className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                        {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
                        <div className="flex flex-wrap gap-1 mt-3">
                          {project.tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

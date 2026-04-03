import { Link } from "wouter";
import { MapPinIcon, BriefcaseIcon, BuildingIcon, GlobeIcon, GithubIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { Profile } from "@workspace/api-client-react";

interface ProfileCardProps {
  profile: Profile;
  featured?: boolean;
}

export function ProfileCard({ profile, featured }: ProfileCardProps) {
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <Link href={`/profiles/${profile.id}`}>
      <Card className={`h-full flex flex-col hover:border-primary/50 transition-all duration-300 hover:shadow-md cursor-pointer group ${featured ? 'border-primary/20 bg-primary/5' : ''}`} data-testid={`profile-card-${profile.id}`}>
        <CardHeader className="pb-4 relative overflow-hidden">
          {profile.coverUrl ? (
            <div className="absolute top-0 left-0 right-0 h-20 bg-cover bg-center" style={{ backgroundImage: `url(${profile.coverUrl})` }} />
          ) : (
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
          
          <div className="pt-10 flex justify-between items-start relative z-10">
            <Avatar className="w-20 h-20 border-4 border-background shadow-sm">
              {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.name} /> : null}
              <AvatarFallback className="text-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            {profile.openToWork && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-500/20">
                Open to Work
              </Badge>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 pb-4">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{profile.name}</h3>
          </div>
          <p className="text-sm text-muted-foreground font-medium mb-3 line-clamp-2">
            {profile.headline}
          </p>
          
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-primary/70" />
                <span>{profile.location}</span>
              </div>
            )}
            {/* Adding a placeholder for experience if we don't have it directly on the profile summary */}
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 flex justify-between items-center text-muted-foreground border-t mt-auto pt-4 border-border/50">
          <div className="flex gap-3">
            {profile.githubUrl && <GithubIcon className="w-4 h-4 hover:text-foreground transition-colors" />}
            {profile.linkedinUrl && <LinkedinIcon className="w-4 h-4 hover:text-foreground transition-colors" />}
            {profile.twitterUrl && <TwitterIcon className="w-4 h-4 hover:text-foreground transition-colors" />}
            {profile.website && <GlobeIcon className="w-4 h-4 hover:text-foreground transition-colors" />}
          </div>
          <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            View Profile <span className="transform group-hover:translate-x-1 transition-transform">→</span>
          </span>
        </CardFooter>
      </Card>
    </Link>
  );
}
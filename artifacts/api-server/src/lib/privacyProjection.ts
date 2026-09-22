import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db, connectionsTable, interestRequestsTable, profilesTable } from "@workspace/db";

export const RELEASE_FIELDS = ["identity", "contact", "currentEmployer", "socialLinks", "portfolio", "experience", "education", "skills"] as const;
export type ReleaseField = typeof RELEASE_FIELDS[number];

function publicScope(settings: Record<string, string> | null | undefined): Set<string> {
  return new Set(RELEASE_FIELDS.filter((field) => settings?.[field] === "public"));
}

/** Returns the fields this viewer may see. */
export async function companyReleaseScope(req: any, candidateId: number): Promise<Set<string>> {
  const viewerId = Number(req.session?.profileId);
  if (viewerId === candidateId || req.session?.isAdmin === true) return new Set(RELEASE_FIELDS);
  const [candidate] = await db.select({
    privacySettings: profilesTable.privacySettings,
  }).from(profilesTable).where(eq(profilesTable.id, candidateId));
  if (!candidate) return new Set();
  if (!viewerId) {
    return publicScope(candidate.privacySettings);
  }
  const [connection] = await db.select({ id: connectionsTable.id })
    .from(connectionsTable).where(and(
      eq(connectionsTable.status, "accepted"),
      or(
        and(eq(connectionsTable.followerId, viewerId), eq(connectionsTable.followingId, candidateId)),
        and(eq(connectionsTable.followerId, candidateId), eq(connectionsTable.followingId, viewerId)),
      ),
    )).limit(1);
  if (connection) return publicScope(candidate.privacySettings);
  const [viewer] = await db.select({ accountType: profilesTable.accountType })
    .from(profilesTable).where(eq(profilesTable.id, viewerId));
  if (viewer?.accountType !== "company") {
    return new Set(RELEASE_FIELDS.filter((field) => candidate.privacySettings?.[field] === "public"));
  }
  const [approved] = await db.select({ releaseScope: interestRequestsTable.releaseScope })
    .from(interestRequestsTable).where(and(
      eq(interestRequestsTable.companyProfileId, viewerId),
      eq(interestRequestsTable.candidateProfileId, candidateId),
      eq(interestRequestsTable.status, "approved"),
      isNull(interestRequestsTable.revokedAt),
      gt(interestRequestsTable.releaseExpiresAt, new Date()),
    )).orderBy(desc(interestRequestsTable.respondedAt)).limit(1);
  return new Set(approved?.releaseScope ?? []);
}

export async function canViewProfile(req: any, candidateId: number): Promise<boolean> {
  const viewerId = Number(req.session?.profileId);
  if (viewerId === candidateId || req.session?.isAdmin === true) return true;
  const [candidate] = await db.select({ discoveryEnabled: profilesTable.discoveryEnabled })
    .from(profilesTable).where(eq(profilesTable.id, candidateId));
  if (!candidate) return false;
  if (candidate.discoveryEnabled) return true;
  if (!viewerId) return false;
  const [connection] = await db.select({ id: connectionsTable.id }).from(connectionsTable).where(and(
    eq(connectionsTable.status, "accepted"),
    or(
      and(eq(connectionsTable.followerId, viewerId), eq(connectionsTable.followingId, candidateId)),
      and(eq(connectionsTable.followerId, candidateId), eq(connectionsTable.followingId, viewerId)),
    ),
  )).limit(1);
  if (connection) return true;
  const [activeRelease] = await db.select({ id: interestRequestsTable.id }).from(interestRequestsTable).where(and(
    eq(interestRequestsTable.companyProfileId, viewerId),
    eq(interestRequestsTable.candidateProfileId, candidateId),
    eq(interestRequestsTable.status, "approved"),
    isNull(interestRequestsTable.revokedAt),
    gt(interestRequestsTable.releaseExpiresAt, new Date()),
  )).limit(1);
  return Boolean(activeRelease);
}

export function anonymizedCandidate(candidateId: number) {
  return { id: candidateId, name: "Available professional", candidateLabel: "Professional candidate" };
}

export function projectProfileForScope(profile: any, scope: Set<string>) {
  const identity = scope.has("identity");
  const socialLinks = scope.has("socialLinks");
  return {
    id: profile.id,
    accountType: profile.accountType,
    name: identity ? profile.name : "Available professional",
    candidateLabel: identity ? undefined : "Professional candidate",
    headline: identity ? profile.headline : null,
    bio: identity ? profile.bio : null,
    location: identity ? profile.location : null,
    industry: identity ? profile.industry : null,
    avatarUrl: identity ? profile.avatarUrl : null,
    coverUrl: identity ? profile.coverUrl : null,
    interests: identity ? profile.interests : [],
    openToWork: identity ? profile.openToWork : false,
    email: scope.has("contact") ? profile.email ?? null : null,
    website: socialLinks ? profile.website : null,
    linkedinUrl: socialLinks ? profile.linkedinUrl : null,
    githubUrl: socialLinks ? profile.githubUrl : null,
    twitterUrl: socialLinks ? profile.twitterUrl : null,
    indeedUrl: socialLinks ? profile.indeedUrl : null,
    glassdoorUrl: socialLinks ? profile.glassdoorUrl : null,
    wellfoundUrl: socialLinks ? profile.wellfoundUrl : null,
    angellistUrl: socialLinks ? profile.angellistUrl : null,
    customLinks: socialLinks ? profile.customLinks : [],
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export function projectExperienceForScope(rows: any[], scope: Set<string>) {
  if (!scope.has("experience")) {
    return scope.has("currentEmployer") ? rows.filter((row) => row.current) : [];
  }
  if (scope.has("currentEmployer")) return rows;
  return rows.map((row) => row.current
    ? { ...row, company: "Withheld", location: null }
    : row
  );
}
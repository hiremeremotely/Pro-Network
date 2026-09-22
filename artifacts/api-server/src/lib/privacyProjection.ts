import { and, eq } from "drizzle-orm";
import { db, interestRequestsTable, profilesTable } from "@workspace/db";

export const RELEASE_FIELDS = ["identity", "contact", "currentEmployer", "socialLinks", "portfolio", "experience", "education", "skills"] as const;
export type ReleaseField = typeof RELEASE_FIELDS[number];

/** Returns null for owner/HMR/non-company viewers; company/public callers get a
 * field set. This is the single authorization primitive used by profile data
 * routes so child resources cannot accidentally bypass HMR privacy. */
export async function companyReleaseScope(req: any, candidateId: number): Promise<Set<string> | null> {
  const viewerId = Number(req.session?.profileId);
  if (!viewerId || viewerId === candidateId || req.session?.isAdmin === true) return null;
  const [viewer] = await db.select({ accountType: profilesTable.accountType })
    .from(profilesTable).where(eq(profilesTable.id, viewerId));
  if (viewer?.accountType !== "company") return null;
  const [approved] = await db.select({ releaseScope: interestRequestsTable.releaseScope })
    .from(interestRequestsTable).where(and(
      eq(interestRequestsTable.companyProfileId, viewerId),
      eq(interestRequestsTable.candidateProfileId, candidateId),
      eq(interestRequestsTable.status, "approved"),
    )).orderBy(interestRequestsTable.respondedAt).limit(1);
  return new Set(approved?.releaseScope ?? []);
}

export function anonymizedCandidate(candidateId: number, headline?: string | null, industry?: string | null, location?: string | null) {
  return { id: candidateId, name: "Available professional", candidateLabel: "Professional candidate", headline: headline ?? null, industry: industry ?? null, location: location ?? null };
}
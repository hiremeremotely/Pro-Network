import { Router, type IRouter } from "express";
import { and, eq, ilike, ne, or, sql, inArray } from "drizzle-orm";
import {
  db, profilesTable, educationTable, experienceTable, portfolioTable, skillsTable,
  applicationsTable, externalApplicationsTable, postsTable, postReactionsTable, postCommentsTable, connectionsTable,
  bookmarksTable, interestRequestsTable, jobsTable,
  notificationsTable, conversationsTable, messagesTable, conversationMembersTable,
} from "@workspace/db";
import {
  CreateProfileBody,
  UpdateProfileBody,
  GetProfileParams,
  UpdateProfileParams,
  DeleteProfileParams,
  ListProfilesQueryParams,
} from "@workspace/api-zod";
import { companyReleaseScope, canViewProfile, hasApprovedFieldRelease, projectExperienceForScope, projectProfileForScope } from "../lib/privacyProjection";
import { rowsForPortfolioViewer } from "./portfolio-rules";

const router: IRouter = Router();

function ownerId(req: any): number | null {
  return req.session?.profileId ? Number(req.session.profileId) : null;
}

// Privacy and import-source state are intentionally owner-only. Source metadata
// contains URLs and labels, never provider credentials or access tokens.
router.get("/profiles/me/privacy", async (req, res): Promise<void> => {
  const id = ownerId(req);
  if (!id) { res.status(401).json({ error: "Authentication required" }); return; }
  const [profile] = await db.select({
    privacySettings: profilesTable.privacySettings,
    discoveryEnabled: profilesTable.discoveryEnabled,
    sourceMetadata: profilesTable.sourceMetadata,
  }).from(profilesTable).where(eq(profilesTable.id, id));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }
  res.json(profile);
});

router.put("/profiles/me/privacy", async (req, res): Promise<void> => {
  const id = ownerId(req);
  if (!id) { res.status(401).json({ error: "Authentication required" }); return; }
  const allowed = new Set(["public", "hmr", "private"]);
  const settings = req.body?.privacySettings;
  if (settings && (typeof settings !== "object" || Object.entries(settings).some(([key, value]) =>
    !["identity", "contact", "currentEmployer", "socialLinks", "portfolio", "experience", "education", "skills"].includes(key) ||
    !allowed.has(String(value))
  ))) {
    res.status(400).json({ error: "privacySettings contains an invalid field or visibility" }); return;
  }
  const sources = req.body?.sourceMetadata;
  if (sources !== undefined && (typeof sources !== "object" || Array.isArray(sources))) {
    res.status(400).json({ error: "sourceMetadata must be an object" }); return;
  }
  const [updated] = await db.update(profilesTable).set({
    ...(settings ? { privacySettings: settings } : {}),
    ...(typeof req.body?.discoveryEnabled === "boolean" ? { discoveryEnabled: req.body.discoveryEnabled } : {}),
    ...(sources ? { sourceMetadata: sources } : {}),
    updatedAt: new Date(),
  }).where(eq(profilesTable.id, id)).returning({
    privacySettings: profilesTable.privacySettings,
    discoveryEnabled: profilesTable.discoveryEnabled,
    sourceMetadata: profilesTable.sourceMetadata,
  });
  res.json(updated);
});

// Columns that are safe to return in any profile response.
// Sensitive auth fields (passwordHash, tokens, etc.) are deliberately excluded.
const publicProfileColumns = {
  id: profilesTable.id,
  accountType: profilesTable.accountType,
  email: profilesTable.email,
  name: profilesTable.name,
  headline: profilesTable.headline,
  bio: profilesTable.bio,
  location: profilesTable.location,
  industry: profilesTable.industry,
  avatarUrl: profilesTable.avatarUrl,
  coverUrl: profilesTable.coverUrl,
  website: profilesTable.website,
  linkedinUrl: profilesTable.linkedinUrl,
  githubUrl: profilesTable.githubUrl,
  twitterUrl: profilesTable.twitterUrl,
  interests: profilesTable.interests,
  openToWork: profilesTable.openToWork,
  indeedUrl: profilesTable.indeedUrl,
  glassdoorUrl: profilesTable.glassdoorUrl,
  wellfoundUrl: profilesTable.wellfoundUrl,
  angellistUrl: profilesTable.angellistUrl,
  customLinks: profilesTable.customLinks,
  createdAt: profilesTable.createdAt,
  updatedAt: profilesTable.updatedAt,
};

function profileDto(profile: typeof profilesTable.$inferSelect, includeEmail = false) {
  const {
    passwordHash: _passwordHash, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry,
    emailVerificationToken: _emailVerificationToken,
    emailVerificationTokenExpiry: _emailVerificationTokenExpiry,
    gmailToken: _gmailToken, outlookToken: _outlookToken,
    email: _email, ...safe
  } = profile;
  return { ...safe, email: includeEmail ? profile.email : null };
}

router.get("/profiles", async (req, res): Promise<void> => {
  const query = ListProfilesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { search, limit = 20, offset = 0 } = query.data;

  // Extra filters (read directly — not in generated Zod schema)
  const excludeIdRaw = req.query.excludeId as string | undefined;
  const excludeId    = excludeIdRaw ? Number(excludeIdRaw) : undefined;
  const accountTypeFilter  = req.query.accountType as string | undefined;
  const openToWorkRaw      = req.query.openToWork as string | undefined;
  const openToWorkFilter   = openToWorkRaw === "true" ? true : openToWorkRaw === "false" ? false : undefined;
  const industryFilter     = req.query.industry as string | undefined;
  const locationFilter     = req.query.location as string | undefined;
  const skillsFilter       = req.query.skills as string | undefined; // comma-separated names

  const clauses = [];

  if (search) {
    clauses.push(
      and(
        or(
          ne(profilesTable.accountType, "individual"),
          sql`${profilesTable.privacySettings}->>'identity' = 'public'`,
        ),
        or(
          ilike(profilesTable.name, `%${search}%`),
          ilike(profilesTable.headline, `%${search}%`),
          ilike(profilesTable.location, `%${search}%`),
        )!,
      )!
    );
  }

  if (excludeId) clauses.push(ne(profilesTable.id, excludeId));
  clauses.push(eq(profilesTable.discoveryEnabled, true));
  if (accountTypeFilter) clauses.push(eq(profilesTable.accountType, accountTypeFilter));
  if (openToWorkFilter !== undefined) clauses.push(and(
    eq(profilesTable.openToWork, openToWorkFilter),
    sql`${profilesTable.privacySettings}->>'identity' = 'public'`,
  )!);
  if (industryFilter) clauses.push(and(
    eq(profilesTable.industry, industryFilter),
    sql`${profilesTable.privacySettings}->>'identity' = 'public'`,
  )!);
  if (locationFilter) clauses.push(and(
    ilike(profilesTable.location, `%${locationFilter}%`),
    sql`${profilesTable.privacySettings}->>'identity' = 'public'`,
  )!);

  let profileIds: number[] | null = null;
  if (skillsFilter) {
    const skillNames = skillsFilter.split(",").map(s => s.trim()).filter(Boolean);
    if (skillNames.length > 0) {
      const skillRows = await db
        .select({ profileId: skillsTable.profileId })
        .from(skillsTable)
        .where(
          or(...skillNames.map(n => ilike(skillsTable.name, `%${n}%`)))!
        );
      profileIds = [...new Set(skillRows.map(r => r.profileId))];
      if (profileIds.length === 0) {
        res.json({ profiles: [], total: 0 });
        return;
      }
      clauses.push(inArray(profilesTable.id, profileIds));
      clauses.push(sql`${profilesTable.privacySettings}->>'skills' = 'public'`);
    }
  }

  const whereClause = clauses.length === 1
    ? clauses[0]
    : clauses.length > 1
      ? and(...clauses)
      : undefined;

  const [profiles, countResult] = await Promise.all([
    db.select(publicProfileColumns).from(profilesTable).where(whereClause).limit(limit).offset(offset).orderBy(profilesTable.createdAt),
    db.select({ count: sql<number>`count(*)` }).from(profilesTable).where(whereClause),
  ]);

  const responseProfiles = await Promise.all(profiles.map(async (p) => {
    if (p.accountType !== "individual") return { ...p, email: null };
    const scope = await companyReleaseScope(req, p.id);
    return projectProfileForScope(p, scope);
  }));
  res.json({ profiles: responseProfiles, total: Number(countResult[0]?.count ?? 0) });
});

router.post("/profiles", async (req, res): Promise<void> => {
  const parsed = CreateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [profile] = await db.insert(profilesTable).values({
    ...parsed.data,
    openToWork: parsed.data.openToWork ?? false,
  }).returning();
  res.status(201).json(profileDto(profile, true));
});

router.get("/profiles/:id", async (req, res): Promise<void> => {
  const params = GetProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [profile] = await db.select(publicProfileColumns).from(profilesTable).where(eq(profilesTable.id, params.data.id));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  if (!(await canViewProfile(req, params.data.id))) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const isOwner = req.session.profileId === params.data.id;
  const scope = await companyReleaseScope(req, params.data.id);
  const isOwnerOrAdmin = isOwner || req.session?.isAdmin === true;
  const approvedSources = profile.accountType === "company" || await hasApprovedFieldRelease(req, params.data.id, ["identity", "socialLinks"]);
  const [education, experience, portfolio, skills] = await Promise.all([
    db.select().from(educationTable).where(eq(educationTable.profileId, params.data.id)),
    db.select().from(experienceTable).where(eq(experienceTable.profileId, params.data.id)),
    db.select().from(portfolioTable).where(
        isOwnerOrAdmin
        ? eq(portfolioTable.profileId, params.data.id)
        : and(eq(portfolioTable.profileId, params.data.id), eq(portfolioTable.visibility, "public"))
    ),
    db.select().from(skillsTable).where(eq(skillsTable.profileId, params.data.id)),
  ]);

  res.json({
    ...projectProfileForScope(profile, scope, approvedSources),
    education: scope.has("education") ? education : [],
    experience: projectExperienceForScope(experience, scope),
    portfolio: scope.has("portfolio") ? rowsForPortfolioViewer(portfolio, isOwner, approvedSources && scope.has("portfolio")) : [],
    skills: scope.has("skills") ? skills : [],
  });
});

router.put("/profiles/:id", async (req, res): Promise<void> => {
  const params = UpdateProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (req.session.profileId !== params.data.id) {
    res.status(403).json({ error: "You may only update your own profile." });
    return;
  }
  const [profile] = await db.update(profilesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profilesTable.id, params.data.id))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(profileDto(profile, true));
});

router.delete("/profiles/:id", async (req, res): Promise<void> => {
  const params = DeleteProfileParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (req.session.profileId !== params.data.id) {
    res.status(403).json({ error: "You may only delete your own profile." });
    return;
  }

  await db.transaction(async (tx) => {
    const profileId = params.data.id;
    // Remove records without profile foreign keys and records that can contain
    // personal content before deleting the profile itself.
    await tx.delete(externalApplicationsTable).where(eq(externalApplicationsTable.profileId, profileId));
    await tx.delete(applicationsTable).where(eq(applicationsTable.profileId, profileId));
    await tx.delete(postsTable).where(eq(postsTable.profileId, profileId));
    await tx.delete(postReactionsTable).where(eq(postReactionsTable.profileId, profileId));
    await tx.delete(postCommentsTable).where(eq(postCommentsTable.profileId, profileId));
    await tx.delete(connectionsTable).where(or(eq(connectionsTable.followerId, profileId), eq(connectionsTable.followingId, profileId)));
    await tx.delete(bookmarksTable).where(eq(bookmarksTable.profileId, profileId));
    await tx.delete(interestRequestsTable).where(or(eq(interestRequestsTable.companyProfileId, profileId), eq(interestRequestsTable.candidateProfileId, profileId)));
    await tx.delete(notificationsTable).where(or(eq(notificationsTable.recipientProfileId, profileId), eq(notificationsTable.actorProfileId, profileId)));
    const conversations = await tx.select({ id: conversationsTable.id })
      .from(conversationsTable)
      .where(or(eq(conversationsTable.participant1Id, profileId), eq(conversationsTable.participant2Id, profileId)));
    if (conversations.length) {
      const conversationIds = conversations.map((c) => c.id);
      await tx.delete(messagesTable).where(inArray(messagesTable.conversationId, conversationIds));
      await tx.delete(conversationMembersTable).where(inArray(conversationMembersTable.conversationId, conversationIds));
      await tx.delete(conversationsTable).where(inArray(conversationsTable.id, conversationIds));
    }
    await tx.delete(messagesTable).where(eq(messagesTable.senderProfileId, profileId));
    await tx.delete(conversationMembersTable).where(eq(conversationMembersTable.profileId, profileId));
    // Jobs remain visible as historical listings, but no longer point to a
    // deleted company account.
    await tx.update(jobsTable).set({ companyProfileId: null }).where(eq(jobsTable.companyProfileId, profileId));
    await tx.delete(profilesTable).where(eq(profilesTable.id, profileId));
  });
  req.session.destroy(() => {
    res.clearCookie("hmr.sid");
    res.sendStatus(204);
  });
});

export default router;

import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  profilesTable,
  skillsTable,
  experienceTable,
  educationTable,
  jobsTable,
  applicationsTable,
  postsTable,
} from "./schema/index.js";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("rds.amazonaws.com")
    ? { rejectUnauthorized: false }
    : false,
});

const db = drizzle(pool);

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "hmr_salt_2026").digest("hex");
}

const DEMO_PASSWORD = hashPassword("Demo@2026");

async function seed() {
  console.log("🌱 Starting seed...");

  console.log("  → Clearing existing data...");
  await db.delete(applicationsTable);
  await db.delete(postsTable);
  await db.delete(skillsTable);
  await db.delete(experienceTable);
  await db.delete(educationTable);
  await db.delete(jobsTable);
  await db.delete(profilesTable);

  console.log("  → Seeding profiles...");

  const [alex] = await db.insert(profilesTable).values({
    accountType: "individual",
    name: "Alex Chen",
    email: "alex@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "Full-Stack Engineer · React · Node.js · Open to Remote",
    bio: "Passionate engineer with 6+ years building scalable web products. I love clean architecture and shipping things that matter.",
    location: "San Francisco, CA",
    industry: "Technology",
    website: "https://alexchen.dev",
    githubUrl: "https://github.com/alexchen",
    twitterUrl: "https://twitter.com/alexchen",
    interests: ["React", "Node.js", "TypeScript", "Open Source"],
    openToWork: true,
    emailVerified: true,
  }).returning();

  const [maria] = await db.insert(profilesTable).values({
    accountType: "individual",
    name: "Maria Santos",
    email: "maria@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "Product Designer · UX/UI · Figma · Remote-first",
    bio: "Designer who bridges business goals and user needs. 5 years of experience in SaaS products and design systems.",
    location: "Lisbon, Portugal",
    industry: "Design",
    website: "https://mariasantos.design",
    linkedinUrl: "https://linkedin.com/in/mariasantos",
    interests: ["UX Research", "Design Systems", "Figma", "Accessibility"],
    openToWork: true,
    emailVerified: true,
  }).returning();

  const [james] = await db.insert(profilesTable).values({
    accountType: "individual",
    name: "James Okafor",
    email: "james@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "DevOps & Cloud Engineer · AWS · Kubernetes · CI/CD",
    bio: "Cloud infrastructure specialist focused on reliability, automation, and developer experience. AWS certified.",
    location: "Lagos, Nigeria",
    industry: "Technology",
    githubUrl: "https://github.com/jamesokafor",
    interests: ["AWS", "Kubernetes", "Terraform", "DevOps"],
    openToWork: false,
    emailVerified: true,
  }).returning();

  const [streamline] = await db.insert(profilesTable).values({
    accountType: "company",
    name: "Streamline",
    email: "streamline@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "Project management software for remote teams",
    bio: "Streamline helps distributed teams stay in sync with async-first workflows, real-time collaboration tools, and smart task automation.",
    location: "Remote",
    industry: "SaaS / Productivity",
    website: "https://streamline.io",
    twitterUrl: "https://twitter.com/streamlineapp",
    interests: ["Productivity", "Remote Work", "SaaS"],
    openToWork: false,
    emailVerified: true,
  }).returning();

  const [deployly] = await db.insert(profilesTable).values({
    accountType: "company",
    name: "Deployly",
    email: "deployly@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "One-click deployments for modern engineering teams",
    bio: "Deployly is a cloud deployment platform that makes shipping software fast, safe, and observable. Trusted by 10,000+ developers.",
    location: "Remote",
    industry: "DevOps / Cloud",
    website: "https://deployly.com",
    githubUrl: "https://github.com/deployly",
    interests: ["DevOps", "Cloud", "CI/CD"],
    openToWork: false,
    emailVerified: true,
  }).returning();

  const [pixelcraft] = await db.insert(profilesTable).values({
    accountType: "company",
    name: "Pixelcraft",
    email: "pixelcraft@demo.com",
    passwordHash: DEMO_PASSWORD,
    headline: "Design tools built for the next generation of creators",
    bio: "Pixelcraft builds collaborative design and prototyping software. Our mission: make great design accessible to every team.",
    location: "Remote",
    industry: "Design / SaaS",
    website: "https://pixelcraft.app",
    twitterUrl: "https://twitter.com/pixelcraftapp",
    interests: ["Design", "Figma Alternative", "Collaboration"],
    openToWork: false,
    emailVerified: true,
  }).returning();

  console.log("  → Seeding skills...");

  await db.insert(skillsTable).values([
    { profileId: alex.id, name: "TypeScript", level: "Expert" },
    { profileId: alex.id, name: "React", level: "Expert" },
    { profileId: alex.id, name: "Node.js", level: "Expert" },
    { profileId: alex.id, name: "PostgreSQL", level: "Advanced" },
    { profileId: alex.id, name: "Docker", level: "Intermediate" },
    { profileId: maria.id, name: "Figma", level: "Expert" },
    { profileId: maria.id, name: "UX Research", level: "Expert" },
    { profileId: maria.id, name: "Design Systems", level: "Advanced" },
    { profileId: maria.id, name: "Prototyping", level: "Advanced" },
    { profileId: maria.id, name: "Accessibility (WCAG)", level: "Intermediate" },
    { profileId: james.id, name: "AWS", level: "Expert" },
    { profileId: james.id, name: "Kubernetes", level: "Advanced" },
    { profileId: james.id, name: "Terraform", level: "Advanced" },
    { profileId: james.id, name: "Docker", level: "Expert" },
    { profileId: james.id, name: "GitHub Actions", level: "Advanced" },
  ]);

  console.log("  → Seeding experience...");

  await db.insert(experienceTable).values([
    {
      profileId: alex.id,
      company: "Streamline",
      title: "Senior Full-Stack Engineer",
      location: "Remote",
      remote: true,
      startDate: "2022-03",
      current: true,
      description: "Led frontend architecture migration from CRA to Vite+React, reduced bundle size by 40%. Built real-time collaboration features used by 50k+ users.",
    },
    {
      profileId: alex.id,
      company: "Acme Corp",
      title: "Mid-Level Software Engineer",
      location: "San Francisco, CA",
      remote: false,
      startDate: "2019-06",
      endDate: "2022-02",
      current: false,
      description: "Built internal tooling and APIs for logistics automation platform.",
    },
    {
      profileId: maria.id,
      company: "Pixelcraft",
      title: "Lead Product Designer",
      location: "Remote",
      remote: true,
      startDate: "2021-09",
      current: true,
      description: "Owns the end-to-end design process for the core editor. Established the company design system used across 5 product areas.",
    },
    {
      profileId: maria.id,
      company: "Freelance",
      title: "UX/UI Designer",
      location: "Lisbon, Portugal",
      remote: true,
      startDate: "2019-01",
      endDate: "2021-08",
      current: false,
      description: "Worked with 15+ startups on product design, user research, and brand identity.",
    },
    {
      profileId: james.id,
      company: "Deployly",
      title: "Senior DevOps Engineer",
      location: "Remote",
      remote: true,
      startDate: "2020-11",
      current: true,
      description: "Owns infrastructure for Deployly's multi-region Kubernetes clusters serving 10M+ deploys/month. Reduced cloud spend by 30% through spot instance optimization.",
    },
  ]);

  console.log("  → Seeding education...");

  await db.insert(educationTable).values([
    {
      profileId: alex.id,
      school: "UC Berkeley",
      degree: "B.Sc.",
      fieldOfStudy: "Computer Science",
      startYear: 2015,
      endYear: 2019,
    },
    {
      profileId: maria.id,
      school: "IADE – Creative University",
      degree: "M.A.",
      fieldOfStudy: "Communication Design",
      startYear: 2016,
      endYear: 2019,
    },
    {
      profileId: james.id,
      school: "University of Lagos",
      degree: "B.Eng.",
      fieldOfStudy: "Computer Engineering",
      startYear: 2013,
      endYear: 2017,
    },
  ]);

  console.log("  → Seeding jobs...");

  const [job1] = await db.insert(jobsTable).values({
    companyProfileId: streamline.id,
    title: "Senior Frontend Engineer",
    company: "Streamline",
    location: "Remote · Worldwide",
    description: "We're looking for a Senior Frontend Engineer to join our core product team. You'll own key parts of our React application, work closely with design and backend, and help shape our frontend architecture.\n\n**Responsibilities:**\n- Build and maintain high-quality React components and features\n- Drive performance improvements across the application\n- Collaborate with design on our component library\n- Mentor junior engineers on the team\n\n**Requirements:**\n- 4+ years of experience with React and TypeScript\n- Strong understanding of web performance and accessibility\n- Experience with remote-first teams\n- Excellent async communication skills",
    category: "Engineering",
    experienceLevel: "Senior",
    salaryMin: 120000,
    salaryMax: 160000,
    currency: "USD",
    tags: ["React", "TypeScript", "Remote", "Full-time"],
    featured: true,
  }).returning();

  const [job2] = await db.insert(jobsTable).values({
    companyProfileId: streamline.id,
    title: "Backend Engineer – Node.js",
    company: "Streamline",
    location: "Remote · Americas / Europe",
    description: "Join our backend team to build the APIs and services powering Streamline's collaboration features.\n\n**Responsibilities:**\n- Design and build RESTful APIs with Node.js and TypeScript\n- Optimize database queries and improve system performance\n- Work on real-time features using WebSockets\n- Participate in on-call rotation\n\n**Requirements:**\n- 3+ years with Node.js and PostgreSQL\n- Experience with microservices architecture\n- Familiarity with AWS or GCP",
    category: "Engineering",
    experienceLevel: "Mid",
    salaryMin: 100000,
    salaryMax: 130000,
    currency: "USD",
    tags: ["Node.js", "PostgreSQL", "Remote", "Full-time"],
    featured: false,
  }).returning();

  const [job3] = await db.insert(jobsTable).values({
    companyProfileId: deployly.id,
    title: "DevOps Engineer",
    company: "Deployly",
    location: "Remote · Worldwide",
    description: "Help us scale the infrastructure behind millions of deployments per day.\n\n**Responsibilities:**\n- Manage and evolve our Kubernetes clusters across 3 regions\n- Build internal tooling for deployment pipelines\n- Improve observability with metrics, logging, and tracing\n- Respond to incidents and drive post-mortems\n\n**Requirements:**\n- 3+ years in a DevOps or platform engineering role\n- Strong Kubernetes and Terraform experience\n- Proficiency with AWS\n- Experience with GitHub Actions or similar CI/CD tools",
    category: "DevOps",
    experienceLevel: "Mid",
    salaryMin: 110000,
    salaryMax: 145000,
    currency: "USD",
    tags: ["Kubernetes", "AWS", "Terraform", "Remote", "Full-time"],
    featured: true,
  }).returning();

  const [job4] = await db.insert(jobsTable).values({
    companyProfileId: deployly.id,
    title: "Site Reliability Engineer",
    company: "Deployly",
    location: "Remote · Europe preferred",
    description: "Own reliability for Deployly's platform and drive SLO compliance across all services.\n\n**Responsibilities:**\n- Define and track SLOs/SLAs for critical systems\n- Automate toil and build self-healing systems\n- Partner with product engineering on reliability initiatives\n\n**Requirements:**\n- 5+ years in SRE or platform engineering\n- Strong scripting skills (Python or Go)\n- Experience with observability stacks (Prometheus, Grafana, DataDog)",
    category: "DevOps",
    experienceLevel: "Senior",
    salaryMin: 130000,
    salaryMax: 170000,
    currency: "USD",
    tags: ["SRE", "Kubernetes", "Prometheus", "Remote", "Full-time"],
    featured: false,
  }).returning();

  const [job5] = await db.insert(jobsTable).values({
    companyProfileId: pixelcraft.id,
    title: "Product Designer",
    company: "Pixelcraft",
    location: "Remote · Worldwide",
    description: "Shape the future of collaborative design tooling as a Product Designer at Pixelcraft.\n\n**Responsibilities:**\n- Own design end-to-end for one of our core product areas\n- Conduct user research and usability testing\n- Collaborate closely with engineering on implementation\n- Contribute to and maintain our design system\n\n**Requirements:**\n- 3+ years of product design experience in SaaS\n- Expert-level Figma skills\n- Strong portfolio demonstrating complex UI/UX work\n- Experience with design systems",
    category: "Design",
    experienceLevel: "Mid",
    salaryMin: 90000,
    salaryMax: 120000,
    currency: "USD",
    tags: ["Figma", "UX", "Remote", "Full-time"],
    featured: true,
  }).returning();

  const [job6] = await db.insert(jobsTable).values({
    companyProfileId: pixelcraft.id,
    title: "Design Systems Engineer",
    company: "Pixelcraft",
    location: "Remote · Americas",
    description: "Bridge design and engineering by owning our design system infrastructure.\n\n**Responsibilities:**\n- Build and maintain our React component library\n- Work with designers on token systems and theming\n- Write documentation and drive adoption across teams\n\n**Requirements:**\n- 3+ years of frontend or design systems experience\n- Proficiency in React, TypeScript, and CSS\n- Eye for design and passion for developer experience",
    category: "Engineering",
    experienceLevel: "Mid",
    salaryMin: 100000,
    salaryMax: 135000,
    currency: "USD",
    tags: ["React", "Design Systems", "TypeScript", "Remote"],
    featured: false,
  }).returning();

  const [job7] = await db.insert(jobsTable).values({
    companyProfileId: streamline.id,
    title: "Product Manager – Core Experience",
    company: "Streamline",
    location: "Remote · Americas / Europe",
    description: "Lead the product direction for Streamline's core collaboration experience.\n\n**Responsibilities:**\n- Define and own the roadmap for task management and real-time collaboration\n- Work cross-functionally with design, engineering, and GTM\n- Run discovery, write specs, and ship high-impact features\n\n**Requirements:**\n- 4+ years of product management in B2B SaaS\n- Experience with async/remote product development\n- Strong written communication skills",
    category: "Product",
    experienceLevel: "Senior",
    salaryMin: 125000,
    salaryMax: 155000,
    currency: "USD",
    tags: ["Product Management", "SaaS", "Remote", "Full-time"],
    featured: false,
  }).returning();

  const [job8] = await db.insert(jobsTable).values({
    companyProfileId: deployly.id,
    title: "Developer Advocate",
    company: "Deployly",
    location: "Remote · Worldwide",
    description: "Be the voice of Deployly in the developer community and help engineers get the most out of our platform.\n\n**Responsibilities:**\n- Create technical content (blog posts, videos, tutorials)\n- Speak at conferences and meetups\n- Gather developer feedback and relay it to product\n- Build sample projects and integrations\n\n**Requirements:**\n- 2+ years of software engineering experience\n- Excellent written and verbal communication\n- Active presence in the developer community\n- Experience with CI/CD tools",
    category: "Marketing",
    experienceLevel: "Mid",
    salaryMin: 95000,
    salaryMax: 125000,
    currency: "USD",
    tags: ["Developer Relations", "DevOps", "Remote", "Full-time"],
    featured: false,
  }).returning();

  console.log("  → Seeding posts...");

  await db.insert(postsTable).values([
    {
      profileId: alex.id,
      content: "Just shipped a major performance improvement to our React app — reduced Time to Interactive by 42% using lazy loading and better code splitting. Remote work tip: always record a short Loom walkthrough when you ship something big. Async communication is everything. 🚀\n\n#RemoteWork #React #WebPerformance",
      visibility: "public",
    },
    {
      profileId: maria.id,
      content: "Hot take: the best design system is the one your engineers actually use. 🎨\n\nAfter 6 months building Pixelcraft's new component library, the biggest lesson wasn't about tokens or theming — it was about documentation and adoption. Ship the docs before you ship the components.\n\n#DesignSystems #UX #RemoteWork",
      visibility: "public",
    },
    {
      profileId: james.id,
      content: "Reduced our AWS bill by 31% last quarter. Here's what actually worked:\n\n1. Spot instances for stateless workloads (Kubernetes node groups)\n2. S3 Intelligent-Tiering for logs\n3. Right-sizing over-provisioned RDS instances\n4. Reserved capacity for predictable baseline load\n\nNone of it was magic — just discipline and visibility into costs. CloudWatch + Cost Explorer is underrated.\n\n#AWS #CloudCost #DevOps",
      visibility: "public",
    },
    {
      profileId: streamline.id,
      content: "We're hiring! 🎉\n\nStreamline is growing our engineering team and we're looking for:\n- Senior Frontend Engineer (React/TypeScript)\n- Backend Engineer (Node.js)\n- Product Manager – Core Experience\n\nAll roles are fully remote, competitive salaries, async-first culture. Check out open positions at streamline.io/careers or apply directly here on Hire Me Remotely.\n\n#Hiring #RemoteJobs #Startup",
      visibility: "public",
    },
    {
      profileId: deployly.id,
      content: "Deployly just crossed 10 million deployments per month 🎊\n\nWhen we started, 10M felt impossibly far away. Now it's just Tuesday.\n\nThank you to every engineer who trusted us with their deploys. We're just getting started.\n\n#Milestone #DevOps #Startups",
      visibility: "public",
    },
    {
      profileId: alex.id,
      content: "Unpopular opinion: TypeScript's `strict` mode should be the default for every new project, no exceptions.\n\nI've never regretted turning it on. I've definitely regretted leaving it off.\n\n#TypeScript #WebDev #JavaScript",
      visibility: "public",
    },
  ]);

  console.log("  → Seeding applications...");

  await db.insert(applicationsTable).values([
    {
      jobId: job3.id,
      profileId: james.id,
      coverLetter: "I've been following Deployly's growth closely and would love to bring my Kubernetes and AWS expertise to help scale your infrastructure further.",
      status: "pending",
    },
    {
      jobId: job5.id,
      profileId: maria.id,
      coverLetter: "Pixelcraft's mission resonates deeply with me. I've spent the past 3 years as a lead designer in design tooling and would love to contribute.",
      status: "reviewing",
    },
    {
      jobId: job1.id,
      profileId: alex.id,
      coverLetter: "I've been a Streamline power user for two years and would love to help build the product I rely on every day.",
      status: "pending",
    },
  ]);

  await pool.end();
  console.log("✅ Seed complete!");
  console.log(`   Profiles: 6 (3 individual, 3 company)`);
  console.log(`   Jobs:     8`);
  console.log(`   Posts:    6`);
  console.log(`   Applications: 3`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

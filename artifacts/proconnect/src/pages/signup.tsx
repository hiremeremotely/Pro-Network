import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAppAuth } from "@/contexts/app-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  EyeIcon, EyeOffIcon, AlertCircleIcon,
  UserIcon, BuildingIcon, CheckIcon, ChevronDownIcon, SearchIcon,
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";

// ── Consumer domain blocklist (mirrors server-side list) ─────────────────────

const CONSUMER_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.co.in", "yahoo.fr", "yahoo.de", "yahoo.es", "yahoo.it",
  "hotmail.com", "hotmail.co.uk", "hotmail.fr", "hotmail.de", "hotmail.es", "hotmail.it",
  "outlook.com", "outlook.co.uk", "outlook.fr", "outlook.de",
  "live.com", "live.co.uk", "live.fr",
  "msn.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me", "pm.me",
  "aol.com", "zoho.com", "yandex.com", "yandex.ru",
  "mail.com", "email.com", "inbox.com",
  "gmx.com", "gmx.net", "gmx.de", "web.de",
  "qq.com", "163.com", "126.com",
]);

function isConsumerDomain(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return CONSUMER_DOMAINS.has(email.slice(at + 1).toLowerCase());
}

// ── Data constants ────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "Technology", "Healthcare", "Finance & Banking", "Marketing & Advertising",
  "Design & Creative", "Education", "Sales", "Operations & Logistics",
  "Legal", "Human Resources", "Media & Entertainment", "Real Estate",
  "Consulting", "Non-profit", "E-commerce", "Cybersecurity", "Data & Analytics",
  "Product Management", "Customer Success", "Other",
];

const JOB_SUGGESTIONS: Record<string, string[]> = {
  Technology: ["Software Engineer", "Full-Stack Developer", "Frontend Developer", "Backend Developer", "DevOps Engineer", "Data Scientist", "Machine Learning Engineer", "Site Reliability Engineer", "QA Engineer", "Engineering Manager", "iOS Developer", "Android Developer"],
  Healthcare: ["Registered Nurse", "Medical Writer", "Healthcare Analyst", "Telehealth Specialist", "Clinical Data Manager", "Health Informatics Specialist"],
  "Finance & Banking": ["Financial Analyst", "Accountant", "CFO", "Risk Analyst", "Investment Analyst", "Compliance Officer", "Fintech Analyst"],
  "Marketing & Advertising": ["Content Marketer", "SEO Specialist", "Growth Hacker", "Performance Marketer", "Brand Manager", "Email Marketer", "Social Media Manager"],
  "Design & Creative": ["UX Designer", "UI Designer", "Product Designer", "Graphic Designer", "Motion Designer", "Brand Designer", "Illustrator"],
  Education: ["Online Instructor", "Curriculum Developer", "EdTech Specialist", "Academic Writer", "Learning Designer"],
  Sales: ["Account Executive", "Sales Development Rep", "VP of Sales", "Business Development Manager", "Sales Engineer"],
  "Operations & Logistics": ["Operations Manager", "Supply Chain Analyst", "Project Manager", "Business Analyst", "Scrum Master"],
  Legal: ["Contract Attorney", "Legal Counsel", "Paralegal", "Compliance Specialist", "IP Attorney"],
  "Human Resources": ["HR Business Partner", "Talent Acquisition Specialist", "Recruiter", "People Operations Manager", "Compensation Analyst"],
  "Media & Entertainment": ["Video Editor", "Content Creator", "Journalist", "Podcast Producer", "Copywriter"],
  "Real Estate": ["Real Estate Analyst", "Property Manager", "Real Estate Marketing Specialist"],
  Consulting: ["Management Consultant", "Strategy Consultant", "IT Consultant", "Business Consultant"],
  "Non-profit": ["Program Manager", "Grant Writer", "Community Manager", "Fundraising Specialist"],
  "E-commerce": ["E-commerce Manager", "Amazon Specialist", "Shopify Developer", "Product Listing Specialist"],
  Cybersecurity: ["Security Engineer", "Penetration Tester", "SOC Analyst", "Cloud Security Architect"],
  "Data & Analytics": ["Data Analyst", "Data Engineer", "Business Intelligence Analyst", "Analytics Engineer"],
  "Product Management": ["Product Manager", "Senior Product Manager", "Director of Product", "Product Owner"],
  "Customer Success": ["Customer Success Manager", "Support Engineer", "Technical Account Manager"],
  Other: ["Freelancer", "Entrepreneur", "Virtual Assistant", "Project Coordinator"],
};

const INTEREST_SUGGESTIONS: Record<string, string[]> = {
  Technology: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "Go", "Rust", "AI & Machine Learning", "Cloud Computing", "DevOps", "Open Source", "Web3", "System Design", "Microservices"],
  Healthcare: ["Telehealth", "Medical Research", "Digital Health", "Patient Experience", "Clinical Trials", "Health Data"],
  "Finance & Banking": ["FinTech", "Blockchain", "DeFi", "Investing", "Personal Finance", "Crypto", "RegTech"],
  "Marketing & Advertising": ["Content Strategy", "SEO & SEM", "Email Marketing", "Social Media", "Brand Building", "Growth Hacking", "Video Marketing"],
  "Design & Creative": ["UI/UX", "Design Systems", "Figma", "Motion Design", "Brand Identity", "Illustration", "Typography"],
  Education: ["EdTech", "E-learning", "Curriculum Design", "Online Teaching", "Learning Science"],
  Sales: ["SaaS Sales", "CRM Tools", "Revenue Operations", "Cold Outreach", "Sales Enablement"],
  "Operations & Logistics": ["Agile", "Scrum", "Project Management", "Process Improvement", "Supply Chain"],
  Legal: ["Contract Law", "IP Rights", "Privacy & GDPR", "Corporate Law", "Legal Tech"],
  "Human Resources": ["Talent Acquisition", "DEI", "People Analytics", "Remote Culture", "Employee Wellbeing"],
  "Media & Entertainment": ["Video Production", "Podcasting", "Journalism", "Content Creation", "Streaming"],
  "Real Estate": ["PropTech", "Real Estate Investing", "Property Management"],
  Consulting: ["Strategy", "Change Management", "Digital Transformation", "Business Analysis"],
  "Non-profit": ["Social Impact", "Community Building", "Grant Writing", "Advocacy"],
  "E-commerce": ["Shopify", "Amazon FBA", "D2C Brands", "Conversion Optimization"],
  Cybersecurity: ["Ethical Hacking", "Zero Trust", "Cloud Security", "Threat Intelligence"],
  "Data & Analytics": ["SQL", "Python", "dbt", "Tableau", "Data Storytelling", "Machine Learning"],
  "Product Management": ["Product Strategy", "User Research", "Roadmapping", "Go-to-Market", "Agile"],
  "Customer Success": ["Customer Advocacy", "Churn Reduction", "NPS", "Onboarding"],
  Other: ["Entrepreneurship", "Freelancing", "Personal Branding", "Networking"],
};

const UNIVERSAL_INTERESTS = [
  "Remote Work", "Work-Life Balance", "Career Development", "Networking", "Productivity",
  "Startups", "Leadership", "Future of Work", "Side Projects", "Mental Health at Work",
];

// ── Sub-components ────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all ${
            i + 1 === step ? "w-6 bg-primary" : i + 1 < step ? "w-3 bg-primary/40" : "w-3 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function IndustrySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filtered = INDUSTRIES.filter(i => i.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setFilter(""); }}
        className={`w-full h-11 px-3 rounded-lg border text-sm flex items-center justify-between transition-colors ${
          open ? "border-primary ring-2 ring-primary/20" : "border-input hover:border-gray-400"
        } ${value ? "text-gray-900" : "text-gray-400"}`}
      >
        {value || "Select your industry"}
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search industries…"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs rounded-md focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.map(ind => (
              <button
                key={ind}
                type="button"
                onClick={() => { onChange(ind); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  value === ind ? "text-primary font-medium" : "text-gray-700"
                }`}
              >
                {ind}
                {value === ind && <CheckIcon className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobTitleInput({ value, onChange, industry }: { value: string; onChange: (v: string) => void; industry: string }) {
  const [showSugg, setShowSugg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setShowSugg(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const pool = industry ? (JOB_SUGGESTIONS[industry] ?? JOB_SUGGESTIONS.Other) : Object.values(JOB_SUGGESTIONS).flat();
  const suggestions = value.length >= 1
    ? pool.filter(s => s.toLowerCase().includes(value.toLowerCase())).slice(0, 6)
    : pool.slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder={industry ? `e.g. ${(JOB_SUGGESTIONS[industry] ?? ["Software Engineer"])[0]}` : "e.g. Software Engineer"}
        value={value}
        onChange={e => { onChange(e.target.value); setShowSugg(true); }}
        onFocus={() => setShowSugg(true)}
        className="h-11"
      />
      {showSugg && suggestions.length > 0 && (
        <div className="absolute z-40 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <p className="px-3 py-1.5 text-[10px] text-gray-400 font-semibold uppercase tracking-wide border-b border-gray-100">
            {value ? "Matching titles" : "Popular in this field"}
          </p>
          {suggestions.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setShowSugg(false); }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function InterestTag({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
        selected
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
      }`}
    >
      {selected && <CheckIcon className="w-3 h-3" />}
      {label}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Signup() {
  const { user, signup } = useAppAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [accountTypeLocked] = useState<boolean>(() => {
    const locked = sessionStorage.getItem("signup_lock_type") === "true";
    sessionStorage.removeItem("signup_lock_type");
    return locked;
  });

  const [accountType, setAccountType] = useState<"individual" | "company">(() => {
    const saved = sessionStorage.getItem("signup_prefill_type");
    if (saved) sessionStorage.removeItem("signup_prefill_type");
    return saved === "company" ? "company" : "individual";
  });
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState(() => {
    const pre = sessionStorage.getItem("signup_prefill_email") ?? "";
    if (pre) sessionStorage.removeItem("signup_prefill_email");
    return pre;
  });
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [headline,  setHeadline]  = useState("");
  const [industry,  setIndustry]  = useState("");
  const [location,  setLocation]  = useState("");

  const [interests, setInterests] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(user.accountType === "company" ? "/company-dashboard" : "/feed");
  }, [user, navigate]);

  const recommendedInterests = [
    ...(industry ? (INTEREST_SUGGESTIONS[industry] ?? []) : []),
    ...UNIVERSAL_INTERESTS,
  ].filter((v, i, a) => a.indexOf(v) === i);

  const toggleInterest = (tag: string) => {
    setInterests(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    const t = customTag.trim();
    if (t && !interests.includes(t)) { setInterests(prev => [...prev, t]); }
    setCustomTag("");
  };

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name || !email || !password) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (accountType === "company" && isConsumerDomain(email)) {
      setError("Company accounts require a business email address (not gmail, yahoo, hotmail, etc.).");
      return;
    }
    setStep(2);
  }

  function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!headline) { setError("Please add a job title or tagline."); return; }
    if (!industry) { setError("Please select your industry."); return; }
    setStep(3);
  }

  async function handleSubmit(skipInterests = false) {
    setError("");
    setLoading(true);
    const result = await signup({
      name, email, password, accountType, headline, location,
      industry,
      interests: skipInterests ? [] : interests,
    });
    setLoading(false);
    if (result.ok) {
      const token = result.verificationToken ?? "";
      sessionStorage.setItem("verify_email_address", email);
      sessionStorage.setItem("verify_token", token);
      navigate("/verify-email");
    } else {
      setError(result.error ?? "Registration failed.");
    }
  }

  return (
    <div className="min-h-screen bg-[#f3f2ef] flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between">
        <Link href="/">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
        </Link>
        <p className="text-sm text-gray-500">
          Already on Hire Me Remotely?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
        </p>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className={`w-full bg-white rounded-2xl border border-gray-200 shadow-sm p-8 ${step === 3 ? "max-w-lg" : "max-w-sm"}`}>

          <StepDots step={step} total={3} />

          {/* ── Step 1: Credentials ───────────────────────────────────────── */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Make the most of your career</h1>
              <p className="text-sm text-gray-500 mb-6">Create your free account to get started.</p>

              {!accountTypeLocked && (
                <div className="flex gap-2 mb-5">
                  {(["individual", "company"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAccountType(t)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        accountType === t
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {t === "individual" ? <UserIcon className="w-4 h-4" /> : <BuildingIcon className="w-4 h-4" />}
                      {t === "individual" ? "Individual" : "Company"}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {accountType === "company" ? "Company name" : "Full name"}
                  </label>
                  <Input placeholder={accountType === "company" ? "Acme Inc." : "Alex Chen"} value={name} onChange={e => setName(e.target.value)} className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" className="h-11" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      placeholder="6+ characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="h-11 pr-10"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <ErrorBanner msg={error} />}

                <Button type="submit" className="w-full h-11 rounded-full font-semibold text-base">Continue</Button>
              </form>

              <p className="text-xs text-gray-400 mt-4 text-center">
                By continuing you agree to our{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms</a> and{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a>.
              </p>
            </>
          )}

          {/* ── Step 2: Job details ───────────────────────────────────────── */}
          {step === 2 && (
            <>
              <button onClick={() => setStep(1)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">
                {accountType === "company" ? "Tell us about your company" : "Tell us about your work"}
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                {accountType === "company"
                  ? "Help candidates discover your company on the platform."
                  : "This helps us recommend the right jobs and people to you."}
              </p>

              <form onSubmit={handleStep2} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {accountType === "company" ? "Company tagline" : "Job title"}
                  </label>
                  {accountType === "individual" ? (
                    <JobTitleInput value={headline} onChange={setHeadline} industry={industry} />
                  ) : (
                    <Input
                      placeholder="Build tools developers love"
                      value={headline}
                      onChange={e => setHeadline(e.target.value)}
                      className="h-11"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <IndustrySelect value={industry} onChange={setIndustry} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    placeholder="San Francisco, CA — or Fully Remote"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="h-11"
                  />
                </div>

                {error && <ErrorBanner msg={error} />}

                <Button type="submit" className="w-full h-11 rounded-full font-semibold text-base">Continue</Button>
              </form>
            </>
          )}

          {/* ── Step 3: Interests ─────────────────────────────────────────── */}
          {step === 3 && (
            <>
              <button onClick={() => setStep(2)} className="text-xs text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                ← Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 mb-1">What are you interested in?</h1>
              <p className="text-sm text-gray-500 mb-1">
                Pick at least 3 topics — we'll use these to match you with the right people and content.
              </p>
              {interests.length > 0 && (
                <p className="text-xs text-primary font-semibold mb-4">{interests.length} selected</p>
              )}
              {interests.length === 0 && <div className="mb-4" />}

              {/* Recommended tags */}
              <div className="mb-4">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">
                  {industry ? `Recommended for ${industry}` : "Popular topics"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedInterests.map(tag => (
                    <InterestTag key={tag} label={tag} selected={interests.includes(tag)} onClick={() => toggleInterest(tag)} />
                  ))}
                </div>
              </div>

              {/* Custom tag input */}
              <div className="mt-4 mb-5">
                <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide mb-2">Add your own</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Kubernetes, Shopify, Podcasting…"
                    value={customTag}
                    onChange={e => setCustomTag(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                    className="h-9 text-sm"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomTag} className="flex-shrink-0 h-9 px-3">Add</Button>
                </div>
              </div>

              {/* Selected custom tags */}
              {interests.filter(t => !recommendedInterests.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {interests.filter(t => !recommendedInterests.includes(t)).map(tag => (
                    <InterestTag key={tag} label={tag} selected onClick={() => toggleInterest(tag)} />
                  ))}
                </div>
              )}

              {error && <ErrorBanner msg={error} />}

              <Button
                className="w-full h-11 rounded-full font-semibold text-base"
                disabled={loading}
                onClick={() => handleSubmit(false)}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account…
                  </span>
                ) : interests.length >= 3 ? "Create account" : `Select ${3 - interests.length} more to continue`}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm text-gray-400 hover:text-gray-600 mt-2"
                disabled={loading}
                onClick={() => handleSubmit(true)}
              >
                Skip for now
              </Button>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ msg }: { msg: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
      <AlertCircleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-600">{msg}</p>
    </div>
  );
}

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  MapPinIcon,
  BriefcaseIcon,
  ThumbsUpIcon,
  MessageSquareIcon,
  BuildingIcon,
  CheckCircleIcon,
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { ManageCookiesLink } from "@/components/cookie-consent";

const PREVIEW_PROFILES = [
  { name: "Alex Chen", role: "Full-Stack Engineer", loc: "San Francisco", avatar: "https://i.pravatar.cc/80?u=1", open: true },
  { name: "Maria Santos", role: "Senior UX Designer", loc: "Lisbon, Portugal", avatar: "https://i.pravatar.cc/80?u=2", open: false },
  { name: "James Okafor", role: "Backend Engineer", loc: "Lagos, Nigeria", avatar: "https://i.pravatar.cc/80?u=3", open: true },
];

const PREVIEW_JOBS = [
  { title: "Senior Frontend Engineer", company: "Streamline", loc: "Remote – Americas", badge: "Featured" },
  { title: "Full-Stack Engineer", company: "Deployly", loc: "Remote – Worldwide", badge: "New" },
];

const BASE = import.meta.env.BASE_URL;

export default function Landing() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [checking, setChecking] = useState(false);
  const [, navigate] = useLocation();

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Please enter your email to continue.");
      return;
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    if (!isEmail) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`${BASE}api/auth/check-email?email=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.exists) {
        if (data.accountType === "company") {
          setEmailError("This email is registered as a company account. Please use 'For Companies' to sign in.");
          setChecking(false);
          return;
        }
        sessionStorage.setItem("login_prefill_email", trimmed);
        navigate("/login");
      } else {
        sessionStorage.setItem("signup_prefill_email", trimmed);
        sessionStorage.setItem("signup_prefill_type", "individual");
        sessionStorage.setItem("signup_lock_type", "true");
        navigate("/signup");
      }
    } catch {
      setEmailError("Something went wrong. Please try again.");
    }
    setChecking(false);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Navbar ── */}
      <header className="w-full border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src={logo} alt="Hire Me Remotely" className="h-10 w-auto" />
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-semibold text-gray-600 hover:text-gray-900">
                Sign in
              </Button>
            </Link>
            <Link href="/company-login">
              <Button variant="outline" size="sm" className="font-semibold rounded-full px-4 border-primary/40 text-primary hover:bg-primary/5 hover:border-primary hidden sm:inline-flex items-center gap-1.5">
                <BuildingIcon className="w-3.5 h-3.5" />
                For Companies
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="font-semibold rounded-full px-5">
                Join free
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-12 md:py-20 w-full grid md:grid-cols-2 gap-12 md:gap-20 items-center">

          {/* LEFT — Sign up / Sign in */}
          <div className="max-w-sm w-full mx-auto md:mx-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-gray-900 mb-3">
              <span className="block">Remote jobs.</span>
              <span className="block">Real connections.</span>
              <span className="block">One ecosystem.</span>
            </h1>
            <p className="text-gray-500 text-base mb-8 leading-relaxed">
              Find your next role. Build your remote team.
            </p>

            {/* Email input */}
            <form onSubmit={handleContinue} className="space-y-3 mb-4" noValidate>
              <div>
                <Input
                  type="email"
                  placeholder="Enter your work email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setEmailError(""); }}
                  className={`h-12 rounded-lg text-sm focus-visible:ring-primary ${emailError ? "border-red-400 focus-visible:ring-red-400" : "border-gray-300"}`}
                />
                {emailError && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {emailError}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={checking} className="w-full h-12 rounded-full font-bold text-base">
                {checking ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Checking…
                  </span>
                ) : "Continue"}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 font-medium">Are you a company?</span>
              <Separator className="flex-1" />
            </div>

            <Button
              variant="outline"
              className="w-full h-12 rounded-full font-semibold text-sm border-primary/40 text-primary hover:bg-primary/5 hover:border-primary flex items-center gap-3"
              onClick={() => {
                sessionStorage.setItem("signup_prefill_type", "company");
                sessionStorage.setItem("signup_lock_type", "true");
                navigate("/signup");
              }}
            >
              <BuildingIcon className="w-5 h-5" />
              Continue as a Company
            </Button>

            <p className="text-center text-xs text-gray-400 mt-6 leading-relaxed">
              Already on Hire Me Remotely?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
            </p>

            {/* Policies */}
            <p className="text-center text-[11px] text-gray-400 mt-4 leading-relaxed">
              By joining, you agree to our{" "}
              <Link href="/terms" className="underline hover:text-gray-600">Terms</Link> and{" "}
              <Link href="/privacy" className="underline hover:text-gray-600">Privacy Policy</Link>.
            </p>
          </div>

          {/* RIGHT — Platform preview */}
          <div className="hidden md:flex flex-col gap-4 relative">

            {/* Profile cards */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Professionals near you</p>
              <div className="space-y-3">
                {PREVIEW_PROFILES.map((p) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-gray-100 flex-shrink-0">
                      <AvatarImage src={p.avatar} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{p.name.slice(0,2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                        <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{p.role} · {p.loc}</span>
                      </div>
                    </div>
                    {p.open && (
                      <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2 rounded-full flex-shrink-0">
                        Open
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Jobs card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Remote jobs for you</p>
              <div className="space-y-3">
                {PREVIEW_JOBS.map((j) => (
                  <div key={j.title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BriefcaseIcon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{j.title}</p>
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] font-semibold px-1.5 rounded flex-shrink-0">{j.badge}</Badge>
                      </div>
                      <p className="text-[11px] text-gray-400">{j.company} · {j.loc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post engagement preview */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="w-9 h-9 border border-gray-100 flex-shrink-0">
                  <AvatarImage src="https://i.pravatar.cc/80?u=7" />
                  <AvatarFallback className="text-xs">VE</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Deployly</p>
                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                    <BuildingIcon className="w-3 h-3" /> Company · 2h ago
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed mb-3">
                We're hiring! Looking for a Senior Frontend Engineer passionate about performance and great UIs. 🚀
              </p>
              <div className="flex items-center gap-4 text-[11px] text-gray-400 border-t border-gray-100 pt-2">
                <span className="flex items-center gap-1"><ThumbsUpIcon className="w-3.5 h-3.5" /> 312 likes</span>
                <span className="flex items-center gap-1"><MessageSquareIcon className="w-3.5 h-3.5" /> 67 comments</span>
              </div>
            </div>

            {/* Floating trust badge */}
            <div className="absolute -bottom-4 -left-6 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2.5">
              <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-900">Hired in 21 days</p>
                <p className="text-[11px] text-gray-400">Average time on platform</p>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logo} alt="Hire Me Remotely" className="h-7 w-auto opacity-60" />
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-gray-400">
            <a href="#" className="hover:text-gray-700">About</a>
            <a href="#" className="hover:text-gray-700">Accessibility</a>
            <Link href="/privacy" className="hover:text-gray-700">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-gray-700">Terms</Link>
            <Link href="/jobs" className="hover:text-gray-700">Browse Jobs</Link>
            <Link href="/profiles" className="hover:text-gray-700">Network</Link>
            <ManageCookiesLink />
          </div>
          <p className="text-xs text-gray-300">© 2026 Hire Me Remotely</p>
        </div>
      </footer>

    </div>
  );
}

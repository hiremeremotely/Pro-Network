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

const PREVIEW_PROFILES = [
  { name: "Alex Chen", role: "Full-Stack Engineer", loc: "San Francisco", avatar: "https://i.pravatar.cc/80?u=1", open: true },
  { name: "Maria Santos", role: "Senior UX Designer", loc: "Lisbon, Portugal", avatar: "https://i.pravatar.cc/80?u=2", open: false },
  { name: "James Okafor", role: "Backend Engineer", loc: "Lagos, Nigeria", avatar: "https://i.pravatar.cc/80?u=3", open: true },
];

const PREVIEW_JOBS = [
  { title: "Senior Frontend Engineer", company: "Linear", loc: "Remote – Americas", badge: "Featured" },
  { title: "Full-Stack Engineer", company: "Vercel", loc: "Remote – Worldwide", badge: "New" },
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
            <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight text-gray-900 mb-3">
              Your remote career starts here.
            </h1>
            <p className="text-gray-500 text-base mb-8 leading-relaxed">
              Connect with top remote companies, showcase your skills, and land your next opportunity — all in one place.
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

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <Separator className="flex-1" />
              <span className="text-xs text-gray-400 font-medium">or</span>
              <Separator className="flex-1" />
            </div>

            {/* Social sign-in */}
            <div className="space-y-3">
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full h-12 rounded-full font-semibold text-sm border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </Button>
              </Link>
              <Link href="/signup" className="block">
                <Button variant="outline" className="w-full h-12 rounded-full font-semibold text-sm border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </Link>
            </div>

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
              <a href="#" className="underline hover:text-gray-600">Terms</a> and{" "}
              <a href="#" className="underline hover:text-gray-600">Privacy Policy</a>.
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
                  <p className="text-sm font-semibold text-gray-900 leading-tight">Vercel</p>
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
            <a href="#" className="hover:text-gray-700">Privacy Policy</a>
            <a href="#" className="hover:text-gray-700">Terms</a>
            <Link href="/jobs" className="hover:text-gray-700">Browse Jobs</Link>
            <Link href="/profiles" className="hover:text-gray-700">Network</Link>
          </div>
          <p className="text-xs text-gray-300">© 2026 Hire Me Remotely</p>
        </div>
      </footer>

    </div>
  );
}

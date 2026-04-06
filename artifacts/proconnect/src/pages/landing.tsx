import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRightIcon,
  CheckIcon,
  BriefcaseIcon,
  UsersIcon,
  GlobeIcon,
  ZapIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  BuildingIcon,
  StarIcon,
  ChevronRightIcon,
} from "lucide-react";

const INDIVIDUALS = [
  { name: "Alex Chen", role: "Full-Stack Engineer", location: "San Francisco", avatar: "https://i.pravatar.cc/150?u=1", open: true },
  { name: "Maria Santos", role: "Senior UX Designer", location: "Lisbon, Portugal", avatar: "https://i.pravatar.cc/150?u=2", open: false },
  { name: "James Okafor", role: "Backend Engineer", location: "Lagos, Nigeria", avatar: "https://i.pravatar.cc/150?u=3", open: true },
];

const COMPANIES = [
  { name: "Linear", desc: "The issue tracker that actually works", industry: "Software", initials: "LI", color: "from-violet-500 to-purple-600" },
  { name: "Vercel", desc: "Develop. Preview. Ship.", industry: "Cloud Infrastructure", initials: "VC", color: "from-gray-800 to-black" },
  { name: "Figma", desc: "Design tool loved by millions", industry: "Design Tools", initials: "FG", color: "from-pink-500 to-red-500" },
];

const FEATURES_INDIVIDUAL = [
  "Showcase your portfolio, skills & experience",
  "Get discovered by top remote companies",
  "Apply to curated remote job listings",
  "Build your professional network globally",
  "Share updates and insights with your feed",
];

const FEATURES_COMPANY = [
  "Create a branded company profile page",
  "Post job listings visible to thousands",
  "Browse and contact qualified candidates",
  "Share company updates and culture",
  "Access detailed applicant profiles",
];

const TESTIMONIALS = [
  {
    text: "ProConnect got me in front of companies I'd never have found on traditional job boards. Landed a senior role within 3 weeks.",
    name: "Alex Chen",
    role: "Full-Stack Engineer",
    avatar: "https://i.pravatar.cc/150?u=1",
  },
  {
    text: "As a designer based in Lisbon, this platform connected me with clients and teams across the US and EU seamlessly.",
    name: "Maria Santos",
    role: "Senior UX Designer",
    avatar: "https://i.pravatar.cc/150?u=2",
  },
  {
    text: "We filled two engineering roles in under a month. The quality of candidates here is noticeably higher than anywhere else.",
    name: "Priya Mehta",
    role: "Head of Talent, Forma",
    avatar: "https://i.pravatar.cc/150?u=4",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tight">
            <div className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-black text-base">P</div>
            ProConnect
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500">
            <a href="#individuals" className="hover:text-gray-900 transition-colors">For Professionals</a>
            <a href="#companies" className="hover:text-gray-900 transition-colors">For Companies</a>
            <a href="#testimonials" className="hover:text-gray-900 transition-colors">Stories</a>
            <Link href="/jobs" className="hover:text-gray-900 transition-colors">Browse Jobs</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/feed">
              <Button variant="ghost" size="sm" className="text-sm font-semibold">Sign in</Button>
            </Link>
            <Link href="/profile/edit">
              <Button size="sm" className="text-sm font-semibold rounded-full px-5">Join free</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-40 w-[500px] h-[500px] bg-violet-100 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-0 text-xs font-semibold px-4 py-1.5 rounded-full inline-flex items-center gap-1.5">
            <GlobeIcon className="w-3.5 h-3.5" />
            The remote-first professional network
          </Badge>

          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 max-w-4xl mx-auto">
            Where remote talent
            <br />
            <span className="text-primary relative">
              gets discovered.
              <svg className="absolute -bottom-2 left-0 w-full" height="8" viewBox="0 0 400 8" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <path d="M0 6 Q100 0 200 6 Q300 12 400 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.4"/>
              </svg>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            ProConnect connects ambitious remote professionals with the world's best companies — through a social platform built for how we work today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/profile/edit">
              <Button size="lg" className="h-14 px-8 text-base font-bold rounded-full shadow-lg shadow-primary/25 group">
                Get started free
                <ArrowRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/jobs">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base font-semibold rounded-full border-2">
                Browse remote jobs
              </Button>
            </Link>
          </div>

          {/* Social proof avatars */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex -space-x-3">
              {[1,2,3,4,5,6].map(i => (
                <Avatar key={i} className="w-10 h-10 border-2 border-white shadow-sm">
                  <AvatarImage src={`https://i.pravatar.cc/80?u=${i * 7}`} />
                  <AvatarFallback className="text-xs" />
                </Avatar>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-primary text-white text-[11px] font-bold flex items-center justify-center shadow-sm">+2k</div>
            </div>
            <p className="text-sm text-gray-400 font-medium">
              Joined by <span className="text-gray-700 font-semibold">2,000+ remote professionals</span> this month
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-gray-100 bg-gray-50 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { num: "12K+", label: "Professionals" },
            { num: "400+", label: "Remote jobs" },
            { num: "180+", label: "Countries" },
            { num: "94%", label: "Hired within 60 days" },
          ].map(s => (
            <div key={s.label}>
              <p className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{s.num}</p>
              <p className="text-sm text-gray-400 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Individuals ── */}
      <section id="individuals" className="py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left copy */}
            <div>
              <Badge className="mb-5 bg-blue-50 text-blue-600 border-0 text-xs font-semibold px-3 py-1 rounded-full">
                <UsersIcon className="w-3.5 h-3.5 mr-1.5 inline" />For Professionals
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-5">
                Your career,<br/>your way.
              </h2>
              <p className="text-lg text-gray-500 font-medium mb-8 leading-relaxed">
                Build a rich profile that showcases who you really are — not just a résumé. Share your story, work, and ideas with the people and companies that matter.
              </p>
              <ul className="space-y-3 mb-10">
                {FEATURES_INDIVIDUAL.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/profile/edit">
                <Button className="rounded-full px-7 font-semibold group">
                  Create your profile
                  <ChevronRightIcon className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Right: Profile cards */}
            <div className="relative">
              <div className="space-y-4">
                {INDIVIDUALS.map((person, i) => (
                  <div
                    key={person.name}
                    className={`bg-white border border-gray-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow ${i === 1 ? "ml-6" : ""}`}
                  >
                    <Avatar className="w-14 h-14 border-2 border-white shadow flex-shrink-0">
                      <AvatarImage src={person.avatar} />
                      <AvatarFallback>{person.name.slice(0,2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900">{person.name}</p>
                      <p className="text-xs text-gray-500 mb-1">{person.role}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <GlobeIcon className="w-3 h-3" />
                        {person.location}
                      </div>
                    </div>
                    {person.open && (
                      <Badge className="bg-green-50 text-green-600 border-0 text-[10px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0">
                        Open to work
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              {/* Floating engagement badge */}
              <div className="absolute -bottom-4 -right-4 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <ZapIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">Profile viewed</p>
                  <p className="text-[11px] text-gray-400">3 companies this week</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Companies ── */}
      <section id="companies" className="py-24 md:py-32 bg-gray-950 text-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left: Company cards */}
            <div className="order-2 md:order-1">
              <div className="space-y-4">
                {COMPANIES.map((co, i) => (
                  <div
                    key={co.name}
                    className={`bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/8 transition-colors ${i === 1 ? "ml-6" : ""}`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${co.color} flex items-center justify-center flex-shrink-0 text-white font-black text-sm`}>
                      {co.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white">{co.name}</p>
                      <p className="text-xs text-gray-400 mb-1">{co.desc}</p>
                      <Badge className="bg-white/10 text-gray-300 border-0 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {co.industry}
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 text-xs rounded-full px-3 flex-shrink-0">
                      Follow
                    </Button>
                  </div>
                ))}
              </div>
              {/* Floating stat badge */}
              <div className="mt-4 bg-primary/20 border border-primary/30 rounded-2xl px-4 py-3 flex items-center gap-3">
                <TrendingUpIcon className="w-5 h-5 text-primary flex-shrink-0" />
                <p className="text-sm font-medium text-gray-200">
                  Companies on ProConnect fill roles <span className="text-primary font-bold">3× faster</span> than traditional job boards
                </p>
              </div>
            </div>

            {/* Right copy */}
            <div className="order-1 md:order-2">
              <Badge className="mb-5 bg-primary/20 text-primary border-0 text-xs font-semibold px-3 py-1 rounded-full">
                <BuildingIcon className="w-3.5 h-3.5 mr-1.5 inline" />For Companies
              </Badge>
              <h2 className="text-4xl md:text-5xl font-black tracking-tight leading-tight mb-5">
                Hire the<br/>remote-ready.
              </h2>
              <p className="text-lg text-gray-400 font-medium mb-8 leading-relaxed">
                Create your company profile, share your culture, and reach thousands of vetted remote professionals who are actively looking for their next opportunity.
              </p>
              <ul className="space-y-3 mb-10">
                {FEATURES_COMPANY.map(f => (
                  <li key={f} className="flex items-start gap-3 text-sm font-medium text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckIcon className="w-3 h-3 text-primary" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/profile/edit">
                <Button className="rounded-full px-7 font-semibold group bg-white text-gray-900 hover:bg-gray-100">
                  Set up company profile
                  <ChevronRightIcon className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <Badge className="mb-5 bg-primary/10 text-primary border-0 text-xs font-semibold px-3 py-1 rounded-full">How it works</Badge>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Up and running in minutes</h2>
          <p className="text-gray-500 text-lg mb-16 max-w-xl mx-auto font-medium">No gatekeeping. No complicated forms. Just a streamlined path from sign-up to hired.</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: UsersIcon, title: "Create your profile", desc: "Add your experience, skills, portfolio, and what you're looking for. Individuals and companies are both welcome.", color: "bg-blue-50 text-blue-600" },
              { step: "02", icon: GlobeIcon, title: "Join the network", desc: "Post updates, follow companies, connect with peers, and get your work in front of the people who matter.", color: "bg-violet-50 text-violet-600" },
              { step: "03", icon: ZapIcon, title: "Land the opportunity", desc: "Apply to jobs directly, get reached out to by companies, or hire the right person for your remote team.", color: "bg-orange-50 text-orange-600" },
            ].map(item => (
              <div key={item.step} className="text-left p-8 bg-gray-50 rounded-3xl border border-gray-100 hover:border-primary/20 hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className="text-4xl font-black text-gray-100">{item.step}</span>
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge className="mb-5 bg-yellow-50 text-yellow-600 border-0 text-xs font-semibold px-3 py-1 rounded-full">
              <StarIcon className="w-3.5 h-3.5 mr-1.5 inline" />Success stories
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black tracking-tight">Loved by remote professionals</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-3xl p-7 flex flex-col gap-5 hover:shadow-md transition-shadow">
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => <StarIcon key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed font-medium flex-1">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                  <Avatar className="w-10 h-10 border-2 border-gray-100">
                    <AvatarImage src={t.avatar} />
                    <AvatarFallback className="text-xs">{t.name.slice(0,2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 md:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="bg-primary rounded-3xl px-10 py-14 md:py-20 relative overflow-hidden shadow-2xl shadow-primary/30">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-black/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <ShieldCheckIcon className="w-10 h-10 text-white/60 mx-auto mb-4" />
              <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">Ready to stand out?</h2>
              <p className="text-white/75 text-lg font-medium mb-10 max-w-lg mx-auto leading-relaxed">
                Join thousands of remote professionals and companies building real careers and real teams on ProConnect.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/profile/edit">
                  <Button size="lg" variant="secondary" className="h-14 px-8 text-base font-bold rounded-full text-primary hover:bg-white w-full sm:w-auto">
                    Join as a Professional
                  </Button>
                </Link>
                <Link href="/profile/edit">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-base font-bold rounded-full border-white/30 text-white hover:bg-white/10 w-full sm:w-auto">
                    Join as a Company
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2 font-black text-lg">
              <div className="bg-primary text-white w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm">P</div>
              ProConnect
            </Link>
            <div className="flex items-center gap-6 text-sm text-gray-400 font-medium">
              <a href="#" className="hover:text-gray-700 transition-colors">About</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-gray-700 transition-colors">Terms</a>
              <Link href="/jobs" className="hover:text-gray-700 transition-colors">Browse Jobs</Link>
              <Link href="/profiles" className="hover:text-gray-700 transition-colors">Network</Link>
            </div>
            <p className="text-sm text-gray-400">© 2026 ProConnect</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

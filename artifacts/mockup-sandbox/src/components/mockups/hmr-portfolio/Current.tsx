import { Briefcase, Copy, FileText, Github, Globe, MapPin, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import "./_group.css";

type Project = {
  title: string;
  description: string;
  provider: "GitHub" | "Website" | "Document";
  featured?: boolean;
  tags: string[];
  imageUrl?: string;
};

function preview(background: string, content: string) {
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="680" height="260" viewBox="0 0 680 260"><rect width="680" height="260" fill="${background}"/>${content}</svg>`)}`;
}

const projects: Project[] = [
  {
    title: "Atlas — design system",
    description: "A reusable component library and documentation for a growing product team.",
    provider: "GitHub",
    featured: true,
    tags: ["React", "Design systems", "Accessibility"],
    imageUrl: preview("#edf0ff", `<rect x="85" y="26" width="510" height="208" rx="14" fill="white"/><rect x="85" y="26" width="510" height="31" rx="14" fill="#252653"/><circle cx="107" cy="41" r="4" fill="#f7a8b4"/><circle cx="121" cy="41" r="4" fill="#ffe19e"/><circle cx="135" cy="41" r="4" fill="#a9dec9"/><rect x="110" y="82" width="130" height="14" rx="7" fill="#40417c"/><rect x="110" y="112" width="214" height="8" rx="4" fill="#ccd2ef"/><rect x="110" y="128" width="165" height="8" rx="4" fill="#e2e5f5"/><rect x="110" y="164" width="89" height="36" rx="8" fill="#5149db"/><rect x="211" y="164" width="89" height="36" rx="8" fill="#f3f2fe" stroke="#d9d7f6"/><rect x="368" y="81" width="188" height="122" rx="10" fill="#f7f8ff"/><circle cx="419" cy="126" r="25" fill="#d0cdf8"/><rect x="456" y="108" width="70" height="8" rx="4" fill="#8e8acb"/><rect x="456" y="126" width="50" height="7" rx="3.5" fill="#d4d2ee"/><rect x="395" y="173" width="130" height="10" rx="5" fill="#e0def4"/>`),
  },
  {
    title: "Fieldnotes — research workspace",
    description: "A calmer way to gather interviews, map patterns, and share research findings.",
    provider: "Website",
    tags: ["Product design", "Research", "Prototyping"],
    imageUrl: preview("#e8f1ed", `<rect x="78" y="22" width="524" height="215" rx="13" fill="#fffefb"/><rect x="78" y="22" width="125" height="215" rx="13" fill="#284742"/><circle cx="105" cy="53" r="10" fill="#aacdc0"/><rect x="96" y="82" width="84" height="8" rx="4" fill="#7ba69a"/><rect x="96" y="104" width="61" height="7" rx="3.5" fill="#567e73"/><rect x="96" y="121" width="72" height="7" rx="3.5" fill="#567e73"/><rect x="227" y="50" width="175" height="14" rx="7" fill="#25463d"/><rect x="227" y="74" width="270" height="8" rx="4" fill="#d4ddd7"/><rect x="227" y="110" width="98" height="96" rx="10" fill="#e8dccc"/><rect x="338" y="110" width="98" height="96" rx="10" fill="#d4e4d6"/><rect x="449" y="110" width="98" height="96" rx="10" fill="#eee8d9"/><rect x="242" y="132" width="55" height="7" rx="3" fill="#997d6e"/><rect x="353" y="132" width="55" height="7" rx="3" fill="#628570"/><rect x="464" y="132" width="55" height="7" rx="3" fill="#99917e"/>`),
  },
  {
    title: "Commerce insights dashboard",
    description: "An interactive reporting concept that makes weekly performance easier to understand.",
    provider: "GitHub",
    tags: ["TypeScript", "Data visualization", "UX"],
    imageUrl: preview("#e9ebf7", `<rect x="76" y="24" width="528" height="210" rx="14" fill="white"/><rect x="76" y="24" width="528" height="27" rx="14" fill="#233256"/><rect x="100" y="80" width="181" height="13" rx="6.5" fill="#354468"/><rect x="100" y="103" width="117" height="7" rx="3.5" fill="#cfd5e3"/><rect x="100" y="132" width="103" height="71" rx="8" fill="#f1f2fb"/><rect x="216" y="132" width="103" height="71" rx="8" fill="#f3f7f2"/><rect x="333" y="72" width="238" height="131" rx="9" fill="#f5f6fb"/><path d="M351 176 L384 155 L413 162 L445 117 L476 134 L512 100 L551 111" stroke="#615adf" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="445" cy="117" r="6" fill="#615adf"/>`),
  },
  {
    title: "Inclusive onboarding case study",
    description: "A practical accessibility review and redesigned first-run experience.",
    provider: "Document",
    tags: ["Accessibility", "Case study", "User testing"],
  },
];

const providerIcons = { GitHub: Github, Website: Globe, Document: FileText };

export function Current() {
  return (
    <div className="hmr-portfolio-demo min-h-screen bg-[#f3f2ef] text-gray-900 pb-16">
      <header className="h-16 bg-white border-b border-gray-200">
        <div className="max-w-[1320px] h-full mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="w-10 h-10 rounded-lg bg-primary text-white font-extrabold tracking-tight flex items-center justify-center text-sm">HR</span><span className="font-extrabold tracking-tight text-sm">Hire Me Remotely</span></div>
          <div className="hidden sm:flex items-center gap-8 text-sm font-medium text-gray-500"><span>Feed</span><span>Network</span><span className="text-primary">Profile</span><span>Jobs</span></div>
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">AR</div>
        </div>
      </header>
      <div className="max-w-[1320px] mx-auto px-4 pt-6">
        <div className="mb-3 text-[11px] uppercase tracking-[0.12em] font-bold text-gray-500">Illustrative example · fictional profile and projects</div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <main className="lg:col-span-2 space-y-3">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="relative h-40 bg-gradient-to-r from-primary/70 via-primary/45 to-indigo-300/60" />
              <div className="px-6 pb-6">
                <div className="flex items-end justify-between -mt-12 mb-4">
                  <Avatar className="w-28 h-28 border-4 border-white shadow-md">
                    <AvatarFallback className="text-3xl font-bold bg-primary/10 text-primary">AR</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-2 pt-14 flex-wrap justify-end">
                    <Button variant="outline" size="sm" className="rounded-full h-9 px-4 text-sm font-semibold border-gray-700 text-gray-700 gap-1.5"><Copy className="w-3.5 h-3.5" /> Share</Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl font-bold leading-tight">Amina Rahman</h1><Badge className="bg-green-50 text-green-700 border-green-200 text-[10px] font-semibold px-2 rounded-full border">Open to Work</Badge></div>
                  <p className="text-base text-gray-600 leading-snug">Product designer & frontend developer · thoughtful digital experiences</p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 pt-1"><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Remote</span><span className="text-primary font-semibold">128 connections</span></div>
                </div>
              </div>
            </div>

            <section className="bg-white rounded-2xl border border-gray-200 px-6 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-5 gap-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg flex items-center gap-2"><Star className="w-5 h-5 text-primary" /> Professional work</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Reviewed work and projects. Source links remain private until explicitly released.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((item) => {
                  const ProviderIcon = providerIcons[item.provider];
                  return (
                    <div key={item.title} className="group flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-4 cursor-default">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 text-gray-500"><ProviderIcon className="w-4 h-4" /><span className="text-[11px] font-bold uppercase tracking-wider">{item.provider}</span></div>
                          {item.featured && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
                        </div>
                        {item.imageUrl && <div className="mb-3 h-32 w-full rounded-lg bg-gray-50 overflow-hidden border border-gray-100"><img src={item.imageUrl} alt="" className="w-full h-full object-cover" /></div>}
                        <h3 className="font-semibold text-gray-900 leading-snug">{item.title}</h3>
                        <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">{item.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-3">{item.tags.slice(0, 3).map(tag => <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-600 text-[10px] font-medium border-0 px-2 rounded-md">{tag}</Badge>)}</div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs font-semibold text-gray-400"><span>Reviewed project summary</span></div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>
          <aside className="hidden lg:block space-y-3">
            <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
              <div className="flex items-center gap-2 font-semibold text-sm"><Briefcase className="w-4 h-4 text-primary" /> About</div>
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">I turn complex workflows into simple, approachable products. I work across research, prototyping, and frontend implementation.</p>
            </div>
            <div className="rounded-2xl bg-white border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-sm mb-4">Highlights</h3>
              <div className="space-y-3 text-sm text-gray-600"><p>Product design · 5 years</p><p>Frontend development · 4 years</p><p>Open to remote projects</p></div>
            </div>
            <div className="text-xs text-gray-400 p-2">This screenshot uses made-up details. Links are intentionally not shown in public summaries.</div>
          </aside>
        </div>
      </div>
    </div>
  );
}
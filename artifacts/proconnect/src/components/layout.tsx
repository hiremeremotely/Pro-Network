import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HomeIcon,
  UsersIcon,
  BriefcaseIcon,
  BellIcon,
  SearchIcon,
  UserIcon,
  LogOutIcon,
  XIcon,
  LoaderIcon,
  MapPinIcon,
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { useAppAuth } from "@/contexts/app-auth";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

// ── Global typeahead search ───────────────────────────────────────────────────
function GlobalSearch() {
  const [, navigate] = useLocation();
  const { user } = useAppAuth();
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(t);
  }, [value]);

  const { data, isFetching } = useListProfiles(
    { search: debounced || undefined, limit: 6, offset: 0 },
    {
      query: {
        enabled: debounced.length >= 1,
        queryKey: getListProfilesQueryKey({ search: debounced || undefined, limit: 6, offset: 0 }),
      },
    }
  );

  const suggestions = (data?.profiles ?? []).filter(p => p.id !== user?.id);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) {
        navigate(`/profiles/${suggestions[highlighted].id}`);
        setValue(""); setOpen(false);
      } else if (value.trim()) {
        navigate(`/profiles?search=${encodeURIComponent(value.trim())}`);
        setOpen(false);
      }
    } else if (e.key === "Escape") { setOpen(false); setHighlighted(-1); inputRef.current?.blur(); }
  }

  const showDropdown = open && value.length >= 1 && (isFetching || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative flex-shrink-0 w-64 hidden sm:block">
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        placeholder="Search"
        autoComplete="off"
        className="w-full h-9 pl-9 pr-8 bg-[#eef3f8] border-0 rounded-md text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-white transition-colors"
        onChange={e => { setValue(e.target.value); setOpen(true); setHighlighted(-1); }}
        onFocus={() => { if (value.length >= 1) setOpen(true); }}
        onKeyDown={handleKeyDown}
      />
      {value && (
        <button
          type="button"
          onClick={() => { setValue(""); setOpen(false); inputRef.current?.focus(); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XIcon className="w-3 h-3" />
        </button>
      )}

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden min-w-[320px]">
          {isFetching && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400">
              <LoaderIcon className="w-3.5 h-3.5 animate-spin" /> Searching...
            </div>
          ) : (
            <>
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">People</p>
              </div>
              {suggestions.map((profile, i) => {
                const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onMouseDown={() => { navigate(`/profiles/${profile.id}`); setValue(""); setOpen(false); }}
                    onMouseEnter={() => setHighlighted(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${highlighted === i ? "bg-primary/5" : "hover:bg-gray-50"}`}
                  >
                    <Avatar className="w-8 h-8 border border-gray-100 flex-shrink-0">
                      <AvatarImage src={profile.avatarUrl || undefined} />
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{profile.name}</p>
                      {profile.headline && <p className="text-xs text-gray-400 truncate">{profile.headline}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {profile.location && (
                        <span className="hidden lg:flex items-center gap-0.5 text-[10px] text-gray-400">
                          <MapPinIcon className="w-3 h-3" />{profile.location.split(",")[0]}
                        </span>
                      )}
                      {profile.openToWork && (
                        <Badge className="bg-green-50 text-green-600 border-0 text-[9px] font-semibold px-1.5 rounded-full">Open</Badge>
                      )}
                    </div>
                  </button>
                );
              })}
              <button
                type="button"
                onMouseDown={() => { navigate(`/profiles`); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-primary font-semibold border-t border-gray-100 hover:bg-primary/5 transition-colors"
              >
                <SearchIcon className="w-3 h-3" />
                See all results for "{value}"
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAppAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "ME";

  function handleSignOut() {
    logout();
    navigate("/");
  }

  const navItems = [
    { href: "/feed", label: "Home", icon: HomeIcon },
    { href: "/profiles", label: "Network", icon: UsersIcon },
    { href: "/jobs", label: "Jobs", icon: BriefcaseIcon },
    { href: "/applications", label: "Applications", icon: BellIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f2ef]">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={user ? "/feed" : "/"} className="flex-shrink-0 flex items-center">
            <img src={logo} alt="Hire Me Remotely" className="h-8 w-auto" />
          </Link>

          <GlobalSearch />

          <div className="flex-1" />

          <nav className="hidden md:flex items-stretch h-14">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/feed" && item.href !== "/profiles" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1 px-4 min-w-[72px] text-xs font-medium border-b-2 transition-colors ${
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-400"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block h-8 w-px bg-gray-200 mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex-shrink-0 flex flex-col items-center gap-1 px-2 text-xs font-medium text-gray-500 hover:text-gray-900 outline-none">
                <Avatar className="w-7 h-7 border border-gray-300">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block">{user ? user.name.split(" ")[0] : "Me"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {user && (
                <>
                  <div className="px-3 py-2.5 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href={user ? `/profiles/${user.id}` : "/login"} className="flex items-center gap-2 cursor-pointer">
                  <UserIcon className="w-4 h-4" /> View Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user ? (
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-gray-500">
                  <LogOutIcon className="w-4 h-4" /> Sign out
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href="/login" className="flex items-center gap-2 cursor-pointer text-primary font-medium">
                    <LogOutIcon className="w-4 h-4" /> Sign in
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-white shadow-lg">
        <nav className="flex items-stretch h-14">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/feed" && item.href !== "/profiles" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium border-b-2 transition-colors ${
                  isActive ? "border-primary text-primary" : "border-transparent text-gray-400"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
          <Link
            href={user ? `/profiles/${user.id}` : "/login"}
            className={`flex flex-col items-center justify-center gap-1 flex-1 text-xs font-medium border-b-2 transition-colors ${
              location.startsWith("/profiles") ? "border-primary text-primary" : "border-transparent text-gray-400"
            }`}
          >
            <Avatar className="w-5 h-5 border">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-[8px] bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            Me
          </Link>
        </nav>
      </div>
    </div>
  );
}

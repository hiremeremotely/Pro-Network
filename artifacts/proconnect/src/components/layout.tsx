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
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { useAppAuth } from "@/contexts/app-auth";
import { useListProfiles, getListProfilesQueryKey } from "@workspace/api-client-react";

// ── Global typeahead search ───────────────────────────────────────────────────
function GlobalSearch() {
  const [, navigate] = useLocation();
  const { user } = useAppAuth();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 220);
    return () => clearTimeout(t);
  }, [value]);

  const { data, isFetching } = useListProfiles(
    { search: debounced || undefined, limit: 7, offset: 0 },
    {
      query: {
        enabled: debounced.length >= 1,
        queryKey: getListProfilesQueryKey({ search: debounced || undefined, limit: 7, offset: 0 }),
      },
    }
  );

  const suggestions = (data?.profiles ?? []).filter(p => p.id !== user?.id);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setFocused(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const total = suggestions.length + 1; // +1 for "See all" row
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted(h => Math.min(h + 1, total - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0 && highlighted < suggestions.length && suggestions[highlighted]) {
        navigate(`/profiles/${suggestions[highlighted].id}`);
        setValue(""); setOpen(false); setFocused(false); inputRef.current?.blur();
      } else if (value.trim()) {
        navigate(`/profiles`);
        setOpen(false); setFocused(false); inputRef.current?.blur();
      }
    } else if (e.key === "Escape") {
      setOpen(false); setHighlighted(-1); inputRef.current?.blur(); setFocused(false);
    }
  }

  const showDropdown = open && focused && value.length >= 1 && (isFetching || suggestions.length > 0);

  return (
    <div ref={containerRef} className="relative flex-shrink-0 w-[280px] hidden sm:block">
      {/* Input */}
      <div
        className={`flex items-center h-9 rounded-t-[4px] transition-all ${
          showDropdown
            ? "bg-white border border-gray-300 border-b-0 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]"
            : focused
            ? "bg-white border border-primary/60 rounded-b-[4px] shadow-sm"
            : "bg-[#eef3f8] border border-transparent rounded-b-[4px]"
        }`}
      >
        <SearchIcon className="ml-3 w-4 h-4 text-gray-500 flex-shrink-0 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder="Search"
          autoComplete="off"
          className="flex-1 h-full px-2 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none"
          onChange={e => { setValue(e.target.value); setOpen(true); setHighlighted(-1); }}
          onFocus={() => { setFocused(true); if (value.length >= 1) setOpen(true); }}
          onKeyDown={handleKeyDown}
        />
        {value && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); setValue(""); setOpen(false); inputRef.current?.focus(); }}
            className="mr-2 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <XIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown — LinkedIn style: flush below input, white card */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-[36px] z-[300] bg-white border border-gray-300 border-t-0 rounded-b-[4px] shadow-[0_4px_12px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Section header */}
          <div className="px-4 pt-3 pb-1">
            <span className="text-xs font-semibold text-gray-500">
              {isFetching && suggestions.length === 0 ? (
                <span className="flex items-center gap-1.5"><LoaderIcon className="w-3 h-3 animate-spin" />Searching…</span>
              ) : "People"}
            </span>
          </div>

          {/* Result rows */}
          {suggestions.map((profile, i) => {
            const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
            const isHighlighted = highlighted === i;
            return (
              <button
                key={profile.id}
                type="button"
                onMouseDown={() => { navigate(`/profiles/${profile.id}`); setValue(""); setOpen(false); setFocused(false); inputRef.current?.blur(); }}
                onMouseEnter={() => setHighlighted(i)}
                onMouseLeave={() => setHighlighted(-1)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${isHighlighted ? "bg-[#f3f2ef]" : ""}`}
              >
                <Avatar className="w-9 h-9 flex-shrink-0 border border-gray-200">
                  <AvatarImage src={profile.avatarUrl || undefined} />
                  <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{profile.name}</p>
                  {profile.headline && (
                    <p className="text-xs text-gray-500 leading-tight truncate mt-0.5">{profile.headline}</p>
                  )}
                  {profile.openToWork && (
                    <p className="text-[10px] text-green-600 font-medium mt-0.5">Open to work</p>
                  )}
                </div>
              </button>
            );
          })}

          {/* See all results — always last */}
          {suggestions.length > 0 && (
            <button
              type="button"
              onMouseDown={() => { navigate(`/profiles`); setOpen(false); setFocused(false); inputRef.current?.blur(); }}
              onMouseEnter={() => setHighlighted(suggestions.length)}
              onMouseLeave={() => setHighlighted(-1)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 font-medium border-t border-gray-100 transition-colors ${highlighted === suggestions.length ? "bg-[#f3f2ef]" : ""}`}
            >
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <SearchIcon className="w-4 h-4 text-gray-500" />
              </div>
              <span>See all results for <strong>"{value}"</strong></span>
            </button>
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

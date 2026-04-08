import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import logo from "@assets/hr_1775483051104.png";
import { useAppAuth } from "@/contexts/app-auth";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const [search, setSearch] = useState("");
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

          <div className="relative flex-shrink-0 w-64 hidden sm:block">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 pr-4 h-9 bg-[#eef3f8] border-0 rounded-md text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              placeholder="Search"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1" />

          <nav className="hidden md:flex items-stretch h-14">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/feed" && location.startsWith(item.href));
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
            const isActive = location === item.href || (item.href !== "/feed" && location.startsWith(item.href));
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

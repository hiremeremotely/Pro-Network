import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const SESSION_KEY = "app_user_session";

export interface AppUser {
  id: number;
  name: string;
  email: string;
  accountType: string;
  headline: string;
  avatarUrl?: string | null;
}

interface AppAuthCtx {
  user: AppUser | null;
  login: (email: string, password: string, allowedAccountType?: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  accountType: string;
  headline?: string;
  location?: string;
  industry?: string;
  interests?: string[];
}

const Ctx = createContext<AppAuthCtx | null>(null);

function loadUser(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(loadUser);
  const BASE = import.meta.env.BASE_URL;

  const login = useCallback(async (email: string, password: string, allowedAccountType?: string) => {
    try {
      const res = await fetch(`${BASE}api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.profile) {
        const u: AppUser = {
          id: data.profile.id,
          name: data.profile.name,
          email: data.profile.email,
          accountType: data.profile.accountType,
          headline: data.profile.headline,
          avatarUrl: data.profile.avatarUrl,
        };
        if (allowedAccountType && u.accountType !== allowedAccountType) {
          if (allowedAccountType === "company") {
            return { ok: false, error: "This is a professional account. Please use the professional sign-in instead." };
          }
          return { ok: false, error: "This is a company account. Please use 'For Companies' to sign in." };
        }
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      }
      return { ok: false, error: data.error ?? "Login failed." };
    } catch {
      return { ok: false, error: "Server unreachable. Please try again." };
    }
  }, [BASE]);

  const signup = useCallback(async (data: SignupData) => {
    try {
      const res = await fetch(`${BASE}api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (res.ok && json.profile) {
        const u: AppUser = {
          id: json.profile.id,
          name: json.profile.name,
          email: json.profile.email,
          accountType: json.profile.accountType,
          headline: json.profile.headline,
          avatarUrl: json.profile.avatarUrl,
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      }
      return { ok: false, error: json.error ?? "Registration failed." };
    } catch {
      return { ok: false, error: "Server unreachable. Please try again." };
    }
  }, [BASE]);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, login, signup, logout }}>{children}</Ctx.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppAuth must be used inside AppAuthProvider");
  return ctx;
}

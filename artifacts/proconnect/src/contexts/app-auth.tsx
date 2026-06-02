import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const SESSION_KEY = "app_user_session";

export interface AppUser {
  id: number;
  name: string;
  email: string;
  accountType: string;
  headline: string;
  avatarUrl?: string | null;
  authToken?: string;
}

interface AppAuthCtx {
  user: AppUser | null;
  login: (email: string, password: string, allowedAccountType?: string) => Promise<{ ok: boolean; error?: string; unverified?: boolean }>;
  signup: (data: SignupData) => Promise<{ ok: boolean; error?: string; verificationToken?: string }>;
  logout: () => void;
  updateUser: (partial: Partial<AppUser>) => void;
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

  useEffect(() => {
    if (user && !user.authToken) {
      fetch(`${BASE}api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: user.id }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.authToken) {
            const updated = { ...user, authToken: d.authToken };
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            setUser(updated);
          }
        })
        .catch(() => {});
    }
  }, [user?.id]);


  const login = useCallback(async (email: string, password: string, allowedAccountType?: string) => {
    try {
      const res = await fetch(`${BASE}api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === "unverified") {
        return { ok: false, error: data.message ?? "Please verify your email address before signing in.", unverified: true };
      }
      if (res.ok && data.profile) {
        const u: AppUser = {
          id: data.profile.id,
          name: data.profile.name,
          email: data.profile.email,
          accountType: data.profile.accountType,
          headline: data.profile.headline,
          avatarUrl: data.profile.avatarUrl,
          authToken: data.authToken,
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
        return { ok: true, verificationToken: json.verificationToken as string | undefined };
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

  const updateUser = useCallback((partial: Partial<AppUser>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return <Ctx.Provider value={{ user, login, signup, logout, updateUser }}>{children}</Ctx.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppAuth must be used inside AppAuthProvider");
  return ctx;
}

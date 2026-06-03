import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

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
  isLoading: boolean;
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

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    fetch(`${BASE}api/auth/me`, { credentials: "include" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (d?.profile) {
          setUser({
            id: d.profile.id,
            name: d.profile.name,
            email: d.profile.email,
            accountType: d.profile.accountType,
            headline: d.profile.headline,
            avatarUrl: d.profile.avatarUrl,
            authToken: d.authToken,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [BASE]);

  const login = useCallback(async (email: string, password: string, allowedAccountType?: string) => {
    try {
      const res = await fetch(`${BASE}api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
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
        credentials: "include",
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
    void fetch(`${BASE}api/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
  }, [BASE]);

  const updateUser = useCallback((partial: Partial<AppUser>) => {
    setUser(prev => (prev ? { ...prev, ...partial } : null));
  }, []);

  return <Ctx.Provider value={{ user, isLoading, login, signup, logout, updateUser }}>{children}</Ctx.Provider>;
}

export function useAppAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppAuth must be used inside AppAuthProvider");
  return ctx;
}

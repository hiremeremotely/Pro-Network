import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const SESSION_KEY = "bo_admin_session";

interface BoSession {
  token: string;
  name: string;
  email: string;
}

interface BoAuthCtx {
  session: BoSession | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
}

const Ctx = createContext<BoAuthCtx | null>(null);

function loadSession(): BoSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function BoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<BoSession | null>(loadSession);
  const BASE = import.meta.env.BASE_URL;

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${BASE}api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        const s: BoSession = { token: data.token, name: data.name, email: data.email };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
        setSession(s);
        return { ok: true };
      }
      return { ok: false, message: data.message ?? "Invalid credentials." };
    } catch {
      return { ok: false, message: "Server unreachable. Please try again." };
    }
  }, [BASE]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }, []);

  return <Ctx.Provider value={{ session, login, logout }}>{children}</Ctx.Provider>;
}

export function useBoAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBoAuth must be used inside BoAuthProvider");
  return ctx;
}

import { useCallback } from "react";
import { useAppAuth } from "@/contexts/app-auth";

export function useStartChat() {
  const { user } = useAppAuth();
  const BASE = import.meta.env.BASE_URL;

  return useCallback(async (otherProfileId: number): Promise<number | null> => {
    if (!user) return null;
    try {
      const res = await fetch(`${BASE}api/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ myProfileId: user.id, otherProfileId }),
      });
      const conv = await res.json();
      return conv.id ?? null;
    } catch {
      return null;
    }
  }, [user, BASE]);
}

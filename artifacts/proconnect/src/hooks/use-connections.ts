import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAppAuth } from "@/contexts/app-auth";

const BASE = import.meta.env.BASE_URL;

export function useConnections() {
  const { user } = useAppAuth();
  const qc = useQueryClient();

  const { data: following = [], isLoading } = useQuery<number[]>({
    queryKey: ["connections", user?.id],
    queryFn: () =>
      fetch(`${BASE}api/connections?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const followingSet = new Set(following);

  const toggleConnect = useCallback(async (targetId: number) => {
    if (!user) return;
    const connected = followingSet.has(targetId);

    // Optimistic update
    qc.setQueryData<number[]>(["connections", user.id], (old = []) =>
      connected ? old.filter(id => id !== targetId) : [...old, targetId]
    );

    try {
      await fetch(`${BASE}api/connections`, {
        method: connected ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: user.id, followingId: targetId }),
      });
    } catch {
      // Revert on error
      qc.invalidateQueries({ queryKey: ["connections", user.id] });
    }
  }, [user, followingSet, qc]);

  const isConnected = useCallback((targetId: number) => followingSet.has(targetId), [followingSet]);

  return { following, isConnected, toggleConnect, isLoading };
}

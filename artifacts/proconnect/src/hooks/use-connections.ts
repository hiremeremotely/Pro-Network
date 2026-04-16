import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { useAppAuth } from "@/contexts/app-auth";

const BASE = import.meta.env.BASE_URL;

export function useConnections() {
  const { user } = useAppAuth();
  const qc = useQueryClient();

  const { data: following = [], isLoading } = useQuery<number[]>({
    queryKey: ["connections", user?.id],
    queryFn: () => fetch(`${BASE}api/connections?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const { data: pendingOutgoing = [] } = useQuery<number[]>({
    queryKey: ["connections-pending", user?.id],
    queryFn: () => fetch(`${BASE}api/connections/pending?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const followingSet = new Set(following);
  const pendingSet   = new Set(pendingOutgoing);

  const isConnected = useCallback((targetId: number) => followingSet.has(targetId), [followingSet]);
  const isPending   = useCallback((targetId: number) => pendingSet.has(targetId), [pendingSet]);

  const invalidate = useCallback(() => {
    if (!user) return;
    qc.invalidateQueries({ queryKey: ["connections", user.id] });
    qc.invalidateQueries({ queryKey: ["connections-pending", user.id] });
    qc.invalidateQueries({ queryKey: ["connections-network", user.id] });
    qc.invalidateQueries({ queryKey: ["connections-requests", user.id] });
  }, [user, qc]);

  // ── Real-time SSE subscription ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const es = new EventSource(`${BASE}api/events?profileId=${user.id}`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as { type: string };
        if (data.type === "connection_accepted" || data.type === "connection_removed") {
          // Immediately refresh all connection state for this user
          qc.invalidateQueries({ queryKey: ["connections", user.id] });
          qc.invalidateQueries({ queryKey: ["connections-pending", user.id] });
          qc.invalidateQueries({ queryKey: ["connections-network", user.id] });
          qc.invalidateQueries({ queryKey: ["connections-requests", user.id] });
          qc.invalidateQueries({ queryKey: ["notif-count", user.id] });
        }
      } catch { /* ignore parse errors */ }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; no action needed
    };

    return () => es.close();
  }, [user?.id, qc]);

  const sendRequest = useCallback(async (targetId: number, message?: string) => {
    if (!user) return;
    qc.setQueryData<number[]>(["connections-pending", user.id], (old = []) => [...old, targetId]);
    try {
      await fetch(`${BASE}api/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: user.id, followingId: targetId, message }),
      });
    } catch {
      invalidate();
    }
  }, [user, qc, invalidate]);

  const cancelRequest = useCallback(async (targetId: number) => {
    if (!user) return;
    qc.setQueryData<number[]>(["connections-pending", user.id], (old = []) => old.filter(id => id !== targetId));
    try {
      await fetch(`${BASE}api/connections`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: user.id, followingId: targetId }),
      });
    } catch {
      invalidate();
    }
  }, [user, qc, invalidate]);

  const acceptRequest = useCallback(async (requesterId: number) => {
    if (!user) return;
    try {
      await fetch(`${BASE}api/connections/accept`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: requesterId, followingId: user.id }),
      });
      invalidate();
      qc.invalidateQueries({ queryKey: ["notif-count", user.id] });
    } catch {
      invalidate();
    }
  }, [user, qc, invalidate]);

  const declineRequest = useCallback(async (requesterId: number) => {
    if (!user) return;
    try {
      await fetch(`${BASE}api/connections`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: requesterId, followingId: user.id }),
      });
      invalidate();
    } catch {
      invalidate();
    }
  }, [user, qc, invalidate]);

  const disconnect = useCallback(async (targetId: number) => {
    if (!user) return;
    qc.setQueryData<number[]>(["connections", user.id], (old = []) => old.filter(id => id !== targetId));
    try {
      await fetch(`${BASE}api/connections`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerId: user.id, followingId: targetId }),
      });
    } catch {
      invalidate();
    }
  }, [user, qc, invalidate]);

  return {
    following,
    isConnected,
    isPending,
    sendRequest,
    cancelRequest,
    acceptRequest,
    declineRequest,
    disconnect,
    isLoading,
  };
}

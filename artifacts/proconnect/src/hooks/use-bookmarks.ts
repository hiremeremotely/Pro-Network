import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAppAuth } from "@/contexts/app-auth";

const BASE = import.meta.env.BASE_URL;

export type BookmarkType = "job" | "post";

export function useBookmarks() {
  const { user } = useAppAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ jobIds: number[]; postIds: number[] }>({
    queryKey: ["bookmark-ids", user?.id],
    queryFn: () =>
      fetch(`${BASE}api/bookmarks/ids?profileId=${user!.id}`).then(r => r.json()),
    enabled: !!user?.id,
    staleTime: 30_000,
    initialData: { jobIds: [], postIds: [] },
  });

  const jobSet = new Set(data?.jobIds ?? []);
  const postSet = new Set(data?.postIds ?? []);

  const isBookmarked = useCallback(
    (type: BookmarkType, id: number) =>
      type === "job" ? jobSet.has(id) : postSet.has(id),
    [jobSet, postSet]
  );

  const toggleBookmark = useCallback(
    async (type: BookmarkType, id: number) => {
      if (!user) return;
      const already = isBookmarked(type, id);

      qc.setQueryData<{ jobIds: number[]; postIds: number[] }>(
        ["bookmark-ids", user.id],
        (old = { jobIds: [], postIds: [] }) => {
          if (type === "job") {
            return {
              ...old,
              jobIds: already ? old.jobIds.filter(x => x !== id) : [...old.jobIds, id],
            };
          }
          return {
            ...old,
            postIds: already ? old.postIds.filter(x => x !== id) : [...old.postIds, id],
          };
        }
      );

      try {
        await fetch(`${BASE}api/bookmarks`, {
          method: already ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: user.id, itemType: type, itemId: id }),
        });
        qc.invalidateQueries({ queryKey: ["bookmarks", user.id] });
      } catch {
        qc.invalidateQueries({ queryKey: ["bookmark-ids", user.id] });
      }
    },
    [user, isBookmarked, qc]
  );

  return { isBookmarked, toggleBookmark, isLoading };
}

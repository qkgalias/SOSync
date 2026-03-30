/** Purpose: Expose the current user's block list for safety-aware UI filtering. */
import { useEffect, useMemo, useState } from "react";

import type { BlockedUser } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useBlockedUsers = (userId: string | undefined) => {
  const [entries, setEntries] = useState<BlockedUser[]>([]);

  useEffect(() => {
    if (!userId) {
      setEntries([]);
      return;
    }

    return firestoreService.listenToBlockedUsers(userId, setEntries);
  }, [userId]);

  return useMemo(
    () => ({
      entries,
      blockedUserIds: entries.map((entry) => entry.blockedUserId),
      blockUser: async (blockedUserId: string) => {
        if (!userId) {
          return;
        }

        await firestoreService.blockUser(userId, blockedUserId);
      },
      unblockUser: async (blockedUserId: string) => {
        if (!userId) {
          return;
        }

        await firestoreService.unblockUser(userId, blockedUserId);
      },
    }),
    [entries, userId],
  );
};

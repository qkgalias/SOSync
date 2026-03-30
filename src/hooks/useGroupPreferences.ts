/** Purpose: Read and write per-group user safety preferences such as preferred contacts and hotline. */
import { useEffect, useMemo, useState } from "react";

import type { GroupPreferences } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useGroupPreferences = (userId: string | undefined, groupId: string | null) => {
  const [preferences, setPreferences] = useState<GroupPreferences | null>(null);

  useEffect(() => {
    if (!userId || !groupId) {
      setPreferences(null);
      return;
    }

    return firestoreService.listenToGroupPreferences(userId, groupId, setPreferences);
  }, [groupId, userId]);

  return useMemo(
    () => ({
      preferences,
      savePreferences: async (nextPreferences: GroupPreferences) => {
        if (!userId) {
          return;
        }

        await firestoreService.saveGroupPreferences(userId, nextPreferences);
      },
    }),
    [preferences, userId],
  );
};

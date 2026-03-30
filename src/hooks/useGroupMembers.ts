/** Purpose: Load trusted circle members for account, profile, and home views. */
import { useEffect, useMemo, useState } from "react";

import type { GroupMember } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useGroupMembers = (groupId: string | null) => {
  const [members, setMembers] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    return firestoreService.listenToGroupMembers(groupId, setMembers);
  }, [groupId]);

  return useMemo(() => members, [members]);
};

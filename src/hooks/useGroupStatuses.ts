/** Purpose: Subscribe to shared manual safety statuses for the active trusted circle. */
import { useEffect, useMemo, useState } from "react";

import type { GroupStatus } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useGroupStatuses = (groupId: string | null) => {
  const [statuses, setStatuses] = useState<GroupStatus[]>([]);

  useEffect(() => {
    if (!groupId) {
      setStatuses([]);
      return;
    }

    return firestoreService.listenToGroupStatuses(groupId, setStatuses);
  }, [groupId]);

  return useMemo(() => statuses, [statuses]);
};

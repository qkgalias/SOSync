/** Purpose: Subscribe the UI to realtime disaster alerts for the active group. */
import { useEffect, useState } from "react";

import type { DisasterAlert } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useAlerts = (groupId: string | null) => {
  const [alerts, setAlerts] = useState<DisasterAlert[]>([]);

  useEffect(() => {
    if (!groupId) {
      setAlerts([]);
      return;
    }

    return firestoreService.listenToAlerts(groupId, setAlerts);
  }, [groupId]);

  return alerts;
};

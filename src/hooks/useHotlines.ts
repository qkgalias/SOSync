/** Purpose: Subscribe to hotlines for the current launch region. */
import { useEffect, useState } from "react";

import { env } from "@/config/env";
import type { EmergencyHotline } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useHotlines = () => {
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>([]);

  useEffect(() => firestoreService.listenToHotlines(env.defaultRegion, setHotlines), []);

  return hotlines;
};

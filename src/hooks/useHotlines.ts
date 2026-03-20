/** Purpose: Subscribe to hotlines for the current launch region. */
import { useEffect, useState } from "react";

import { env } from "@/config/env";
import { firestoreService } from "@/services/firestoreService";

type Hotline = {
  hotlineId: string;
  name: string;
  phone: string;
  region: string;
};

export const useHotlines = () => {
  const [hotlines, setHotlines] = useState<Hotline[]>([]);

  useEffect(() => firestoreService.listenToHotlines(env.defaultRegion, setHotlines), []);

  return hotlines;
};

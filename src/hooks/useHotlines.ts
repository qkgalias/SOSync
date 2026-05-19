/** Purpose: Subscribe to hotlines for the current launch region. */
import { useEffect, useMemo, useState } from "react";

import { env } from "@/config/env";
import type { EmergencyHotline } from "@/types";
import { firestoreService } from "@/services/firestoreService";
import { PHILIPPINE_HOTLINE_SEED } from "@/utils/constants";

export const useHotlines = () => {
  const fallbackHotlines = useMemo(
    () => PHILIPPINE_HOTLINE_SEED.filter((hotline) => hotline.region === env.defaultRegion),
    [],
  );
  const [hotlines, setHotlines] = useState<EmergencyHotline[]>(fallbackHotlines);

  useEffect(
    () =>
      firestoreService.listenToHotlines(env.defaultRegion, (nextHotlines) => {
        setHotlines(nextHotlines.length ? nextHotlines : fallbackHotlines);
      }),
    [fallbackHotlines],
  );

  return hotlines;
};

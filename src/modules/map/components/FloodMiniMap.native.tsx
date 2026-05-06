/** Purpose: Keep the flood sheet renderable after Home migrates off react-native-maps. */
import { memo } from "react";

import type { FloodLevel, FloodOverview } from "@/types";

type FloodMiniMapProps = {
  level: FloodLevel;
  map: FloodOverview["map"];
};

export const FloodMiniMap = memo(function FloodMiniMap(_props: FloodMiniMapProps) {
  return null;
});

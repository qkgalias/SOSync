/** Purpose: Skip the flood mini-map on web where the Home native map scene already falls back. */
import type { FloodLevel, FloodOverview } from "@/types";

type FloodMiniMapProps = {
  level: FloodLevel;
  map: FloodOverview["map"];
};

export const FloodMiniMap = (_props: FloodMiniMapProps) => null;

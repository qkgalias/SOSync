/** Purpose: Keep web preview free of native Google Navigation SDK imports. */
import type { EvacuationCenter, EvacuationTravelMode, HomeMapAppearance, MapCoordinate } from "@/types";

type EvacuationNavigationOverlayProps = {
  appearance: HomeMapAppearance;
  center: EvacuationCenter | null;
  currentLocation: MapCoordinate | null;
  onClose: () => void;
  onTravelModeChange: (travelMode: EvacuationTravelMode) => void;
  selectedTravelMode: EvacuationTravelMode;
};

export const EvacuationNavigationOverlay = (_props: EvacuationNavigationOverlayProps) => null;

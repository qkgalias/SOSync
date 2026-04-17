/** Purpose: Keep the web preview stable when native map modules are unavailable. */
import { Text, View } from "react-native";

import type { DisasterAlert, EvacuationCenter, HomeMapAppearance, HomeMapFocusTarget, HomeMapMarker } from "@/types";

type MapOverviewProps = {
  alerts: DisasterAlert[];
  centers: EvacuationCenter[];
  focusTarget?: HomeMapFocusTarget | null;
  highlightedCenterId?: string | null;
  mapTheme: HomeMapAppearance;
  markers: HomeMapMarker[];
  onCenterOpenMaps?: (centerId: string) => void;
  onCenterPress?: (centerId: string) => void;
  onMapPress?: () => void;
  onMarkerPress?: (markerId: string) => void;
  onMemberBubbleDismiss?: () => void;
  prefetchedMarkerPhotos?: Record<string, true>;
  selectedCenterId?: string | null;
  selectedMarkerBubbleId?: string | null;
};

export const MapOverview = ({ mapTheme }: MapOverviewProps) => (
  <View
    className="flex-1 items-center justify-center"
    style={{ backgroundColor: mapTheme === "dark" ? "#1F2937" : "#E8EEF3" }}
  >
    <View className="mx-6 rounded-[24px] bg-panel/90 px-6 py-5">
      <Text className="text-[18px] font-semibold text-ink">Map preview unavailable</Text>
      <Text className="mt-2 text-sm leading-6 text-muted">
        The Home map uses native map components, so this full-screen scene is available in iOS and Android development
        builds rather than the web preview.
      </Text>
    </View>
  </View>
);

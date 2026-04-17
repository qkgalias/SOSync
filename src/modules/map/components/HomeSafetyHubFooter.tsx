/** Purpose: Render the Home sheet safety-hub card without mixing it into the main screen file. */
import { Text, View } from "react-native";
import { TouchableOpacity as BottomSheetTouchableOpacity } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  getHomeShadowStyle,
  getHomeSafetyHubHeading,
  type HomeMapPalette,
} from "@/modules/map/homeMapTheme";
import type { EvacuationCenter, HomeMapAppearance } from "@/types";

type HomeSafetyHubFooterProps = {
  activeHubCenter: EvacuationCenter | null;
  appearance: HomeMapAppearance;
  hubSummaryLabel: string;
  nearestCenterId: string | null;
  onOpenInMaps: () => void;
  palette: HomeMapPalette;
};

export const HomeSafetyHubFooter = ({
  activeHubCenter,
  appearance,
  hubSummaryLabel,
  nearestCenterId,
  onOpenInMaps,
  palette,
}: HomeSafetyHubFooterProps) => (
  <View className="px-5 pb-1 pt-3">
    <View className="border-t pt-4" style={{ borderTopColor: palette.divider }}>
      <Text className="text-[18px] font-semibold" style={{ color: palette.sheetText }}>
        {getHomeSafetyHubHeading(activeHubCenter?.centerId, nearestCenterId)}
      </Text>
      <View
        style={[
          getHomeShadowStyle(appearance, "primaryButton"),
          {
            backgroundColor: appearance === "dark" ? "#6C1F1D" : "#7B1F1E",
            borderRadius: 22,
            marginTop: 12,
            opacity: activeHubCenter ? 1 : 0.5,
            paddingHorizontal: 18,
            paddingVertical: 16,
          },
        ]}
      >
        <View className="flex-row items-center">
          <MaterialCommunityIcons color="#FFFFFF" name="home-city-outline" size={24} />
          <View className="ml-3 flex-1">
            <Text className="text-[20px] font-semibold text-white">
              {activeHubCenter?.name ?? "No safety hub available"}
            </Text>
            <Text className="mt-1 text-[13px] text-white/80">
              {activeHubCenter
                ? hubSummaryLabel
                : "Location access is required to resolve nearby hubs."}
            </Text>
          </View>
          <MaterialCommunityIcons color="#FFFFFF" name="navigation-variant" size={20} />
        </View>
        <View className="mt-4">
          <BottomSheetTouchableOpacity
            activeOpacity={0.88}
            disabled={!activeHubCenter}
            onPress={onOpenInMaps}
            style={[
              getHomeShadowStyle(appearance, "secondaryButton"),
              {
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderRadius: 999,
                flexDirection: "row",
                justifyContent: "center",
                opacity: activeHubCenter ? 1 : 0.55,
                paddingHorizontal: 14,
                paddingVertical: 12,
              },
            ]}
          >
            <MaterialCommunityIcons color={palette.share} name="google-maps" size={16} />
            <Text className="ml-2 text-[14px] font-semibold" style={{ color: palette.share }}>
              Open in Maps
            </Text>
          </BottomSheetTouchableOpacity>
        </View>
      </View>
    </View>
  </View>
);

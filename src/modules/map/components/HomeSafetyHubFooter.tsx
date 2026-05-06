/** Purpose: Render nearby evacuation centers in the Home sheet and expose navigation controls. */
import { Text, View } from "react-native";
import { TouchableOpacity as BottomSheetTouchableOpacity } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getHomeShadowStyle, type HomeMapPalette } from "@/modules/map/homeMapTheme";
import type { EvacuationCenter, HomeMapAppearance } from "@/types";
import { toDistanceLabel } from "@/utils/helpers";

type NearbySafetyHub = Pick<
  EvacuationCenter,
  "centerId" | "latitude" | "longitude" | "name"
> &
  Partial<
    Pick<
      EvacuationCenter,
      | "address"
      | "capacity"
      | "city"
      | "contact"
      | "distanceMeters"
      | "islandGroup"
      | "province"
      | "region"
      | "serviceRadiusKm"
    >
  >;

type HomeSafetyHubFooterProps = {
  appearance: HomeMapAppearance;
  nearbySafetyHubs: NearbySafetyHub[];
  onStartNavigation: (centerId: string) => void;
  palette: HomeMapPalette;
  selectedCenterId: string | null;
};

export const HomeSafetyHubFooter = ({
  appearance,
  nearbySafetyHubs,
  onStartNavigation,
  palette,
  selectedCenterId,
}: HomeSafetyHubFooterProps) => (
  <View className="px-5 pb-1 pt-3">
    <View className="border-t pt-4" style={{ borderTopColor: palette.divider }}>
      <Text className="text-[18px] font-semibold" style={{ color: palette.sheetText }}>
        Nearby Safety Hubs
      </Text>

      <View className="mt-3 gap-3">
        {nearbySafetyHubs.length ? (
          nearbySafetyHubs.map((center) => {
            const distanceLabel = center.distanceMeters != null
              ? `${toDistanceLabel(center.distanceMeters)} away`
              : "Nearby";
            const isSelected = center.centerId === selectedCenterId;

            return (
              <View
                key={center.centerId}
                className="rounded-[26px]"
                style={[
                  getHomeShadowStyle(appearance, "primaryButton"),
                  {
                    backgroundColor: appearance === "dark" ? "#6C1F1D" : "#7B1F1E",
                    borderColor: isSelected ? "rgba(255, 255, 255, 0.24)" : "rgba(255, 255, 255, 0.12)",
                    borderWidth: 1,
                    opacity: isSelected ? 1 : 0.98,
                    paddingHorizontal: 16,
                    paddingVertical: 15,
                  },
                ]}
              >
                <View className="flex-row items-start">
                  <MaterialCommunityIcons color="#FFFFFF" name="home-city-outline" size={24} />
                  <View className="ml-3 flex-1">
                    <Text className="text-[18px] font-semibold text-white">{center.name}</Text>
                    <Text className="mt-1 text-[13px] text-white">{distanceLabel}</Text>
                  </View>
                  <BottomSheetTouchableOpacity
                    activeOpacity={0.88}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => onStartNavigation(center.centerId)}
                    style={{
                      alignItems: "center",
                      height: 40,
                      justifyContent: "center",
                      marginLeft: 12,
                      width: 40,
                    }}
                  >
                    <MaterialCommunityIcons color="#FFFFFF" name="navigation-variant" size={20} />
                  </BottomSheetTouchableOpacity>
                </View>
              </View>
            );
          })
        ) : (
          <View
            className="rounded-[24px] px-4 py-4"
            style={{
              backgroundColor: appearance === "dark" ? "#2A2E35" : "#FFFFFF",
              borderColor: palette.divider,
              borderWidth: 1,
            }}
          >
            <Text className="text-[15px] font-semibold" style={{ color: palette.sheetText }}>
              No nearby safety hubs available
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: palette.sheetTextMuted }}>
              Location access is required to resolve nearby hubs.
            </Text>
          </View>
        )}
      </View>
    </View>
  </View>
);

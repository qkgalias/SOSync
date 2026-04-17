/** Purpose: Render the static Home sheet header so the screen does not own large header JSX blocks. */
import { Text, View } from "react-native";
import { TouchableOpacity as BottomSheetTouchableOpacity } from "@gorhom/bottom-sheet";
import { ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  getHomeShadowStyle,
  type HomeMapPalette,
} from "@/modules/map/homeMapTheme";
import type { Group, HomeMapAppearance } from "@/types";

export type HomeSheetWeatherPreview = {
  headlineText: string;
  locationText: string;
  variant: "loading" | "permission" | "ready" | "unavailable";
};

type HomeSheetHeaderProps = {
  activeGroupName: string;
  appearance: HomeMapAppearance;
  groups: Group[];
  isSharingLive: boolean;
  onOpenSos: () => void;
  onSelectGroup: (groupId: string) => void;
  onToggleSharing: () => void;
  palette: HomeMapPalette;
  selectedGroupId: string | null;
  weatherPreview: HomeSheetWeatherPreview;
};

export const HomeSheetHeader = ({
  activeGroupName,
  appearance,
  groups,
  isSharingLive,
  onOpenSos,
  onSelectGroup,
  onToggleSharing,
  palette,
  selectedGroupId,
  weatherPreview,
}: HomeSheetHeaderProps) => (
  <View className="px-5 pt-1">
    <View className="mb-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Text
            className="text-[15px] font-semibold"
            numberOfLines={1}
            style={{ color: palette.sheetText }}
          >
            {weatherPreview.headlineText}
          </Text>
          <Text
            className="mt-1 text-[12px]"
            numberOfLines={1}
            style={{ color: palette.sheetTextMuted }}
          >
            {weatherPreview.locationText}
          </Text>
        </View>
        <BottomSheetTouchableOpacity
          activeOpacity={0.85}
          onPress={onToggleSharing}
          style={[
            getHomeShadowStyle(appearance, "primaryButton"),
            {
              alignItems: "center",
              backgroundColor: palette.share,
              borderRadius: 999,
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
            },
          ]}
        >
          <MaterialCommunityIcons
            color="#FFFFFF"
            name={isSharingLive ? "pause" : "share-variant"}
            size={16}
          />
          <Text className="ml-2.5 text-[15px] font-semibold text-white">
            {isSharingLive ? "Pause Live" : "Share Live"}
          </Text>
        </BottomSheetTouchableOpacity>
      </View>
      <Text className="mt-4 text-[22px] font-semibold" style={{ color: palette.sheetText }}>
        {activeGroupName}
      </Text>
      <Text className="mt-1 text-[14px]" style={{ color: isSharingLive ? palette.statusDot : palette.sheetTextMuted }}>
        {isSharingLive ? "Live tracking active" : "Live tracking paused"}
      </Text>
      <BottomSheetTouchableOpacity
        activeOpacity={0.88}
        onPress={onOpenSos}
        style={[
          getHomeShadowStyle(appearance, "primaryButton"),
          {
            alignItems: "center",
            backgroundColor: palette.danger,
            borderRadius: 22,
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 16,
          },
        ]}
      >
        <View className="flex-row items-center">
          <MaterialCommunityIcons color="#FFFFFF" name="alert-circle-outline" size={20} />
          <Text className="ml-3 text-[18px] font-semibold text-white">Report/SOS</Text>
        </View>
      </BottomSheetTouchableOpacity>
    </View>

    {groups.length > 1 ? (
      <View className="mb-5">
        <Text className="mb-3 text-[18px] font-semibold" style={{ color: palette.sheetText }}>
          Trusted circles
        </Text>
      <View
          style={{
            marginHorizontal: -6,
            minHeight: 58,
            overflow: "visible",
            paddingHorizontal: 6,
            paddingVertical: 2,
          }}
        >
          <GestureHandlerScrollView
            horizontal
            contentContainerStyle={{
              alignItems: "center",
              minHeight: 50,
              paddingRight: 10,
            }}
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            style={{ overflow: "visible" }}
          >
            {groups.map((group) => {
              const selected = group.groupId === selectedGroupId;
              return (
                <BottomSheetTouchableOpacity
                  activeOpacity={0.85}
                  key={group.groupId}
                  onPress={() => onSelectGroup(group.groupId)}
                  style={[
                    getHomeShadowStyle(appearance, "chip"),
                    {
                      alignItems: "center",
                      backgroundColor: selected ? palette.danger : palette.chip,
                      borderRadius: 999,
                      justifyContent: "center",
                      marginRight: 10,
                      minHeight: 42,
                      minWidth: 86,
                      paddingHorizontal: 16,
                      paddingVertical: 0,
                    },
                  ]}
                >
                  <Text
                    className="text-[13px] font-semibold"
                    style={{ color: selected ? "#FFFFFF" : palette.sheetText }}
                  >
                    {group.name}
                  </Text>
                </BottomSheetTouchableOpacity>
              );
            })}
          </GestureHandlerScrollView>
        </View>
      </View>
    ) : null}

    <View className="mb-1 border-t pt-4" style={{ borderTopColor: palette.divider }}>
      <Text className="text-[18px] font-semibold" style={{ color: palette.sheetText }}>
        Contacts
      </Text>
    </View>
  </View>
);

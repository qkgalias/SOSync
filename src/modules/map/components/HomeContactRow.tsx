/** Purpose: Render one Home sheet contact row without owning any Home screen state. */
import { Image, Pressable, Text, View } from "react-native";
import { TouchableOpacity as BottomSheetTouchableOpacity } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { HomeMapPalette, HomeContactItem } from "@/modules/map/homeMapTheme";
import { toInitials } from "@/utils/helpers";

type HomeContactRowProps = {
  onCallContact: (name: string, phoneNumber: string) => void;
  item: HomeContactItem;
  onFocusMarker: (markerId: string) => void;
  palette: HomeMapPalette;
};

export const HomeContactRow = ({ item, onCallContact, onFocusMarker, palette }: HomeContactRowProps) => (
  <View className="flex-row items-center px-5 py-3">
    <View className="mr-3 h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: palette.chip }}>
      {item.member.photoURL ? (
        <Image className="h-10 w-10 rounded-full" resizeMode="cover" source={{ uri: item.member.photoURL }} />
      ) : (
        <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
          {toInitials(item.member.displayName)}
        </Text>
      )}
    </View>
    <View className="flex-1">
      {item.member.phoneNumber ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={6}
          onPress={() => onCallContact(item.member.displayName, item.member.phoneNumber!)}
        >
          {({ pressed }) => (
            <Text
              className="text-[16px] font-medium"
              style={{ color: palette.sheetText, opacity: pressed ? 0.72 : 1 }}
            >
              {item.member.displayName}
            </Text>
          )}
        </Pressable>
      ) : (
        <Text className="text-[16px] font-medium" style={{ color: palette.sheetText }}>
          {item.member.displayName}
        </Text>
      )}
      <Text className="mt-1 text-[13px]" style={{ color: palette.sheetTextMuted }}>
        {item.subtitle}
      </Text>
    </View>
    <BottomSheetTouchableOpacity
      activeOpacity={0.85}
      disabled={!item.marker}
      onPress={() => item.marker && onFocusMarker(item.marker.markerId)}
      style={{
        alignItems: "center",
        borderRadius: 999,
        height: 44,
        justifyContent: "center",
        opacity: item.marker ? 1 : 0.4,
        width: 44,
      }}
    >
      <MaterialCommunityIcons color={palette.iconTint} name="map-marker-account-outline" size={18} />
    </BottomSheetTouchableOpacity>
  </View>
);

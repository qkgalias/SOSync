/** Purpose: Render the coral-accented bottom navigation with a central SOS action. */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/utils/helpers";

const iconByRoute: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  home: "map-marker-radius-outline",
  hotlines: "phone-in-talk-outline",
  sos: "alarm-light",
  notifications: "bell-outline",
  profile: "account-outline",
};

export const PrototypeTabBar = ({ descriptors, navigation, state }: BottomTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { authUser, selectedGroupId } = useAuthSession();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const { unreadCount } = useNotifications(selectedGroupId, authUser?.uid, blockedUserIds);

  return (
    <View
      className="border-t border-line bg-white px-3 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      <View className="flex-row items-end justify-between">
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key]?.options ?? {};
          const label = typeof options.title === "string" ? options.title : route.name;
          const isSos = route.name === "sos";
          const badgeLabel = unreadCount > 9 ? "9+" : `${unreadCount}`;

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              className="flex-1 items-center justify-end"
              onPress={() => navigation.navigate(route.name)}
            >
              <View
                className={isSos ? "mb-1 h-14 w-14 items-center justify-center rounded-full bg-accent" : "items-center justify-center"}
              >
                <MaterialCommunityIcons
                  color={isSos ? "#FFFFFF" : isFocused ? "#7B2C28" : "#8F8A8A"}
                  name={iconByRoute[route.name] ?? "circle-outline"}
                  size={isSos ? 30 : 24}
                />
                {route.name === "notifications" && unreadCount > 0 ? (
                  <View className="absolute -right-3 -top-2 min-w-[20px] rounded-full bg-accent px-1.5 py-0.5">
                    <Text className="text-center text-[10px] font-semibold text-white">{badgeLabel}</Text>
                  </View>
                ) : null}
              </View>
              <Text className={cn("mt-1 text-[11px]", isFocused ? "text-accent" : "text-muted")}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

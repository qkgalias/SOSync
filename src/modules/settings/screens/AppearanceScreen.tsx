/** Purpose: Let users manage the SOSync app appearance from the signed-in profile flow. */
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { USER_SEED } from "@/utils/constants";
import { goBackOrReplace } from "@/utils/helpers";

type AppearanceIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export default function AppearanceScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useAuthSession();
  const { themeTokens } = useAppTheme();
  const selectedTheme = profile?.preferences?.theme ?? USER_SEED.preferences.theme;

  const handleSelectTheme = async (theme: "light" | "dark" | "system") => {
    await saveProfile({
      preferences: {
        ...(profile?.preferences ?? USER_SEED.preferences),
        theme,
      },
    });
  };

  return (
    <Screen
      title="Appearance"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/(tabs)/profile")} />}
      contentClassName="pb-10"
    >
      <Text className="mb-3 mt-7 text-[16px] font-semibold text-ink">Theme</Text>
      <View className="rounded-[22px] bg-panel px-5 py-3">
        {[
          {
            icon: "moon-waning-crescent" as AppearanceIconName,
            title: "Dark",
            value: "dark" as const,
          },
          {
            icon: "weather-sunny" as AppearanceIconName,
            title: "Light",
            value: "light" as const,
          },
          {
            icon: "theme-light-dark" as AppearanceIconName,
            title: "System",
            value: "system" as const,
          },
        ].map((option, index, items) => {
          const selected = selectedTheme === option.value;

          return (
            <Pressable
              key={option.value}
              className={`${index === items.length - 1 ? "pb-1" : "border-b border-line pb-4"} ${
                index === 0 ? "pt-1" : "pt-4"
              } flex-row items-center`}
              onPress={() => {
                void handleSelectTheme(option.value);
              }}
            >
              <View className="h-8 w-8 items-center justify-center">
                <MaterialCommunityIcons color={themeTokens.accentPrimary} name={option.icon} size={26} />
              </View>
              <Text className="ml-4 flex-1 text-[18px] text-ink">{option.title}</Text>
              {selected ? <MaterialCommunityIcons color={themeTokens.accentPrimary} name="check" size={22} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text className="mb-3 mt-8 text-[16px] font-semibold text-ink">Language</Text>
      <View className="rounded-[22px] bg-panel px-5 py-4">
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center">
            <MaterialCommunityIcons color={themeTokens.accentPrimary} name="earth" size={26} />
          </View>
          <Text className="ml-4 text-[18px] text-ink">English</Text>
        </View>
      </View>

      <Text className="mb-3 mt-8 text-[16px] font-semibold text-ink">Text</Text>
      <View className="rounded-[22px] bg-panel px-5 py-4">
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center">
            <MaterialCommunityIcons color={themeTokens.accentPrimary} name="format-font" size={26} />
          </View>
          <Text className="ml-4 flex-1 text-[18px] text-ink">Font</Text>
          <Text className="mr-2 text-[18px] text-ink">System</Text>
          <MaterialCommunityIcons color={themeTokens.textPrimary} name="chevron-right" size={24} />
        </View>
      </View>
    </Screen>
  );
}

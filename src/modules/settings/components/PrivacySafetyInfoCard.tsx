import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useAppTheme } from "@/providers/AppThemeProvider";
import type { PrivacySafetyCardContent } from "@/modules/settings/privacySafetyContent";

export const PrivacySafetyInfoCard = ({ body, iconName, title }: PrivacySafetyCardContent) => {
  const { themeTokens } = useAppTheme();

  return (
    <View className="mb-3 flex-row rounded-[18px] bg-panel px-4 py-4">
      <View className="mr-4 mt-0.5 h-10 w-10 items-center justify-center">
        <MaterialCommunityIcons color={themeTokens.accentPrimary} name={iconName} size={30} />
      </View>
      <View className="flex-1">
        <Text className="text-[18px] font-medium leading-[22px] text-ink">{title}</Text>
        <Text className="mt-1 text-[13px] leading-[18px] text-muted">{body}</Text>
      </View>
    </View>
  );
};

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { useAppTheme } from "@/providers/AppThemeProvider";

type HelpActionTileProps = {
  title: string;
  subtitle: string;
  iconName: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
};

export const HelpActionTile = ({ iconName, onPress, subtitle, title }: HelpActionTileProps) => {
  const { themeTokens } = useAppTheme();

  return (
    <Pressable className="flex-1 rounded-[18px] bg-panel px-4 py-5" onPress={onPress}>
      <View className="items-center">
        <MaterialCommunityIcons color={themeTokens.accentPrimary} name={iconName} size={26} />
        <Text className="mt-4 text-center text-[14px] font-medium uppercase tracking-[0.04em] text-ink">{title}</Text>
        <Text className="mt-3 text-center text-[12px] leading-[16px] text-muted">{subtitle}</Text>
      </View>
    </Pressable>
  );
};

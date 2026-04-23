import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import type { HelpFaqItem } from "@/modules/settings/helpAboutContent";
import { useAppTheme } from "@/providers/AppThemeProvider";

type HelpAccordionItemProps = HelpFaqItem & {
  expanded: boolean;
  onPress: () => void;
};

export const HelpAccordionItem = ({ answer, expanded, onPress, question }: HelpAccordionItemProps) => {
  const { themeTokens } = useAppTheme();

  return (
    <View className="mb-3 overflow-hidden rounded-[16px] bg-panel">
      <Pressable className="flex-row items-center px-4 py-4" onPress={onPress}>
        <Text className="flex-1 text-[16px] font-medium leading-[22px] text-ink">{question}</Text>
        <MaterialCommunityIcons
          color={themeTokens.textPrimary}
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
        />
      </Pressable>
      {expanded ? (
        <View className="border-t border-line px-4 py-4">
          <Text className="text-[14px] leading-6 text-muted">{answer}</Text>
        </View>
      ) : null}
    </View>
  );
};

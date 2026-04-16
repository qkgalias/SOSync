/** Purpose: Provide a consistent minimalist back affordance used across prototype-styled screens. */
import { Pressable } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/providers/AppThemeProvider";

type BackButtonProps = {
  onPress: () => void;
};

export const BackButton = ({ onPress }: BackButtonProps) => {
  const { themeTokens } = useAppTheme();

  return (
    <Pressable className="h-12 w-12 items-start justify-center" hitSlop={10} onPress={onPress}>
      <MaterialCommunityIcons color={themeTokens.textPrimary} name="chevron-left" size={34} />
    </Pressable>
  );
};

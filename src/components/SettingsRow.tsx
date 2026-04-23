/** Purpose: Standardize the gray settings rows used across account, privacy, and help flows. */
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/providers/AppThemeProvider";
import { cn } from "@/utils/helpers";

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  trailingText?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  iconContainerClassName?: string;
  showChevron?: boolean;
  chevronColor?: string;
  toggleActiveColor?: string;
};

export const SettingsRow = ({
  className,
  icon,
  iconContainerClassName,
  onPress,
  onToggleChange,
  showChevron,
  subtitle,
  subtitleClassName,
  title,
  titleClassName,
  chevronColor,
  toggleActiveColor,
  toggleValue,
  trailingText,
}: SettingsRowProps) => {
  const { themeTokens } = useAppTheme();
  const resolvedChevronColor = chevronColor ?? themeTokens.textPrimary;
  const resolvedToggleActiveColor = toggleActiveColor ?? themeTokens.accentPrimary;
  const resolvedToggleThumbColor = "#F5F7FA";

  return (
    <Pressable
      className={cn("mb-4 flex-row items-center rounded-[20px] bg-panel px-5 py-4", className)}
      disabled={!onPress && onToggleChange === undefined}
      onPress={onPress}
    >
      {icon ? <View className={cn("mr-4 h-8 w-8 items-center justify-center", iconContainerClassName)}>{icon}</View> : null}
      <View className="flex-1">
        <Text className={cn("text-[18px] font-medium leading-[22px] text-ink", titleClassName)}>{title}</Text>
        {subtitle ? (
          <Text className={cn("mt-1 text-[13px] leading-[18px] text-muted", subtitleClassName)}>{subtitle}</Text>
        ) : null}
      </View>
      {typeof toggleValue === "boolean" && onToggleChange ? (
        <Switch
          onValueChange={onToggleChange}
          thumbColor={resolvedToggleThumbColor}
          trackColor={{ false: themeTokens.borderStrong, true: resolvedToggleActiveColor }}
          value={toggleValue}
        />
      ) : null}
      {trailingText ? <Text className="mr-1 text-[15px] text-muted">{trailingText}</Text> : null}
      {(showChevron ?? Boolean(onPress)) ? (
        <MaterialCommunityIcons color={resolvedChevronColor} name="chevron-right" size={26} />
      ) : null}
    </Pressable>
  );
};

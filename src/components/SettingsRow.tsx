/** Purpose: Standardize the gray settings rows used across account, privacy, and help flows. */
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggleChange?: (value: boolean) => void;
  trailingText?: string;
};

export const SettingsRow = ({
  icon,
  onPress,
  onToggleChange,
  subtitle,
  title,
  toggleValue,
  trailingText,
}: SettingsRowProps) => (
  <Pressable
    className="mb-3 flex-row items-center rounded-[14px] bg-panel px-4 py-3"
    disabled={!onPress && onToggleChange === undefined}
    onPress={onPress}
  >
    {icon ? <View className="mr-3">{icon}</View> : null}
    <View className="flex-1">
      <Text className="text-[16px] text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-xs leading-4 text-muted">{subtitle}</Text> : null}
    </View>
    {typeof toggleValue === "boolean" && onToggleChange ? (
      <Switch
        onValueChange={onToggleChange}
        thumbColor="#FFFFFF"
        trackColor={{ false: "#8A8A8A", true: "#7B2C28" }}
        value={toggleValue}
      />
    ) : null}
    {trailingText ? <Text className="text-sm text-muted">{trailingText}</Text> : null}
    {onPress ? <MaterialCommunityIcons color="#111111" name="chevron-right" size={26} /> : null}
  </Pressable>
);

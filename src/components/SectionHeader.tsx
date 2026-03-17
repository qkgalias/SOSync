/** Purpose: Label grouped content sections without adding a full card wrapper. */
import { Text, View } from "react-native";

export const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <View className="mb-3 mt-2">
    <Text className="text-lg font-bold text-ink">{title}</Text>
    {subtitle ? <Text className="mt-1 text-sm text-muted">{subtitle}</Text> : null}
  </View>
);

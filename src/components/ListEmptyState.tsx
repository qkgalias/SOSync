/** Purpose: Provide a polished fallback when a list has no realtime data yet. */
import { Text, View } from "react-native";

export const ListEmptyState = ({ message }: { message: string }) => (
  <View className="rounded-card border border-dashed border-line bg-surface/80 p-5">
    <Text className="text-sm leading-6 text-muted">{message}</Text>
  </View>
);

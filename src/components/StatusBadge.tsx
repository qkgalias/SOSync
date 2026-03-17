/** Purpose: Show alert severity and state badges with consistent color semantics. */
import { Text, View } from "react-native";

import { cn } from "@/utils/helpers";

const badgeContainerClasses: Record<string, string> = {
  advisory: "bg-primary/10",
  watch: "bg-caution/15",
  warning: "bg-danger/15",
  critical: "bg-danger",
  active: "bg-danger/15",
  resolved: "bg-accent/15",
};

const badgeTextClasses: Record<string, string> = {
  advisory: "text-primary",
  watch: "text-caution",
  warning: "text-danger",
  critical: "text-white",
  active: "text-danger",
  resolved: "text-accent",
};

export const StatusBadge = ({ label }: { label: string }) => (
  <View className={cn("rounded-full px-3 py-1.5", badgeContainerClasses[label] ?? "bg-line")}>
    <Text className={cn("text-xs font-bold uppercase tracking-[0.16em]", badgeTextClasses[label] ?? "text-ink")}>
      {label}
    </Text>
  </View>
);

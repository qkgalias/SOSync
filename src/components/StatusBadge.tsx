/** Purpose: Show alert severity and state badges with consistent color semantics. */
import { Text, View } from "react-native";

import { cn } from "@/utils/helpers";

const badgeContainerClasses: Record<string, string> = {
  advisory: "bg-soft",
  watch: "bg-caution/20",
  warning: "bg-danger/15",
  critical: "bg-danger",
  active: "bg-danger/15",
  resolved: "bg-white",
  safe: "bg-white",
  need_help: "bg-danger/15",
  need_evacuation: "bg-caution/20",
  unavailable: "bg-white",
};

const badgeTextClasses: Record<string, string> = {
  advisory: "text-accent",
  watch: "text-caution",
  warning: "text-danger",
  critical: "text-white",
  active: "text-danger",
  resolved: "text-accent",
  safe: "text-accent",
  need_help: "text-danger",
  need_evacuation: "text-caution",
  unavailable: "text-muted",
};

export const StatusBadge = ({ label }: { label: string }) => (
  <View className={cn("rounded-full px-3 py-1.5", badgeContainerClasses[label] ?? "bg-line")}>
    <Text className={cn("text-xs font-semibold uppercase tracking-[0.08em]", badgeTextClasses[label] ?? "text-ink")}>
      {label}
    </Text>
  </View>
);

/** Purpose: Show alert severity and state badges with consistent color semantics. */
import { Text, View } from "react-native";

import { cn } from "@/utils/helpers";

const badgeContainerClasses: Record<string, string> = {
  advisory: "bg-soft",
  watch: "bg-warningSurface",
  warning: "bg-dangerSurface",
  critical: "bg-danger",
  active: "bg-dangerSurface",
  resolved: "bg-successSurface",
  safe: "bg-successSurface",
  need_help: "bg-dangerSurface",
  need_evacuation: "bg-warningSurface",
  unavailable: "bg-panel",
};

const badgeTextClasses: Record<string, string> = {
  advisory: "text-accent",
  watch: "text-warningText",
  warning: "text-dangerText",
  critical: "text-white",
  active: "text-dangerText",
  resolved: "text-successText",
  safe: "text-successText",
  need_help: "text-dangerText",
  need_evacuation: "text-warningText",
  unavailable: "text-muted",
};

export const StatusBadge = ({ label }: { label: string }) => (
  <View className={cn("rounded-full px-3 py-1.5", badgeContainerClasses[label] ?? "bg-line")}>
    <Text className={cn("text-xs font-semibold uppercase tracking-[0.08em]", badgeTextClasses[label] ?? "text-ink")}>
      {label}
    </Text>
  </View>
);

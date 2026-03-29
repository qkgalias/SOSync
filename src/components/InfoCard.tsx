/** Purpose: Show highlighted content blocks for alerts, profile facts, and map stats. */
import type { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
}>;

export const InfoCard = ({ children, eyebrow, rightSlot, title }: InfoCardProps) => (
  <View className="mb-4 rounded-card bg-panel p-4">
    <View className="mb-3 flex-row items-start justify-between">
      <View className="mr-3 flex-1">
        {eyebrow ? <Text className="mb-1 text-xs text-muted">{eyebrow}</Text> : null}
        <Text className="text-[18px] font-semibold text-ink">{title}</Text>
      </View>
      {rightSlot}
    </View>
    {children}
  </View>
);

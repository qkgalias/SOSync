/** Purpose: Show highlighted content blocks for alerts, profile facts, and map stats. */
import type { PropsWithChildren, ReactNode } from "react";
import { Text, View } from "react-native";

type InfoCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  rightSlot?: ReactNode;
}>;

export const InfoCard = ({ children, eyebrow, rightSlot, title }: InfoCardProps) => (
  <View className="mb-4 rounded-card border border-line bg-surface p-5 shadow-soft">
    <View className="mb-3 flex-row items-start justify-between">
      <View className="mr-3 flex-1">
        {eyebrow ? <Text className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{eyebrow}</Text> : null}
        <Text className="text-xl font-bold text-ink">{title}</Text>
      </View>
      {rightSlot}
    </View>
    {children}
  </View>
);

/** Purpose: Provide a consistent page shell with SOSync background styling. */
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  scroll?: boolean;
}>;

export const Screen = ({ children, rightSlot, scroll = true, subtitle, title }: ScreenProps) => {
  const Wrapper = scroll ? ScrollView : View;

  return (
    <SafeAreaView className="flex-1 bg-canvas">
      <View className="absolute -right-12 top-10 h-40 w-40 rounded-full bg-primary/10" />
      <View className="absolute left-[-36] top-48 h-32 w-32 rounded-full bg-accent/10" />
      <Wrapper className="flex-1 px-6" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="mb-8 mt-4 flex-row items-start justify-between">
          <View className="mr-4 flex-1">
            <Text className="text-4xl font-black tracking-tight text-ink">{title}</Text>
            {subtitle ? <Text className="mt-2 text-base leading-6 text-muted">{subtitle}</Text> : null}
          </View>
          {rightSlot}
        </View>
        {children}
      </Wrapper>
    </SafeAreaView>
  );
};

/** Purpose: Provide a consistent white app shell for prototype-styled screens. */
import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@/utils/helpers";

type ScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  rightSlot?: ReactNode;
  scroll?: boolean;
  leftSlot?: ReactNode;
  centerTitle?: boolean;
  contentClassName?: string;
  headerClassName?: string;
}>;

export const Screen = ({
  children,
  centerTitle = false,
  contentClassName,
  headerClassName,
  leftSlot,
  rightSlot,
  scroll = true,
  subtitle,
  title,
}: ScreenProps) => {
  const Wrapper = scroll ? ScrollView : View;

  return (
    <SafeAreaView className="flex-1 bg-page">
      <Wrapper className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {title && centerTitle ? (
          <View className={cn("mb-4 flex-row items-center justify-between px-5 pt-3", headerClassName)}>
            <View className="min-w-12">{leftSlot}</View>
            <View className="flex-1 items-center">
              <Text className="text-[20px] font-normal text-ink">{title}</Text>
              {subtitle ? <Text className="mt-1 text-sm text-muted">{subtitle}</Text> : null}
            </View>
            <View className="min-w-12 items-end">{rightSlot}</View>
          </View>
        ) : null}
        <View className={cn("px-5", contentClassName)}>
          {!centerTitle && title ? (
            <View className={cn("mb-6 mt-3", headerClassName)}>
              {leftSlot ? <View className="mb-3">{leftSlot}</View> : null}
              <Text className="text-[32px] font-black tracking-tight text-ink">{title}</Text>
              {subtitle ? <Text className="mt-2 text-base leading-6 text-muted">{subtitle}</Text> : null}
              {rightSlot ? <View className="mt-3">{rightSlot}</View> : null}
            </View>
          ) : null}
          {!title && leftSlot ? <View className="mb-4">{leftSlot}</View> : null}
          {!title && subtitle ? <Text className="mb-4 text-sm text-muted">{subtitle}</Text> : null}
          {children}
        </View>
      </Wrapper>
    </SafeAreaView>
  );
};

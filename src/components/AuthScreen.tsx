/** Purpose: Compose the prototype onboarding screens with a white top area and coral action sheet. */
import type { PropsWithChildren, ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/utils/helpers";

type AuthScreenProps = PropsWithChildren<{
  title?: string;
  subtitle?: string;
  hero?: ReactNode;
  topSlot?: ReactNode;
  footer?: ReactNode;
  sheetClassName?: string;
  scrollable?: boolean;
}>;

export const AuthScreen = ({
  children,
  footer,
  hero,
  scrollable = true,
  sheetClassName,
  subtitle,
  title,
  topSlot,
}: AuthScreenProps) => {
  const insets = useSafeAreaInsets();
  const titleSpacingClassName = scrollable ? "mt-10" : "mt-6";
  const heroSpacingClassName = scrollable ? "mt-8" : "mt-3";
  const topPaddingClassName = scrollable ? "px-7 pt-4 pb-10" : "px-7 pt-4 pb-5";
  const sheetContent = (
    <View className="flex-1 justify-between bg-page">
      <View className={topPaddingClassName}>
        {topSlot ?? <BrandLogo size="sm" />}
        {title ? <Text className={cn(titleSpacingClassName, "text-center text-[20px] font-semibold text-black")}>{title}</Text> : null}
        {subtitle ? <Text className="mt-3 text-center text-sm leading-5 text-muted">{subtitle}</Text> : null}
        {hero ? <View className={heroSpacingClassName}>{hero}</View> : null}
      </View>
      <View
        className={cn("mt-8 rounded-t-[42px] bg-primary px-7 pt-8", !scrollable && "flex-1", sheetClassName)}
        style={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
      >
        {children}
        {footer ? <View className="mt-6">{footer}</View> : null}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-page">
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        {scrollable ? (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {sheetContent}
          </ScrollView>
        ) : (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            {sheetContent}
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
};

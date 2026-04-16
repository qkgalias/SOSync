/** Purpose: Render the app's main button variants with loading states. */
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { useAppTheme } from "@/providers/AppThemeProvider";
import { cn } from "@/utils/helpers";

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  className?: string;
  textClassName?: string;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary",
  secondary: "bg-soft",
  danger: "border border-dangerBorder bg-dangerSurface",
  ghost: "bg-transparent",
  outline: "border border-line bg-page",
};

const textClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-white",
  secondary: "text-softText",
  danger: "text-danger",
  ghost: "text-primary",
  outline: "text-ink",
};

export const Button = ({
  className,
  disabled,
  icon,
  label,
  loading,
  onPress,
  textClassName,
  variant = "primary",
}: ButtonProps) => {
  const { themeTokens } = useAppTheme();
  const loadingColor =
    variant === "primary"
      ? "#FFFFFF"
      : variant === "danger"
        ? themeTokens.dangerText
        : variant === "outline"
          ? themeTokens.textPrimary
          : themeTokens.accentPrimary;

  return (
    <Pressable
      className={cn(
        "min-h-12 flex-row items-center justify-center rounded-[18px] px-5 py-3",
        variantClasses[variant],
        disabled ? "opacity-60" : "active:scale-[0.98]",
        className,
      )}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={loadingColor} />
      ) : (
        <>
          {icon}
          <Text className={cn("text-[17px] font-semibold", textClasses[variant], icon ? "ml-2" : "", textClassName)}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
};

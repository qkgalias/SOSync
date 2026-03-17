/** Purpose: Render the app's main button variants with loading states. */
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

import { cn } from "@/utils/helpers";

type ButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-primary",
  secondary: "bg-surface border border-line",
  danger: "bg-danger",
  ghost: "bg-transparent",
};

const textClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "text-white",
  secondary: "text-ink",
  danger: "text-white",
  ghost: "text-primary",
};

export const Button = ({
  disabled,
  icon,
  label,
  loading,
  onPress,
  variant = "primary",
}: ButtonProps) => (
  <Pressable
    className={cn(
      "min-h-14 flex-row items-center justify-center rounded-card px-5",
      variantClasses[variant],
      disabled ? "opacity-60" : "active:scale-[0.98]",
    )}
    disabled={disabled || loading}
    onPress={onPress}
  >
    {loading ? (
      <ActivityIndicator color={variant === "secondary" || variant === "ghost" ? "#0E1A2B" : "#FFFFFF"} />
    ) : (
      <>
        {icon}
        <Text className={cn("text-base font-bold", textClasses[variant], icon ? "ml-2" : "")}>{label}</Text>
      </>
    )}
  </Pressable>
);

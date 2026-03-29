/** Purpose: Standardize labeled text input fields across onboarding and settings flows. */
import type { ReactNode } from "react";
import { Text, TextInput, View } from "react-native";

import { cn } from "@/utils/helpers";

type TextFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  autoCapitalize?: "none" | "sentences" | "words";
  keyboardType?: "default" | "email-address" | "phone-pad" | "numeric";
  secureTextEntry?: boolean;
  helperText?: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  hideLabel?: boolean;
  rightSlot?: ReactNode;
  errorClassName?: string;
  helperClassName?: string;
};

export const TextField = ({
  autoCapitalize = "none",
  containerClassName,
  error,
  errorClassName,
  helperText,
  helperClassName,
  hideLabel,
  inputClassName,
  keyboardType = "default",
  label,
  labelClassName,
  onChangeText,
  placeholder,
  rightSlot,
  secureTextEntry,
  value,
}: TextFieldProps) => (
  <View className={cn("mb-4", containerClassName)}>
    {!hideLabel ? <Text className={cn("mb-2 text-sm text-muted", labelClassName)}>{label}</Text> : null}
    <View className={cn("flex-row items-center rounded-[12px] bg-white px-4 py-4", inputClassName)}>
      <TextInput
        autoCapitalize={autoCapitalize}
        className="flex-1 p-0 text-base text-ink"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor="#8C8787"
        secureTextEntry={secureTextEntry}
        value={value}
      />
      {rightSlot ? <View className="ml-3">{rightSlot}</View> : null}
    </View>
    {error ? <Text className={cn("mt-2 text-sm text-danger", errorClassName)}>{error}</Text> : null}
    {!error && helperText ? <Text className={cn("mt-2 text-sm text-muted", helperClassName)}>{helperText}</Text> : null}
  </View>
);

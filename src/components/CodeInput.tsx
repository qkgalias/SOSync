/** Purpose: Render the six-cell invite/OTP code entry pattern from the mobile prototype. */
import { useRef } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { cn } from "@/utils/helpers";

type CodeInputProps = {
  value: string;
  onChangeValue: (value: string) => void;
  length?: number;
  cellClassName?: string;
  rowClassName?: string;
  emptyState?: "dot" | "none";
};

export const CodeInput = ({
  cellClassName,
  emptyState = "dot",
  length = 6,
  onChangeValue,
  rowClassName,
  value,
}: CodeInputProps) => {
  const inputRef = useRef<TextInput>(null);
  const characters = value.slice(0, length).split("");

  return (
    <Pressable className="relative" onPress={() => inputRef.current?.focus()}>
      <TextInput
        ref={inputRef}
        keyboardType="number-pad"
        maxLength={length}
        onChangeText={(next) => onChangeValue(next.replace(/\D/g, "").slice(0, length))}
        showSoftInputOnFocus
        value={value}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.01,
        }}
      />

      <View className={cn("flex-row justify-between", rowClassName)}>
        {Array.from({ length }).map((_, index) => (
          <View
            key={index}
            className={cn(
              "h-14 w-12 items-center justify-center rounded-[10px] bg-panel",
              cellClassName,
            )}
          >
            <View className="items-center justify-center">
              {characters[index] ? (
                <Text className="text-[24px] text-ink">{characters[index]}</Text>
              ) : emptyState === "dot" ? (
                <View className="h-1 w-3 rounded-full bg-ink/70" />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </Pressable>
  );
};

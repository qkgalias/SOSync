/** Purpose: Reduce accidental SOS sends by requiring a deliberate long press. */
import { Pressable, Text, View } from "react-native";

type HoldToConfirmButtonProps = {
  label: string;
  helperText: string;
  onConfirm: () => void;
};

export const HoldToConfirmButton = ({ helperText, label, onConfirm }: HoldToConfirmButtonProps) => (
  <View>
    <Pressable
      className="h-40 items-center justify-center rounded-full bg-danger shadow-soft active:scale-[0.98]"
      delayLongPress={900}
      onLongPress={onConfirm}
    >
      <Text className="text-3xl font-black uppercase tracking-[0.25em] text-white">{label}</Text>
    </Pressable>
    <Text className="mt-4 text-center text-sm text-muted">{helperText}</Text>
  </View>
);

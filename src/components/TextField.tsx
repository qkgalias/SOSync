/** Purpose: Standardize labeled text input fields across onboarding and settings flows. */
import { Text, TextInput, View } from "react-native";

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
};

export const TextField = ({
  autoCapitalize = "none",
  error,
  helperText,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: TextFieldProps) => (
  <View className="mb-4">
    <Text className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-muted">{label}</Text>
    <TextInput
      autoCapitalize={autoCapitalize}
      className="rounded-card border border-line bg-surface px-4 py-4 text-base text-ink"
      keyboardType={keyboardType}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94A1B5"
      secureTextEntry={secureTextEntry}
      value={value}
    />
    {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
    {!error && helperText ? <Text className="mt-2 text-sm text-muted">{helperText}</Text> : null}
  </View>
);

/** Purpose: Start the phone-based authentication flow and OTP request. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { phoneSignInSchema } from "@/utils/validators";

export default function SignInNumberScreen() {
  const router = useRouter();
  const { startPhoneSignIn } = useAuthSession();
  const [phoneNumber, setPhoneNumber] = useState("+63");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const parsed = phoneSignInSchema.safeParse({ phoneNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid phone number.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await startPhoneSignIn(phoneNumber);
      router.push("/(onboarding)/verification");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to send the verification code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Verify your number" subtitle="We’ll send a short OTP code for secure sign-in.">
      <TextField
        label="Phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        helperText="Use 111111 as the OTP if you're running without Firebase credentials."
        error={error}
      />
      <Button label="Send code" loading={loading} onPress={handleContinue} />
      <View className="mt-4">
        <Text className="text-sm leading-6 text-muted">
          By continuing, you only authenticate your identity. Location sharing is still opt-in later in onboarding.
        </Text>
      </View>
    </Screen>
  );
}

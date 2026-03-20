/** Purpose: Confirm a phone OTP challenge before profile setup continues. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function VerificationScreen() {
  const router = useRouter();
  const { confirmPhoneCode, pendingPhoneNumber } = useAuthSession();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setLoading(true);
    setError("");

    try {
      await confirmPhoneCode(code);
      router.replace("/(onboarding)/profileSetup");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The code could not be verified.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Enter your code" subtitle="Use the SMS code that was sent to your device.">
      <InfoCard title={pendingPhoneNumber || "Pending verification"} eyebrow="Phone sign-in">
        <Text className="text-sm leading-6 text-muted">
          In demo mode, enter <Text className="font-bold text-ink">111111</Text> to continue.
        </Text>
      </InfoCard>
      <TextField
        label="Verification code"
        value={code}
        onChangeText={setCode}
        keyboardType="numeric"
        error={error}
      />
      <Button label="Verify" loading={loading} onPress={handleVerify} />
      <View className="mt-4">
        <Button label="Back to phone sign in" onPress={() => router.back()} variant="ghost" />
      </View>
    </Screen>
  );
}

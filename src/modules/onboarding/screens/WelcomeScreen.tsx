/** Purpose: Offer the primary authentication and onboarding entry paths. */
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen title="Welcome aboard" subtitle="Choose the sign-in method that best fits your emergency setup.">
      <InfoCard title="Privacy-first by default" eyebrow="Onboarding">
        <Text className="text-base leading-7 text-muted">
          Location sharing stays inside your trusted circles, and permissions are confirmed before anything is
          broadcast.
        </Text>
      </InfoCard>
      <View className="gap-3">
        <Button label="Continue with phone" onPress={() => router.push("/(onboarding)/signInNumber")} />
        <Button
          label="Continue with email"
          onPress={() => router.push("/(onboarding)/signInEmail")}
          variant="secondary"
        />
        <Button label="Create an account" onPress={() => router.push("/(onboarding)/signUp")} variant="ghost" />
      </View>
    </Screen>
  );
}

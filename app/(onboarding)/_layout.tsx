/** Purpose: Group the onboarding flow and keep completed users out of setup routes. */
import { Redirect, Stack } from "expo-router";

import { useAuthSession } from "@/hooks/useAuthSession";

export default function OnboardingLayout() {
  const { isOnboardingComplete, status } = useAuthSession();

  if (status === "signedIn" && isOnboardingComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

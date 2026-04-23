/** Purpose: Group the onboarding flow and keep completed users out of setup routes. */
import { Redirect, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAuthSession } from "@/hooks/useAuthSession";
import { AppThemeScope } from "@/providers/AppThemeProvider";
import { LIGHT_THEME_TOKENS } from "@/theme/appTheme";

export default function OnboardingLayout() {
  const { isOnboardingComplete, status } = useAuthSession();

  if (status === "signedIn" && isOnboardingComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <AppThemeScope resolvedTheme="light" themePreference="light">
      <StatusBar
        animated
        backgroundColor={LIGHT_THEME_TOKENS.bgApp}
        style="dark"
        translucent={false}
      />
      <Stack screenOptions={{ headerShown: false }} />
    </AppThemeScope>
  );
}

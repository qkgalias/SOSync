/** Purpose: Redirect users into onboarding or the main tabs based on session state. */
import { Redirect } from "expo-router";

import { useAuthSession } from "@/hooks/useAuthSession";

const onboardingHref = (step?: string) => {
  switch (step) {
    case "profile":
      return "/(onboarding)/profileSetup";
    case "circle":
      return "/(onboarding)/createCircle";
    case "permissions":
      return "/(onboarding)/permissions";
    case "verify":
      return "/(onboarding)/verification";
    default:
      return "/(onboarding)/welcome";
  }
};

export default function IndexRoute() {
  const { isOnboardingComplete, profile, status } = useAuthSession();

  if (status === "loading") {
    return null;
  }

  if (status === "signedIn" && isOnboardingComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (status === "signedIn") {
    return <Redirect href={onboardingHref(profile?.onboarding.currentStep)} />;
  }

  return <Redirect href="/(onboarding)/splash" />;
}

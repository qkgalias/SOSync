/** Purpose: Redirect users into onboarding or the main tabs based on session state. */
import { Redirect } from "expo-router";

import { useAuthSession } from "@/hooks/useAuthSession";
import { resolveSignedInHref } from "@/utils/sessionRouting";

export default function IndexRoute() {
  const { authUser, isOnboardingComplete, profile, status } = useAuthSession();

  if (status === "loading") {
    return null;
  }

  if (status === "signedIn" && authUser?.emailVerified === false) {
    return <Redirect href="/(onboarding)/verification" />;
  }

  if (status === "signedIn" && isOnboardingComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (status === "signedIn") {
    return <Redirect href={resolveSignedInHref(profile)} />;
  }

  return <Redirect href="/(onboarding)/splash" />;
}

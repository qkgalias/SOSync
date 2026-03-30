/** Purpose: Resolve the next route for signed-in users based on their persisted onboarding state. */
import type { UserProfile } from "@/types";

export const resolveSignedInHref = (profile: UserProfile | null) => {
  const onboarding = profile?.onboarding;
  const security = profile?.security;

  if (!profile || !onboarding) {
    return "/(onboarding)/profileSetup";
  }

  if (!security?.emailVerified || onboarding.currentStep === "verify") {
    return "/(onboarding)/verification";
  }

  if (
    !onboarding.profileComplete ||
    onboarding.currentStep === "welcome" ||
    onboarding.currentStep === "sign-in" ||
    onboarding.currentStep === "profile"
  ) {
    return "/(onboarding)/profileSetup";
  }

  if (
    onboarding.currentStep === "invite"
  ) {
    return "/(onboarding)/invite";
  }

  if (onboarding.currentStep === "circle-name") {
    return "/(onboarding)/createCircleName";
  }

  if (
    !onboarding.circleComplete ||
    onboarding.currentStep === "circle"
  ) {
    return "/(onboarding)/createCircle";
  }

  if (!onboarding.permissionsComplete || onboarding.currentStep === "permissions") {
    return "/(onboarding)/permissions";
  }

  return "/(tabs)/home";
};

/** Purpose: Keep signed-in routing stable when Auth exists before Firestore onboarding data is complete. */
import type { UserProfile } from "@/types";
import { USER_SEED } from "@/utils/constants";
import { resolveSignedInHref } from "@/utils/sessionRouting";

describe("resolveSignedInHref", () => {
  it("sends signed-in users without a profile doc to profile setup", () => {
    expect(resolveSignedInHref(null)).toBe("/(onboarding)/profileSetup");
  });

  it("holds unverified users on the verification screen", () => {
    const profile: UserProfile = {
      ...USER_SEED,
      onboarding: {
        currentStep: "verify",
        profileComplete: false,
        circleComplete: false,
        permissionsComplete: false,
      },
      security: {
        emailVerified: false,
      },
    };

    expect(resolveSignedInHref(profile)).toBe("/(onboarding)/verification");
  });

  it("sends partially onboarded users to circle setup", () => {
    const profile: UserProfile = {
      ...USER_SEED,
      onboarding: {
        currentStep: "circle",
        profileComplete: true,
        circleComplete: false,
        permissionsComplete: false,
      },
    };

    expect(resolveSignedInHref(profile)).toBe("/(onboarding)/createCircle");
  });

  it("returns invite-step users to the invite screen until permissions are complete", () => {
    const profile: UserProfile = {
      ...USER_SEED,
      onboarding: {
        currentStep: "invite",
        profileComplete: true,
        circleComplete: true,
        permissionsComplete: false,
      },
    };

    expect(resolveSignedInHref(profile)).toBe("/(onboarding)/invite");
  });

  it("returns circle-name users to the dedicated naming screen", () => {
    const profile: UserProfile = {
      ...USER_SEED,
      onboarding: {
        currentStep: "circle-name",
        profileComplete: true,
        circleComplete: false,
        permissionsComplete: false,
      },
    };

    expect(resolveSignedInHref(profile)).toBe("/(onboarding)/createCircleName");
  });

  it("sends fully onboarded users home", () => {
    expect(resolveSignedInHref(USER_SEED)).toBe("/(tabs)/home");
  });
});

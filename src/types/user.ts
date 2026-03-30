/** Purpose: Shared profile, onboarding, preference, and privacy contracts. */
export type OnboardingStep =
  | "welcome"
  | "sign-in"
  | "verify"
  | "profile"
  | "circle"
  | "circle-name"
  | "invite"
  | "permissions"
  | "complete";

export type ThemePreference = "light" | "dark" | "system";
export type SafetyStatus = "safe" | "need_help" | "need_evacuation" | "unavailable";

export type UserOnboarding = {
  currentStep: OnboardingStep;
  profileComplete: boolean;
  circleComplete: boolean;
  permissionsComplete: boolean;
};

export type UserPreferences = {
  theme: ThemePreference;
  disasterAlerts: boolean;
  sosAlerts: boolean;
  evacuationAlerts: boolean;
};

export type UserPrivacy = {
  locationSharingEnabled: boolean;
  shareWhileUsingOnly: boolean;
  emergencyBroadcastEnabled: boolean;
};

export type UserSecurity = {
  emailVerified: boolean;
  emailVerifiedAt?: string;
};

export type UserSafety = {
  autoShareLocationOnSos: boolean;
  autoCallHotlineOnSos: boolean;
  shareStatusEnabled: boolean;
};

export type UserProfile = {
  userId: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  photoURL?: string;
  defaultGroupId?: string;
  createdAt: string;
  lastActive: string;
  onboarding: UserOnboarding;
  preferences: UserPreferences;
  privacy: UserPrivacy;
  security: UserSecurity;
  safety: UserSafety;
};

/** Purpose: Shared profile, onboarding, preference, and privacy contracts. */
export type OnboardingStep =
  | "welcome"
  | "sign-in"
  | "verify"
  | "profile"
  | "circle"
  | "permissions"
  | "complete";

export type ThemePreference = "light" | "system";

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
};

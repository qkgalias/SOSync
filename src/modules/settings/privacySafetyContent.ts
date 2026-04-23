import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type PrivacySafetyIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type PrivacySafetyCardContent = {
  title: string;
  body: string;
  iconName: PrivacySafetyIconName;
};

export const PRIVACY_SAFETY_OVERVIEW_COPY = {
  dataSecurity: {
    title: "Your data is secured",
    subtitle:
      "Your profile, circle, alerts, and location data are all secured, visible only to you and your circle.",
    iconName: "shield-check-outline" as PrivacySafetyIconName,
  },
  circleAccess: {
    title: "Manage circle access",
    subtitle:
      "Your trusted circle is your support network. Focused access ensures only they can see your alerts and info.",
    iconName: "shield-account-outline" as PrivacySafetyIconName,
  },
  legal: {
    title: "Privacy Policies and Terms",
    subtitle: "All detailed rules, including Privacy Policy and Terms.",
    iconName: "gavel" as PrivacySafetyIconName,
  },
} as const;

export const DATA_SECURITY_OVERVIEW = {
  title: "Data Security Overview",
  subtitle: "Learn how we protect your information.",
  cards: [
    {
      title: "Always Encrypted",
      body:
        "All your profile, circle, alerts, and location data is encrypted with modern industry standards (AES-256) at rest and TLS 1.3 in transit.",
      iconName: "lock-outline",
    },
    {
      title: "Circle Permissions",
      body:
        "Data is strictly scoped. Access rules ensure information is viewable only by you and the specific trusted circle members you manage.",
      iconName: "shield-account-outline",
    },
    {
      title: "Secure Session Management",
      body:
        "Authenticated sessions prevent data leakage across logins, ensuring access stays blocked when a session is no longer valid.",
      iconName: "shield-key-outline",
    },
    {
      title: "Secure Cloud Infrastructure",
      body: "Hosted in highly secure data centers with advanced firewalls and threat detection.",
      iconName: "cloud-lock-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

export const MANAGED_CIRCLE_ACCESS = {
  title: "Managed Circle Access",
  subtitle: "Control roles, invites, and privacy settings for your trusted circles.",
  cards: [
    {
      title: "Invitation-Only Access",
      body: "Only people with your unique invite code can join. Profiles are non-searchable.",
      iconName: "account-plus-outline",
    },
    {
      title: "Define Circle Roles",
      body: "Set distinct permissions for Members and Circle Owners. Only you can revoke member access.",
      iconName: "account-cog-outline",
    },
    {
      title: "Granular Visibility Controls",
      body: "Precisely control when and to whom your location and safety status are visible.",
      iconName: "eye-outline",
    },
    {
      title: "Circle Isolation",
      body: "Data from one circle is isolated and never shared with others. No cross-circle information leaks.",
      iconName: "shield-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

export const PRIVACY_POLICY_CONTENT = {
  title: "Privacy Policy",
  subtitle: "Detailed Data Rights & Usage Policies",
  cards: [
    {
      title: "What we collect",
      body:
        "SOSync stores the profile, circle membership, location-sharing choices, and emergency activity needed to make the app function.",
      iconName: "file-document-outline",
    },
    {
      title: "Why we use it",
      body:
        "This information supports account access, trusted-circle coordination, live map updates, alerts, and SOS communication.",
      iconName: "account-cog-outline",
    },
    {
      title: "Your control",
      body:
        "You can manage sharing preferences in Permissions and Privacy & Safety, and delete your account from Edit Profile.",
      iconName: "cog-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

export const TERMS_AND_CONDITIONS_CONTENT = {
  title: "Terms & Conditions",
  subtitle: "A clear agreement for responsible app usage.",
  cards: [
    {
      title: "Intended use",
      body:
        "SOSync is designed for safety coordination and trusted-circle communication. It should not be used to harass others or trigger false emergency activity.",
      iconName: "account-alert-outline",
    },
    {
      title: "Availability",
      body:
        "The app is still evolving, and some behaviors may continue to improve as the team validates production-ready flows.",
      iconName: "check-decagram-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

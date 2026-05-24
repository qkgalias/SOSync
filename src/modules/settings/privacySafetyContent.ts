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
  hostedUrl: "https://sosync.app/privacy",
  cards: [
    {
      title: "What we collect",
      body:
        "SOSync stores account details, profile information, phone and email contact details, trusted-circle memberships, invite-code activity, and app preferences needed to run your safety circle.",
      iconName: "file-document-outline",
    },
    {
      title: "Location, last seen, and offline status",
      body:
        "When sharing is on, SOSync uses your location to update the Home map for your selected circle. Last seen and offline labels show when that shared location was last received.",
      iconName: "map-clock-outline",
    },
    {
      title: "SOS, alerts, and advisories",
      body:
        "SOS events, Alerts history, weather advisories, and flood outlook requests may include circle, time, location, status, and message details so members can coordinate safely.",
      iconName: "bell-alert-outline",
    },
    {
      title: "Notifications and support reports",
      body:
        "SOSync stores push tokens for alert delivery and may process support requests, problem reports, device details, and selected media you submit for troubleshooting.",
      iconName: "message-alert-outline",
    },
    {
      title: "Why we use it",
      body:
        "This information supports account access, trusted-circle coordination, live map updates, emergency notifications, advisory details, support handling, and app reliability.",
      iconName: "account-cog-outline",
    },
    {
      title: "Your control",
      body:
        "You can pause live sharing, manage permissions, update profile details, control circle access, and request account deletion from your account settings when available.",
      iconName: "cog-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

export const TERMS_AND_CONDITIONS_CONTENT = {
  title: "Terms & Conditions",
  subtitle: "A clear agreement for responsible app usage.",
  hostedUrl: "https://sosync.app/terms",
  cards: [
    {
      title: "Intended use",
      body:
        "SOSync is designed for safety coordination with trusted people. Use SOS for real emergencies only and do not harass others, impersonate members, or trigger false emergency activity.",
      iconName: "account-alert-outline",
    },
    {
      title: "Trusted-circle conduct",
      body:
        "Invite only people you trust, keep invite codes private, and respect each member's location-sharing choices, privacy settings, and contact information.",
      iconName: "account-group-outline",
    },
    {
      title: "Emergency response limits",
      body:
        "SOSync helps your circle coordinate, but it does not replace 911, local hotlines, public responders, official advisories, or your own judgment during urgent situations.",
      iconName: "phone-alert-outline",
    },
    {
      title: "Advisory limits",
      body:
        "Weather, flood, route, and safety information can change quickly and may be delayed or unavailable. Treat advisory content as guidance, not a guarantee of conditions.",
      iconName: "weather-lightning-rainy",
    },
    {
      title: "Account security and misuse",
      body:
        "Keep your account secure and provide accurate information. SOSync may restrict access if the app is abused or used in ways that put members at risk.",
      iconName: "shield-account-outline",
    },
    {
      title: "Availability",
      body:
        "SOSync is an Android-first live EAS build and is still evolving. Some behavior may change as the team validates release-quality flows and service availability.",
      iconName: "check-decagram-outline",
    },
  ] satisfies PrivacySafetyCardContent[],
} as const;

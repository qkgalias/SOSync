/** Purpose: Keep signup legal summary copy reusable without importing the full signup screen. */
export type SignUpLegalModalKey = "terms" | "privacy";

export type SignUpLegalModalContent = {
  title: string;
  sections: Array<{
    title: string;
    body: string;
  }>;
};

export const SIGN_UP_LEGAL_MODAL_CONTENT = {
  terms: {
    title: "Terms of Service",
    sections: [
      {
        title: "Using SOSync",
        body:
          "SOSync helps you create trusted circles, share live location when enabled, receive safety advisories, and coordinate with people you trust during emergencies.",
      },
      {
        title: "Your account",
        body:
          "You agree to provide accurate information, keep your login secure, and use SOSync only for lawful and safety-related purposes.",
      },
      {
        title: "Safety reminder",
        body:
          "SOSync supports circle coordination, but it is not a replacement for emergency responders, official hotlines, official advisories, or your own judgment during urgent situations.",
      },
      {
        title: "Account limits",
        body:
          "We may suspend or remove access if SOSync is abused, used to harass others, or used in a way that puts other members at risk.",
      },
      {
        title: "Availability",
        body:
          "SOSync is an Android-first live EAS build and may continue to improve as release-quality flows are validated.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    sections: [
      {
        title: "What we collect",
        body:
          "SOSync stores account details you provide, including your name, email address, phone number, profile information, trusted-circle memberships, invite-code activity, and app preferences.",
      },
      {
        title: "Why we use it",
        body:
          "We use this information to create your account, verify your email, support trusted-circle coordination, deliver alerts, and keep safety features working.",
      },
      {
        title: "Location and safety activity",
        body:
          "When sharing is on, SOSync uses location updates for the Home map, last seen/offline status, SOS context, weather advisories, and flood or route awareness.",
      },
      {
        title: "Notifications and support",
        body:
          "SOSync uses notification tokens to deliver alerts and may process support requests, problem reports, device details, and selected media you submit.",
      },
      {
        title: "Your choices",
        body:
          "You can pause live sharing, manage permissions, update profile details, control circle access, and request account deletion from your account settings when available.",
      },
    ],
  },
} satisfies Record<SignUpLegalModalKey, SignUpLegalModalContent>;

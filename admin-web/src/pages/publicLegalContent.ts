export type PublicLegalRoute = "privacy" | "terms";

export type PublicLegalSection = {
  body: string[];
  id: string;
  title: string;
};

export type PublicLegalContent = {
  subtitle: string;
  sections: PublicLegalSection[];
  title: string;
  updatedAt: string;
};

export const PUBLIC_LEGAL_CONTENT: Record<PublicLegalRoute, PublicLegalContent> = {
  privacy: {
    title: "SOSync Privacy Policy",
    subtitle: "How SOSync collects, uses, shares, and protects information for trusted-circle safety coordination.",
    updatedAt: "June 23, 2026",
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        body: [
          "This Privacy Policy explains how SOSync handles information when you create an account, join trusted circles, share location, send SOS alerts, view advisories, or contact support.",
          "SOSync is designed for safety coordination. We keep the language here plain and practical, but this page is still a summary. The hosted policy and the app’s live behavior remain the source of truth for current release details.",
        ],
      },
      {
        id: "information-we-collect",
        title: "Information We Collect",
        body: [
          "SOSync may collect account details, profile information, phone and email contact details, trusted-circle membership, invite activity, app preferences needed for operation, device identifiers needed for app functionality, and support or report submission details.",
          "We only collect information needed to run the app, deliver safety features, maintain access, or support troubleshooting and abuse prevention.",
        ],
      },
      {
        id: "location-information",
        title: "Location Information",
        body: [
          "When live sharing is on, SOSync uses your location to update the Home map, trusted-circle status, nearby safety awareness, and last-seen labels.",
          "Offline and last-seen labels reflect when the app last received shared location data. We do not use location sharing to expose your location publicly outside the circles and workflows you choose.",
        ],
      },
      {
        id: "account-contact-information",
        title: "Account and Contact Information",
        body: [
          "We use your account and contact information to secure sign-in, verify ownership, send verification codes, and keep your profile and circle information synchronized.",
          "Email and phone details may also be used for recovery, support follow-up, and operational notifications tied to your account.",
        ],
      },
      {
        id: "circle-and-emergency-contact-data",
        title: "Circle and Emergency Contact Data",
        body: [
          "Trusted-circle membership, invite codes, emergency contacts, and active SOS state are used to coordinate with the people you invite and trust.",
          "Circle records may include names, location status, timestamps, and related context needed to show who is active, offline, or requesting help.",
        ],
      },
      {
        id: "how-we-use-information",
        title: "How We Use Information",
        body: [
          "We use collected information to authenticate accounts, update live maps, power SOS and alert delivery, render advisories, show last-seen status, and improve app reliability.",
          "We may also use data to maintain security, detect misuse, and respond to support or problem reports you submit.",
        ],
      },
      {
        id: "how-we-share-information",
        title: "How We Share Information",
        body: [
          "Information is shared with members of your trusted circles when that sharing is part of the feature you use, such as live location, SOS, alerts, or circle presence information.",
          "We may also share limited data with service providers that help us operate Firebase, hosting, authentication, notifications, storage, and support workflows.",
        ],
      },
      {
        id: "data-security",
        title: "Data Security",
        body: [
          "We use account controls, Firebase security rules, and operational safeguards to protect the information stored or processed by the app.",
          "No system is perfectly secure, so we recommend using a strong password, keeping your device protected, and only inviting people you trust.",
        ],
      },
      {
        id: "data-retention",
        title: "Data Retention",
        body: [
          "We keep information for as long as it is needed to provide the app, maintain your account, support trusted-circle coordination, meet legal requirements, and resolve operational issues.",
          "If you delete your account or data where deletion is supported, some records may still be retained where required for legal, safety, or abuse-prevention reasons.",
        ],
      },
      {
        id: "user-choices-and-controls",
        title: "User Choices and Controls",
        body: [
          "You can pause live sharing, manage permissions, update profile details, change circles, and control notification settings from the app where available.",
          "You can also contact support or request deletion help through the app’s support flows when those controls are available in your build and account state.",
        ],
      },
      {
        id: "childrens-privacy",
        title: "Children’s Privacy",
        body: [
          "SOSync is intended for users old enough to manage an account and trusted-circle relationships responsibly. If you believe we received a child’s information in error, contact support so we can review it.",
        ],
      },
      {
        id: "changes-to-this-policy",
        title: "Changes to this Policy",
        body: [
          "We may update this Privacy Policy as features change or legal requirements evolve. The latest version should always be checked in the hosted policy pages.",
        ],
      },
      {
        id: "contact-information",
        title: "Contact Information",
        body: [
          "For privacy questions or requests, use the app’s support channels or the contact details provided in the hosted policy pages.",
        ],
      },
    ],
  },
  terms: {
    title: "SOSync Terms of Service",
    subtitle: "The rules and expectations for using SOSync with trusted people, alerts, and emergency coordination.",
    updatedAt: "June 23, 2026",
    sections: [
      {
        id: "introduction",
        title: "Introduction",
        body: [
          "These Terms of Service govern your use of SOSync. By using the app, you agree to follow these terms and to use the service responsibly.",
          "SOSync is an Android-first live EAS build focused on trusted-circle coordination, safety awareness, location sharing, alerts, and SOS workflows.",
        ],
      },
      {
        id: "use-of-sosync",
        title: "Use of SOSync",
        body: [
          "Use SOSync only for lawful, appropriate, and safety-related purposes.",
          "Do not misuse the app, attempt to interfere with its operation, or use it in ways that violate the rights or safety of others.",
        ],
      },
      {
        id: "account-responsibilities",
        title: "Account Responsibilities",
        body: [
          "You are responsible for the accuracy of the information in your account, keeping your password secure, and using a device you control.",
          "You are also responsible for actions taken through your account and for notifying us if you believe your account has been compromised.",
        ],
      },
      {
        id: "trusted-circles-and-location-sharing",
        title: "Trusted Circles and Location Sharing",
        body: [
          "Only invite people you trust. Trusted circles are private coordination spaces, and invite codes should not be shared broadly.",
          "If you enable sharing, you agree that members of the selected circle may see the location, status, and related context the app is designed to display.",
        ],
      },
      {
        id: "sos-and-emergency-features",
        title: "SOS and Emergency Features",
        body: [
          "SOS is intended for real emergencies or urgent safety escalation. Do not send false alerts or use SOS to harass, prank, or spam other users.",
          "SOSync helps your circle coordinate but does not guarantee emergency response, rescue, or immediate action from any person or organization.",
        ],
      },
      {
        id: "weather-flood-and-safety-advisories",
        title: "Weather, Flood, and Safety Advisories",
        body: [
          "Advisories, weather data, flood outlooks, and route guidance can change quickly and may be incomplete, delayed, or unavailable.",
          "Treat advisory information as a planning aid rather than a guarantee of conditions or safety outcomes.",
        ],
      },
      {
        id: "evacuation-hubs-and-hotlines",
        title: "Evacuation Hubs and Hotlines",
        body: [
          "Evacuation hubs, safety locations, and hotline records are provided for coordination and reference. Always follow official instructions and local emergency guidance first.",
          "Hotline availability depends on the service provider and network conditions, and SOSync does not control the response or availability of public agencies.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable Use",
        body: [
          "You must not abuse the service, attempt unauthorized access, submit false information, or use the platform in a way that threatens safety or system integrity.",
          "We may restrict or terminate access for misuse, security risk, or activity that violates these terms.",
        ],
      },
      {
        id: "service-availability",
        title: "Service Availability",
        body: [
          "SOSync depends on internet access, device capabilities, third-party services, and platform availability. Service may be interrupted, delayed, or changed without notice.",
          "We may modify or discontinue features while improving the product or validating release-quality behavior.",
        ],
      },
      {
        id: "limitations-of-liability",
        title: "Limitations of Liability",
        body: [
          "To the extent allowed by law, SOSync is provided on an as-is basis and we are not liable for indirect losses, delayed updates, or failures caused by third-party systems or network conditions.",
        ],
      },
      {
        id: "changes-to-the-service",
        title: "Changes to the Service",
        body: [
          "We may update SOSync, these terms, or related policies when the product evolves. Continued use after changes means you accept the updated terms.",
        ],
      },
      {
        id: "contact-information",
        title: "Contact Information",
        body: [
          "For questions about these terms, use the app’s support options or the contact details listed in the hosted policy pages.",
        ],
      },
    ],
  },
};

export function getPublicLegalRoute(pathname: string): PublicLegalRoute | null {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";

  if (normalizedPath === "/privacy") {
    return "privacy";
  }

  if (normalizedPath === "/terms") {
    return "terms";
  }

  return null;
}

import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type HelpIconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type HelpInfoCardContent = {
  title: string;
  body: string;
  iconName: HelpIconName;
};

export type HelpFaqItem = {
  question: string;
  answer: string;
};

export const HELP_OVERVIEW_CONTENT = {
  emergencyUsage: {
    title: "Emergency Usage Guide",
    subtitle: "Learn how to use SOS and stay safe.",
    iconName: "medical-bag",
  },
  faqs: {
    title: "FAQs",
    subtitle: "Answers to common questions.",
    iconName: "crosshairs-gps",
  },
  contactSupport: {
    title: "Contact Support",
    subtitle: "Message us for help.",
    iconName: "email",
  },
  reportProblem: {
    title: "Report a Problem",
    subtitle: "Submit technical issues or bugs.",
    iconName: "bug-outline",
  },
  about: {
    title: "About the App",
    subtitle: "App mission and team.",
    iconName: "account-group-outline",
  },
  appVersion: {
    title: "App Version",
    iconName: "cellphone-information",
  },
} as const;

export const EMERGENCY_USAGE_GUIDE_CONTENT = {
  title: "EMERGENCY USAGE GUIDE",
  subtitle: "How to use SOSync during urgent situations",
  cards: [
    {
      title: "1. Use SOS for real emergencies",
      body:
        "Send SOS only when you need urgent help from your trusted circle. Keep your message clear, stay reachable, and call official responders when the situation is life-threatening.",
      iconName: "gesture-tap-hold",
    },
    {
      title: "2. Keep live location on",
      body:
        "Turn on Live Location when you want circle members to see your current area. This helps them understand where you are before, during, or after an SOS.",
      iconName: "map-marker-path",
    },
    {
      title: "3. Call hotlines for public response",
      body:
        "SOSync helps your circle coordinate, but it does not replace emergency responders. For police, fire, ambulance, or rescue help, call official hotlines first.",
      iconName: "bullhorn-outline",
    },
    {
      title: "4. Watch alerts and advisories",
      body:
        "Weather and safety advisories appear in Alerts when they affect your active circle. Open an advisory to review timing, area, forecast details, and recommended actions.",
      iconName: "weather-lightning-rainy",
    },
    {
      title: "5. Understand offline and last seen",
      body:
        "Offline means a member's shared location has not updated recently. They may still receive SOS or weather notifications if their phone has internet and notifications enabled.",
      iconName: "map-clock-outline",
    },
    {
      title: "6. Keep notifications ready",
      body:
        "Keep notifications enabled and internet available when possible. If your phone is offline, SOSync can show cached app screens, but live alerts and location updates need a connection.",
      iconName: "bell-ring-outline",
    },
  ] satisfies HelpInfoCardContent[],
} as const;

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    question: "What does Active SOS mean?",
    answer:
      "Active SOS means a member in your active circle recently sent an SOS alert. Their contact row may also show distance and last seen so you have more context.",
  },
  {
    question: "Will my own SOS appear as a notification?",
    answer:
      "No. SOS push notifications and Alerts-tab SOS items are meant for other circle members. The person who triggered SOS does not receive their own SOS notification.",
  },
  {
    question: "If someone is offline, can they still receive alerts?",
    answer:
      "Yes, if their phone has internet, notification permissions, and a valid push token. Offline in SOSync only means their shared location has not updated recently.",
  },
  {
    question: "Why do I see last seen?",
    answer:
      "Last seen shows when SOSync last received that member's shared location. It helps you know whether the map position is fresh or possibly outdated.",
  },
  {
    question: "How does live location sharing work?",
    answer:
      "When Live Location is on, SOSync shares your approximate current position with your selected trusted circle. You can pause sharing from the Home sheet.",
  },
  {
    question: "What are weather advisories?",
    answer:
      "Weather advisories are circle-area alerts generated from forecast data. They summarize risk, timing, area, and suggested safety actions in the Alerts tab.",
  },
  {
    question: "Does SOSync replace 911 or emergency responders?",
    answer:
      "No. SOSync is for trusted-circle coordination. For urgent public response, call official hotlines such as 911, fire, police, ambulance, or local rescue.",
  },
  {
    question: "How do I join a circle?",
    answer: "Open Profile, tap Join circle and enter the permanent 6-digit code shared by the circle owner or admin.",
  },
  {
    question: "How do I create or switch circles?",
    answer:
      "Open Profile, view Joined Circles, then create a new circle or choose an existing one. You can switch the active circle from the Home bottom sheet.",
  },
  {
    question: "Can I belong to more than one circle?",
    answer: "Yes. SOSync keeps your memberships and lets you switch the active circle from the Home bottom sheet.",
  },
  {
    question: "Why does SOSync ask for location and notifications?",
    answer:
      "Location lets trusted members see where you are when sharing is on. Notifications let SOSync deliver SOS alerts, advisories, and important circle updates.",
  },
  {
    question: "Can I use hotlines without internet?",
    answer:
      "The Hotlines tab can remain available from app content, but placing a call still depends on your phone service, device permissions, and network availability.",
  },
  {
    question: "How do I contact support or report a problem?",
    answer:
      "Open Profile, Help & About, then choose Contact Support or Report a Problem. Include what happened and where you were in the app so the team can investigate.",
  },
];

export const ABOUT_APP_CONTENT = {
  title: "About the App",
  subtitle: "Version details and app overview.",
  cards: [
    {
      title: "What SOSync is for",
      body:
        "SOSync is a safety and social-support app focused on trusted-circle coordination, live location sharing, alerts and SOS response during emergencies.",
      iconName: "information-outline",
    },
    {
      title: "Current rollout",
      body:
        "SOSync is running as a live EAS build for Android validation while the team continues refining release quality.",
      iconName: "rocket-launch-outline",
    },
  ] satisfies HelpInfoCardContent[],
} as const;

export const REPORT_PROBLEM_CATEGORIES = [
  "SOS Alert Failure",
  "Crash or Freeze",
  "Location Issues",
  "Notifications Failure",
  "UI/Text Glitches",
  "Other",
] as const;

export type ReportProblemCategory = (typeof REPORT_PROBLEM_CATEGORIES)[number];

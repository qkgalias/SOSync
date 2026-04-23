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
  subtitle: "Official guide for the current build",
  cards: [
    {
      title: "1. Real Emergencies Only",
      body:
        "SOS is for urgent or life-threatening situations where you need your circle's immediate assistance. Crucially: Ensure precise location permissions are always enable for faster response.",
      iconName: "gesture-tap-hold",
    },
    {
      title: "2. Situation Context is Key",
      body:
        "Proactively share your Safety Status (Safe, Help, Evacuation) and Live Location. This gives your circle essential context before or after an alert, making their response more effective.",
      iconName: "map-marker-path",
    },
    {
      title: "3. Hotlines First for Public Response",
      body:
        "SOSync enables rapid circle coordination. For immediate public response (e.g., Police, Fire, Ambulance), always call official emergency hotlines (e.g., 911) first.",
      iconName: "bullhorn-outline",
    },
  ] satisfies HelpInfoCardContent[],
} as const;

export const HELP_FAQ_ITEMS: HelpFaqItem[] = [
  {
    question: "How do I join a circle?",
    answer: "Open Profile, tap Join circle and enter the permanent 6-digit code shared by the circle owner or admin.",
  },
  {
    question: "Can I belong to more than one circle?",
    answer: "Yes. SOSync keeps your memberships and lets you switch the active circle from the Account screen.",
  },
  {
    question: "Will my own SOS appear as a notification?",
    answer: "No. The notification feed suppresses your own SOS events so Alerts only surface SOS activity from other people in your circle.",
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
        "This build is designed to feel deployment-ready while the team continues refining the product for Android-first release quality.",
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

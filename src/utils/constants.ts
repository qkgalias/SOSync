/** Purpose: Shared seed data, tabs, and onboarding flow metadata for SOSync. */
import type { DisasterAlert, EvacuationCenter, Group, NotificationFeedItem, UserProfile } from "@/types";

export const ONBOARDING_ROUTE_ORDER = [
  "welcome",
  "sign-in",
  "verify",
  "profile",
  "circle",
  "permissions",
  "complete",
] as const;

export const TAB_ROUTES = ["sos", "home", "hotlines", "notifications", "profile"] as const;

export const PHILIPPINE_HOTLINE_SEED = [
  { hotlineId: "911", name: "National Emergency Hotline", phone: "911", region: "PH" },
  { hotlineId: "red-cross", name: "Philippine Red Cross", phone: "143", region: "PH" },
  { hotlineId: "ndrrmc", name: "NDRRMC Operations Center", phone: "(02) 8911-5061", region: "PH" },
];

export const EVACUATION_CENTER_SEED: EvacuationCenter[] = [
  {
    centerId: "ncr-1",
    name: "Manila Civic Relief Hall",
    latitude: 14.6042,
    longitude: 120.9822,
    capacity: 450,
    contact: "+63 2 8000 1000",
    address: "Taft Avenue, Manila",
    region: "PH",
  },
  {
    centerId: "ncr-2",
    name: "Pasig Community Shelter",
    latitude: 14.5764,
    longitude: 121.0851,
    capacity: 320,
    contact: "+63 2 8000 2000",
    address: "Capitol Drive, Pasig",
    region: "PH",
  },
];

export const ALERT_SEED: DisasterAlert[] = [
  {
    alertId: "flood-watch-manila",
    groupId: "demo-group",
    type: "flood",
    severity: "watch",
    source: "open-meteo",
    title: "Flood watch in low-lying areas",
    message: "Heavy rainfall is expected within the next 6 hours. Prepare go bags and keep routes clear.",
    latitude: 14.5995,
    longitude: 120.9842,
    createdAt: new Date().toISOString(),
  },
];

export const GROUP_SEED: Group[] = [
  {
    groupId: "demo-group",
    name: "Family Response Circle",
    createdBy: "demo-user",
    createdAt: new Date().toISOString(),
    groupCode: "SOS-7421",
    membersCount: 4,
    memberRole: "admin",
    region: "PH",
  },
];

export const NOTIFICATION_SEED: NotificationFeedItem[] = [
  {
    id: "notif-alert-1",
    groupId: "demo-group",
    kind: "disaster",
    title: "Flood watch active",
    body: "Routes near Manila Bay are likely to slow down. Check the home map for safer roads.",
    createdAt: new Date().toISOString(),
    targetRoute: "/alerts/flood-watch-manila",
  },
];

export const USER_SEED: UserProfile = {
  userId: "demo-user",
  name: "Demo Responder",
  email: "responder@sosync.app",
  phoneNumber: "+639171234567",
  photoURL: undefined,
  defaultGroupId: "demo-group",
  createdAt: new Date().toISOString(),
  lastActive: new Date().toISOString(),
  onboarding: {
    currentStep: "complete",
    profileComplete: true,
    circleComplete: true,
    permissionsComplete: true,
  },
  preferences: {
    theme: "light",
    disasterAlerts: true,
    sosAlerts: true,
    evacuationAlerts: true,
  },
  privacy: {
    locationSharingEnabled: true,
    shareWhileUsingOnly: true,
    emergencyBroadcastEnabled: true,
  },
};

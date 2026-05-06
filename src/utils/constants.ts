/** Purpose: Shared seed data, tabs, and onboarding flow metadata for SOSync. */
import type { DisasterAlert, EmergencyHotline, EvacuationCenter, Group, NotificationFeedItem, UserProfile } from "@/types";

export const ONBOARDING_ROUTE_ORDER = [
  "welcome",
  "sign-in",
  "verify",
  "profile",
  "circle",
  "circle-name",
  "invite",
  "permissions",
  "complete",
] as const;

export const TAB_ROUTES = ["home", "hotlines", "sos", "notifications", "profile"] as const;

export const PHILIPPINE_HOTLINE_SEED: EmergencyHotline[] = [
  { hotlineId: "911", name: "National Emergency Hotline", phone: "911", region: "PH", description: "Police, fire, and medical emergency dispatch." },
  { hotlineId: "red-cross", name: "Philippine Red Cross", phone: "143", region: "PH", description: "First aid, rescue support, and blood services." },
  { hotlineId: "ndrrmc", name: "NDRRMC Operations Center", phone: "(02) 8911-5061", region: "PH", description: "National disaster coordination and relief response." },
  { hotlineId: "pnp-talisay", name: "Philippine National Police (PNP)", phone: "273-4480", region: "PH", description: "Talisay City Hall police contact." },
  { hotlineId: "bfp-talisay", name: "Bureau of Fire Protection (BFP)", phone: "272-8277", region: "PH", description: "Talisay City Hall fire response contact." },
  { hotlineId: "talisay-drrmo", name: "Talisay City DRRMO Rescue", phone: "0999-969-5555", region: "PH", description: "City disaster risk reduction and rescue hotline." },
  { hotlineId: "tabunok-hall", name: "Barangay Tabunok Hall", phone: "462-1932", region: "PH", description: "Local barangay office contact in Tabunok, Talisay." },
];

export const EVACUATION_CENTER_SEED: EvacuationCenter[] = [
  {
    centerId: "manila-don-bosco-1",
    name: "Don Bosco School",
    latitude: 14.59639,
    longitude: 121.02139,
    capacity: 400,
    contact: "(02) 714 7791",
    address: "3500 V. Mapa Extension, Sta. Mesa, Manila",
    city: "Manila",
    province: "Metro Manila",
    islandGroup: "Luzon",
    region: "PH",
    serviceRadiusKm: 35,
  },
  {
    centerId: "manila-dapitan-sports-1",
    name: "Dapitan Sports Complex",
    latitude: 14.61791,
    longitude: 120.99604,
    capacity: 350,
    contact: "0920 956 1565",
    address: "Instruccion St., Sampaloc, Manila 1008",
    city: "Manila",
    province: "Metro Manila",
    islandGroup: "Luzon",
    region: "PH",
    serviceRadiusKm: 35,
  },
  {
    centerId: "cebu-talisay-sports-academy-1",
    name: "Talisay Sports Academy Center",
    latitude: 10.2597,
    longitude: 123.8494,
    capacity: 520,
    contact: "TEMP-VERIFY-WITH-LGU",
    address: "Cebu South Coastal Rd, Talisay, Cebu",
    city: "Talisay",
    province: "Cebu",
    islandGroup: "Visayas",
    region: "PH",
    serviceRadiusKm: 35,
  },
  {
    centerId: "cebu-tabunok-barangay-hall-1",
    name: "Tabunok Barangay Hall",
    latitude: 10.26082,
    longitude: 123.84346,
    capacity: 200,
    contact: "(032) 344 9143",
    address: "7R6V+8CC, Rafael Rabaya Rd, Talisay, 6045 Cebu",
    city: "Talisay",
    province: "Cebu",
    islandGroup: "Visayas",
    region: "PH",
    serviceRadiusKm: 35,
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
    ownerId: "demo-user",
    createdAt: new Date().toISOString(),
    inviteCode: "742104",
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
    readAt: null,
  },
];

export const USER_SEED: UserProfile = {
  userId: "demo-user",
  name: "Demo Responder",
  email: "responder@sosync.app",
  phoneNumber: "+639171234567",
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
  security: {
    emailVerified: true,
  },
  safety: {
    autoShareLocationOnSos: true,
    autoCallHotlineOnSos: false,
  },
};

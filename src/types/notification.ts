/** Purpose: Notification, device token, and SOS feed contracts for alert delivery. */
export type NotificationKind = "disaster" | "sos" | "evacuation" | "message";
export type NotificationPayloadType = "disaster_alert" | "sos_alert" | "message";

export type NotificationFeedItem = {
  id: string;
  groupId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  targetRoute?: string;
};

export type PushToken = {
  tokenId: string;
  token: string;
  platform: "ios" | "android";
  appVersion: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
};

export type SosEvent = {
  eventId: string;
  groupId: string;
  senderId: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: "active" | "resolved";
};

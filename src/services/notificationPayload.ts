/** Purpose: Normalize remote notification payloads into stable app routes and feed items. */
import type { FirebaseMessagingTypes } from "@react-native-firebase/messaging";

import type { NotificationFeedItem, NotificationKind, NotificationPayloadType } from "@/types";

type NotificationDataShape = Partial<
  Record<"alertId" | "body" | "createdAt" | "entityId" | "eventId" | "groupId" | "kind" | "senderId" | "targetRoute" | "threadId" | "title" | "type", string>
>;

const DEFAULT_TITLE = "Incoming update";
const DEFAULT_BODY = "Open SOSync to review the latest safety information.";
const DEFAULT_GROUP_ID = "ungrouped";

const legacyTypeMap: Record<string, NotificationPayloadType> = {
  disaster: "disaster_alert",
  evacuation: "disaster_alert",
  sos: "sos_alert",
};

export const toNotificationPayloadType = (value?: string | null): NotificationPayloadType | null => {
  if (!value) {
    return null;
  }

  if (value === "disaster_alert" || value === "sos_alert") {
    return value;
  }

  return legacyTypeMap[value] ?? null;
};

export const toNotificationKind = (value?: string | null): NotificationKind => {
  switch (toNotificationPayloadType(value)) {
    case "sos_alert":
      return "sos";
    default:
      return "disaster";
  }
};

const toEntityId = (data: NotificationDataShape) => data.alertId ?? data.eventId ?? data.threadId ?? data.entityId;

export const resolveNotificationRoute = (data: NotificationDataShape) => {
  const payloadType = toNotificationPayloadType(data.type ?? data.kind);
  if (!payloadType) {
    return null;
  }

  if (data.targetRoute) {
    return data.targetRoute;
  }

  const entityId = toEntityId(data);

  switch (payloadType) {
    case "disaster_alert":
      return entityId ? `/alerts/${entityId}` : "/notifications";
    case "sos_alert":
      return "/notifications";
    default:
      return null;
  }
};

export const buildNotificationFeedItem = (
  remoteMessage: Pick<FirebaseMessagingTypes.RemoteMessage, "data" | "messageId" | "notification">,
): NotificationFeedItem | null => {
  const data = (remoteMessage.data ?? {}) as NotificationDataShape;
  const type = data.type ?? data.kind;
  if (!toNotificationPayloadType(type)) {
    return null;
  }

  return {
    id: remoteMessage.messageId ?? toEntityId(data) ?? `remote-${Date.now()}`,
    groupId: data.groupId ?? DEFAULT_GROUP_ID,
    kind: toNotificationKind(type),
    title: remoteMessage.notification?.title ?? data.title ?? DEFAULT_TITLE,
    body: remoteMessage.notification?.body ?? data.body ?? DEFAULT_BODY,
    createdAt: data.createdAt ?? new Date().toISOString(),
    actorUserId: data.senderId,
    targetRoute: resolveNotificationRoute(data) ?? undefined,
  };
};

export const buildNotificationResponseData = (item: NotificationFeedItem) => ({
  groupId: item.groupId,
  kind: item.kind,
  targetRoute: item.targetRoute ?? "/notifications",
});

export const resolveNotificationResponseRoute = (data: unknown) => {
  if (!data || typeof data !== "object") {
    return null;
  }

  const record = data as Record<string, unknown>;
  return typeof record.targetRoute === "string" ? record.targetRoute : null;
};

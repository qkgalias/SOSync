/** Purpose: Hold notification-feed retention and unread partition logic without Firebase dependencies. */
import type { NotificationFeedItem, SosEvent } from "@/types";
import { buildNotificationFeedId } from "@/utils/helpers";

export const NOTIFICATION_RETENTION_DAYS = 30;
const NOTIFICATION_RETENTION_WINDOW_MS = NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export const toVisibleNotificationFeed = (items: NotificationFeedItem[], nowMs = Date.now()) => {
  const cutoff = nowMs - NOTIFICATION_RETENTION_WINDOW_MS;
  const allItems = items
    .filter((item) => {
      const createdAtMs = Date.parse(item.createdAt);
      return Number.isFinite(createdAtMs) && createdAtMs >= cutoff;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    allItems,
    unreadItems: allItems.filter((item) => !item.readAt),
  };
};

export const isFeedItemVisibleForMembership = (createdAt: string, joinedAt?: string | null) => {
  if (!joinedAt) {
    return true;
  }

  const createdAtMs = Date.parse(createdAt);
  const joinedAtMs = Date.parse(joinedAt);
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(joinedAtMs)) {
    return true;
  }

  return createdAtMs >= joinedAtMs;
};

export const filterFeedItemsByJoinedAt = (items: NotificationFeedItem[], joinedAt?: string | null) =>
  items.filter((item) => isFeedItemVisibleForMembership(item.createdAt, joinedAt));

export const toSosNotificationItems = (
  events: SosEvent[],
  blockedUserIds: string[] = [],
  currentUserId?: string,
): NotificationFeedItem[] =>
  events
    .filter((event) => event.senderId !== currentUserId && !blockedUserIds.includes(event.senderId))
    .map((event) => ({
      id: buildNotificationFeedId("sos", event.eventId),
      groupId: event.groupId,
      kind: "sos",
      title: "Trusted circle SOS",
      body: event.message,
      createdAt: event.createdAt,
      actorUserId: event.senderId,
    }));

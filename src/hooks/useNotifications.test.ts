/** Purpose: Verify notification-feed retention and unread partitioning rules. */
import type { NotificationFeedItem, SosEvent } from "@/types";
import {
  filterFeedItemsByJoinedAt,
  isFeedItemVisibleForMembership,
  NOTIFICATION_RETENTION_DAYS,
  toSosNotificationItems,
  toVisibleNotificationFeed,
} from "@/hooks/useNotifications.helpers";

const NOW_MS = Date.parse("2026-03-28T12:00:00.000Z");

const buildItem = (overrides: Partial<NotificationFeedItem>): NotificationFeedItem => ({
  id: overrides.id ?? "item-1",
  groupId: overrides.groupId ?? "group-1",
  kind: overrides.kind ?? "sos",
  title: overrides.title ?? "Trusted circle SOS",
  body: overrides.body ?? "Immediate assistance requested.",
  createdAt: overrides.createdAt ?? new Date(NOW_MS).toISOString(),
  readAt: overrides.readAt ?? null,
  targetRoute: overrides.targetRoute,
  actorUserId: overrides.actorUserId,
});

describe("toVisibleNotificationFeed", () => {
  it("excludes feed items older than 30 days", () => {
    const cutoffMs = NOW_MS - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const { allItems, unreadItems } = toVisibleNotificationFeed(
      [
        buildItem({ id: "recent", createdAt: new Date(cutoffMs + 1_000).toISOString() }),
        buildItem({ id: "expired", createdAt: new Date(cutoffMs - 1_000).toISOString() }),
      ],
      NOW_MS,
    );

    expect(allItems.map((item) => item.id)).toEqual(["recent"]);
    expect(unreadItems.map((item) => item.id)).toEqual(["recent"]);
  });

  it("keeps read items in All while removing them from Unread", () => {
    const items = [
      buildItem({
        id: "read",
        createdAt: new Date(NOW_MS - 5_000).toISOString(),
        readAt: new Date(NOW_MS - 4_000).toISOString(),
      }),
      buildItem({ id: "unread", createdAt: new Date(NOW_MS - 1_000).toISOString() }),
    ];

    const { allItems, unreadItems } = toVisibleNotificationFeed(items, NOW_MS);

    expect(allItems.map((item) => item.id)).toEqual(["unread", "read"]);
    expect(unreadItems.map((item) => item.id)).toEqual(["unread"]);
  });
});

describe("toSosNotificationItems", () => {
  const buildEvent = (overrides: Partial<SosEvent>): SosEvent => ({
    eventId: overrides.eventId ?? "event-1",
    groupId: overrides.groupId ?? "group-1",
    senderId: overrides.senderId ?? "other-user",
    message: overrides.message ?? "Immediate assistance requested.",
    latitude: overrides.latitude ?? 14.5995,
    longitude: overrides.longitude ?? 120.9842,
    createdAt: overrides.createdAt ?? new Date(NOW_MS).toISOString(),
    status: overrides.status ?? "active",
  });

  it("suppresses SOS items sent by the current user", () => {
    const items = toSosNotificationItems(
      [
        buildEvent({ eventId: "self", senderId: "user-1" }),
        buildEvent({ eventId: "other", senderId: "user-2" }),
      ],
      [],
      "user-1",
    );

    expect(items.map((item) => item.id)).toEqual(["sos:other"]);
  });

  it("suppresses SOS items from blocked users", () => {
    const items = toSosNotificationItems(
      [
        buildEvent({ eventId: "blocked", senderId: "user-2" }),
        buildEvent({ eventId: "allowed", senderId: "user-3" }),
      ],
      ["user-2"],
      "user-1",
    );

    expect(items.map((item) => item.id)).toEqual(["sos:allowed"]);
  });
});

describe("membership notification cutoff", () => {
  const joinedAt = "2026-03-28T10:00:00.000Z";

  it("hides disaster and SOS feed items created before the user joined", () => {
    const items = filterFeedItemsByJoinedAt(
      [
        buildItem({
          id: "alert:old",
          kind: "disaster",
          createdAt: "2026-03-28T09:59:59.000Z",
        }),
        buildItem({
          id: "sos:old",
          kind: "sos",
          createdAt: "2026-03-28T09:30:00.000Z",
        }),
        buildItem({
          id: "alert:new",
          kind: "disaster",
          createdAt: "2026-03-28T10:00:00.000Z",
        }),
        buildItem({
          id: "sos:new",
          kind: "sos",
          createdAt: "2026-03-28T10:05:00.000Z",
        }),
      ],
      joinedAt,
    );

    expect(items.map((item) => item.id)).toEqual(["alert:new", "sos:new"]);
  });

  it("keeps legacy feed behavior when joinedAt is missing or invalid", () => {
    expect(isFeedItemVisibleForMembership("2026-03-28T09:00:00.000Z", null)).toBe(true);
    expect(isFeedItemVisibleForMembership("2026-03-28T09:00:00.000Z", "")).toBe(true);
    expect(isFeedItemVisibleForMembership("2026-03-28T09:00:00.000Z", "not-a-date")).toBe(true);
  });

  it("filters before unread counts are derived", () => {
    const visibleItems = filterFeedItemsByJoinedAt(
      [
        buildItem({ id: "old-unread", createdAt: "2026-03-28T09:00:00.000Z" }),
        buildItem({ id: "new-unread", createdAt: "2026-03-28T10:01:00.000Z" }),
      ],
      joinedAt,
    );

    const { allItems, unreadItems } = toVisibleNotificationFeed(visibleItems, NOW_MS);

    expect(allItems.map((item) => item.id)).toEqual(["new-unread"]);
    expect(unreadItems.map((item) => item.id)).toEqual(["new-unread"]);
  });
});

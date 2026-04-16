/** Purpose: Verify SOS popup detail fallbacks for member identity and location. */
import type { GroupMember, NotificationFeedItem, SosEvent } from "@/types";

import { buildSosNotificationDetail, formatSosCoordinateLabel, getSosEventIdFromFeedItemId } from "@/modules/notifications/notificationDetails";

const buildItem = (overrides: Partial<NotificationFeedItem>): NotificationFeedItem => ({
  id: overrides.id ?? "sos:event-1",
  groupId: overrides.groupId ?? "group-1",
  kind: overrides.kind ?? "sos",
  title: overrides.title ?? "Trusted circle SOS",
  body: overrides.body ?? "Immediate assistance requested.",
  createdAt: overrides.createdAt ?? "2026-03-28T12:00:00.000Z",
  targetRoute: overrides.targetRoute,
  actorUserId: overrides.actorUserId ?? "user-1",
  readAt: overrides.readAt ?? null,
});

const buildEvent = (overrides: Partial<SosEvent> = {}): SosEvent => ({
  eventId: overrides.eventId ?? "event-1",
  groupId: overrides.groupId ?? "group-1",
  senderId: overrides.senderId ?? "user-1",
  message: overrides.message ?? "Need help at the east entrance.",
  latitude: overrides.latitude ?? 14.5995,
  longitude: overrides.longitude ?? 120.9842,
  createdAt: overrides.createdAt ?? "2026-03-28T12:00:00.000Z",
  status: overrides.status ?? "active",
});

describe("notificationDetails", () => {
  it("extracts the SOS event id from a feed item id", () => {
    expect(getSosEventIdFromFeedItemId("sos:event-9")).toBe("event-9");
    expect(getSosEventIdFromFeedItemId("alert:item-1")).toBeNull();
  });

  it("falls back to coordinates when richer data is missing", () => {
    const detail = buildSosNotificationDetail({
      item: buildItem({ body: "Immediate assistance requested." }),
      event: buildEvent({ latitude: 14.60012, longitude: 120.98434 }),
    });

    expect(detail.locationLabel).toBe("14.60012, 120.98434");
    expect(detail.message).toBe("Need help at the east entrance.");
  });

  it("prefers resolved member and readable location data", () => {
    const member = {
      userId: "user-1",
      groupId: "group-1",
      displayName: "Ari Santos",
      role: "member",
      joinedAt: "2026-03-20T00:00:00.000Z",
      photoURL: "https://example.com/avatar.jpg",
    } satisfies GroupMember;

    const detail = buildSosNotificationDetail({
      item: buildItem({ body: "Immediate assistance requested." }),
      event: buildEvent(),
      member,
      locationLabel: "Scout Chuatoco Ave, Quezon City",
    });

    expect(detail.callerName).toBe("Ari Santos");
    expect(detail.callerInitials).toBe("AS");
    expect(detail.callerPhotoURL).toBe("https://example.com/avatar.jpg");
    expect(detail.locationLabel).toBe("Scout Chuatoco Ave, Quezon City");
  });

  it("formats missing coordinate data safely", () => {
    expect(formatSosCoordinateLabel(null)).toBe("Location unavailable");
  });
});

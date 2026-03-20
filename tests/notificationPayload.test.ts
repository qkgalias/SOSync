/** Purpose: Lock the notification payload parsing used by Android push delivery and tap routing. */
import { buildNotificationFeedItem, resolveNotificationResponseRoute, resolveNotificationRoute } from "@/services/notificationPayload";

describe("notification payload helpers", () => {
  it("maps disaster alert payloads into detail routes", () => {
    const item = buildNotificationFeedItem({
      messageId: "alert-123",
      notification: {
        title: "Flood watch",
        body: "Heavy rainfall expected in the next 6 hours.",
      },
      data: {
        alertId: "alert-123",
        createdAt: "2026-03-17T12:00:00.000Z",
        groupId: "group-1",
        type: "disaster_alert",
      },
    });

    expect(item.kind).toBe("disaster");
    expect(item.groupId).toBe("group-1");
    expect(item.targetRoute).toBe("/alerts/alert-123");
  });

  it("keeps legacy SOS payloads navigable", () => {
    expect(
      resolveNotificationRoute({
        eventId: "sos-123",
        groupId: "group-1",
        kind: "sos",
      }),
    ).toBe("/notifications");
  });

  it("reads the route back from local notification response data", () => {
    expect(resolveNotificationResponseRoute({ targetRoute: "/alerts/alert-1" })).toBe("/alerts/alert-1");
    expect(resolveNotificationResponseRoute({})).toBeNull();
  });
});

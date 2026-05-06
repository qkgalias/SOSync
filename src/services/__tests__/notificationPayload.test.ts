import { buildNotificationFeedItem, resolveNotificationRoute, toNotificationPayloadType } from "@/services/notificationPayload";

describe("notification payload normalization", () => {
  it("supports only disaster and SOS payloads for the release surface", () => {
    expect(toNotificationPayloadType("disaster_alert")).toBe("disaster_alert");
    expect(toNotificationPayloadType("sos_alert")).toBe("sos_alert");
    expect(toNotificationPayloadType("message")).toBeNull();
  });

  it("ignores unsupported message routes even if a target route is present", () => {
    expect(resolveNotificationRoute({ targetRoute: "/notifications", type: "message" })).toBeNull();
  });

  it("does not build feed items for deferred messaging payloads", () => {
    expect(
      buildNotificationFeedItem({
        data: {
          body: "Hello",
          groupId: "group-1",
          targetRoute: "/notifications",
          title: "Message",
          type: "message",
        },
        messageId: "remote-message-1",
        notification: undefined,
      }),
    ).toBeNull();
  });
});

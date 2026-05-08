/** Purpose: Verify backend notification fanout does not target members before they joined. */
import { memberJoinedBeforeNotification } from "../functions/src/notificationEligibility";

describe("memberJoinedBeforeNotification", () => {
  it("allows members who joined before or exactly when the notification was created", () => {
    expect(
      memberJoinedBeforeNotification("2026-03-28T10:00:00.000Z", "2026-03-28T10:00:00.000Z"),
    ).toBe(true);
    expect(
      memberJoinedBeforeNotification("2026-03-28T09:59:59.000Z", "2026-03-28T10:00:00.000Z"),
    ).toBe(true);
  });

  it("blocks members who joined after the notification was created", () => {
    expect(
      memberJoinedBeforeNotification("2026-03-28T10:00:01.000Z", "2026-03-28T10:00:00.000Z"),
    ).toBe(false);
  });

  it("preserves legacy behavior when timestamps are missing or invalid", () => {
    expect(memberJoinedBeforeNotification(undefined, "2026-03-28T10:00:00.000Z")).toBe(true);
    expect(memberJoinedBeforeNotification("not-a-date", "2026-03-28T10:00:00.000Z")).toBe(true);
    expect(memberJoinedBeforeNotification("2026-03-28T10:00:00.000Z")).toBe(true);
  });
});

/** Purpose: Verify shared formatting and invite helper functions. */
import { buildInviteMessage, toDistanceLabel, toLocationId } from "@/utils/helpers";

describe("helpers", () => {
  it("builds a share-ready invite message", () => {
    expect(buildInviteMessage("Family Circle", "SOS-1234")).toContain("Family Circle");
    expect(buildInviteMessage("Family Circle", "SOS-1234")).toContain("SOS-1234");
    expect(buildInviteMessage("Family Circle", "SOS-1234")).toContain("Join circle");
  });

  it("formats distance labels for meters and kilometers", () => {
    expect(toDistanceLabel(420)).toBe("420 m");
    expect(toDistanceLabel(1825)).toBe("1.8 km");
  });

  it("builds a deterministic location id", () => {
    expect(toLocationId("group-1", "user-2")).toBe("group-1_user-2");
  });
});

/** Purpose: Verify SOS cannot be armed or sent without explicit location-sharing consent. */
import {
  resolveSosSendBlockReason,
  SOS_AUTO_SHARE_REQUIRED_MESSAGE,
  SOS_GROUP_REQUIRED_MESSAGE,
  SOS_LOCATION_REQUIRED_MESSAGE,
  SOS_LOCATION_SHARING_REQUIRED_MESSAGE,
  SOS_SIGN_IN_REQUIRED_MESSAGE,
} from "@/modules/sos/sosSendGuards";

const readyInput = {
  autoShareLocationOnSos: true,
  currentLocation: { latitude: 10.3, longitude: 123.9 },
  locationSharingEnabled: true,
  selectedGroupId: "group-1",
  userId: "user-1",
};

describe("sosSendGuards", () => {
  it("blocks SOS when live location sharing is off", () => {
    expect(resolveSosSendBlockReason({ ...readyInput, locationSharingEnabled: false })).toBe(
      SOS_LOCATION_SHARING_REQUIRED_MESSAGE,
    );
  });

  it("blocks SOS when auto-share location on SOS is off", () => {
    expect(resolveSosSendBlockReason({ ...readyInput, autoShareLocationOnSos: false })).toBe(
      SOS_AUTO_SHARE_REQUIRED_MESSAGE,
    );
  });

  it("blocks SOS when sign-in, circle, or location requirements are missing", () => {
    expect(resolveSosSendBlockReason({ ...readyInput, userId: null })).toBe(SOS_SIGN_IN_REQUIRED_MESSAGE);
    expect(resolveSosSendBlockReason({ ...readyInput, selectedGroupId: null })).toBe(SOS_GROUP_REQUIRED_MESSAGE);
    expect(resolveSosSendBlockReason({ ...readyInput, currentLocation: null })).toBe(SOS_LOCATION_REQUIRED_MESSAGE);
  });

  it("allows SOS when consent, group, sign-in, and location are present", () => {
    expect(resolveSosSendBlockReason(readyInput)).toBeNull();
  });
});

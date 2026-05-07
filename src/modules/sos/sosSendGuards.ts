/** Purpose: Keep SOS send privacy gates testable outside the animated screen. */
import type { MapCoordinate } from "@/types";

type ResolveSosSendBlockReasonInput = {
  autoShareLocationOnSos: boolean;
  currentLocation: MapCoordinate | null;
  locationSharingEnabled: boolean;
  selectedGroupId: string | null;
  userId?: string | null;
};

export const SOS_LOCATION_SHARING_REQUIRED_MESSAGE = "Turn on location sharing before sending SOS.";
export const SOS_AUTO_SHARE_REQUIRED_MESSAGE = "Turn on Auto-share location on SOS before sending SOS.";
export const SOS_SIGN_IN_REQUIRED_MESSAGE = "Sign in is required before SOS can be sent.";
export const SOS_GROUP_REQUIRED_MESSAGE = "Join a trusted circle first so SOS has someone to reach.";
export const SOS_LOCATION_REQUIRED_MESSAGE = "Location is required before SOS can be sent.";

export const resolveSosSendBlockReason = ({
  autoShareLocationOnSos,
  currentLocation,
  locationSharingEnabled,
  selectedGroupId,
  userId,
}: ResolveSosSendBlockReasonInput) => {
  if (!locationSharingEnabled) {
    return SOS_LOCATION_SHARING_REQUIRED_MESSAGE;
  }

  if (!autoShareLocationOnSos) {
    return SOS_AUTO_SHARE_REQUIRED_MESSAGE;
  }

  if (!userId) {
    return SOS_SIGN_IN_REQUIRED_MESSAGE;
  }

  if (!selectedGroupId) {
    return SOS_GROUP_REQUIRED_MESSAGE;
  }

  if (!currentLocation) {
    return SOS_LOCATION_REQUIRED_MESSAGE;
  }

  return null;
};

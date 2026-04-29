/** Purpose: Keep Home map marker, Maps handoff, address, theme, and sheet snap points deterministic and testable. */
import { Platform, type ColorSchemeName } from "react-native";

import type { GroupLocation, GroupMember, HomeMapAppearance, HomeMapMarker, MapCoordinate } from "@/types";

type BuildHomeMapMarkersInput = {
  blockedUserIds?: string[];
  currentLocation: MapCoordinate | null;
  currentUser: {
    userId: string;
    displayName: string;
    photoURL?: string;
    role?: string;
  };
  groupLocations: GroupLocation[];
  members: GroupMember[];
  primaryContactIds?: string[];
};

export const resolveHomeMapAppearance = (colorScheme: ColorSchemeName | null): HomeMapAppearance =>
  colorScheme === "dark" ? "dark" : "light";

export const resolveHomeAddressLabel = (input: {
  reverseGeocodedAddress?: string | null;
  nearestCenterAddress?: string | null;
  groupName?: string | null;
}) =>
  input.reverseGeocodedAddress?.trim() ||
  input.nearestCenterAddress?.trim() ||
  input.groupName?.trim() ||
  "Live awareness is active";

export const HOME_SHEET_SNAP_POINTS = ["22%", "48%", "94%"] as const;

export const sanitizeHomeMarkerPhotoURL = (photoURL?: string | null) => {
  const nextValue = photoURL?.trim();
  return nextValue ? nextValue : undefined;
};

export const resolveHomeMarkerDisplayName = (displayName?: string | null, fallback = "SOSync") => {
  const nextValue = displayName?.trim();
  return nextValue ? nextValue : fallback;
};

export const buildHomeMarkerRenderSignature = (
  markers: Array<Pick<HomeMapMarker, "markerId" | "photoURL">>,
) =>
  markers
    .map((marker) => `${marker.markerId}:${sanitizeHomeMarkerPhotoURL(marker.photoURL) ?? "initials"}`)
    .join("|");

export const buildHomeMapMarkers = ({
  blockedUserIds = [],
  currentLocation,
  currentUser,
  groupLocations,
  members,
  primaryContactIds = [],
}: BuildHomeMapMarkersInput): HomeMapMarker[] => {
  const blockedLookup = new Set(blockedUserIds);
  const primaryLookup = new Set(primaryContactIds);
  const memberLookup = members.reduce<Record<string, GroupMember>>((lookup, member) => {
    lookup[member.userId] = member;
    return lookup;
  }, {});
  const markers = new Map<string, HomeMapMarker>();

  if (currentLocation) {
    markers.set(currentUser.userId, {
      markerId: currentUser.userId,
      userId: currentUser.userId,
      displayName: resolveHomeMarkerDisplayName(currentUser.displayName),
      role: currentUser.role,
      photoURL: sanitizeHomeMarkerPhotoURL(currentUser.photoURL),
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      sharingState: "live",
      isCurrentUser: true,
      isPrimaryContact: primaryLookup.has(currentUser.userId),
    });
  }

  groupLocations.forEach((location) => {
    if (
      blockedLookup.has(location.userId) ||
      location.sharingState === "paused" ||
      location.userId === currentUser.userId
    ) {
      return;
    }

    const member = memberLookup[location.userId];
    if (!member) {
      return;
    }

    markers.set(location.userId, {
      markerId: location.userId,
      userId: location.userId,
      displayName: resolveHomeMarkerDisplayName(member.displayName, "Circle member"),
      role: member.role,
      photoURL: sanitizeHomeMarkerPhotoURL(member.photoURL),
      latitude: location.latitude,
      longitude: location.longitude,
      sharingState: location.sharingState,
      isCurrentUser: false,
      isPrimaryContact: primaryLookup.has(location.userId),
    });
  });

  return [...markers.values()].sort((left, right) => {
    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }

    if (left.isPrimaryContact !== right.isPrimaryContact) {
      return left.isPrimaryContact ? -1 : 1;
    }

    return left.displayName.localeCompare(right.displayName);
  });
};

export const buildGoogleMapsDirectionsUrls = (input: {
  destination: MapCoordinate;
  origin?: MapCoordinate;
}) => {
  const destinationValue = `${input.destination.latitude},${input.destination.longitude}`;
  const originValue = input.origin
    ? `${input.origin.latitude},${input.origin.longitude}`
    : null;
  const webUrl =
    `https://www.google.com/maps/dir/?api=1` +
    `${originValue ? `&origin=${encodeURIComponent(originValue)}` : ""}` +
    `&destination=${encodeURIComponent(destinationValue)}`;

  return {
    appUrl:
      Platform.OS === "android"
        ? `google.navigation:q=${destinationValue}`
        : `comgooglemaps://?${originValue ? `saddr=${encodeURIComponent(originValue)}&` : ""}daddr=${encodeURIComponent(destinationValue)}`,
    webUrl,
  };
};

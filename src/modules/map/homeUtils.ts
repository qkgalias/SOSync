/** Purpose: Keep Home map marker, Maps handoff, address, theme, and sheet snap points deterministic and testable. */
import { Platform, type ColorSchemeName } from "react-native";

import type { GroupLocation, GroupMember, HomeMapAppearance, HomeMapMarker, MapCoordinate, SosEvent } from "@/types";
import { locationService } from "@/services/locationService";

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
  nowMs?: number;
  primaryContactIds?: string[];
};

export const MEMBER_OFFLINE_THRESHOLD_MS = 10 * 60 * 1000;
export const ACTIVE_SOS_CONTACT_WINDOW_MS = 60 * 60 * 1000;

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
  markers: Array<Pick<HomeMapMarker, "markerId" | "photoURL" | "presenceStatus">>,
) =>
  markers
    .map((marker) => `${marker.markerId}:${sanitizeHomeMarkerPhotoURL(marker.photoURL) ?? "initials"}:${marker.presenceStatus}`)
    .join("|");

export const getLastSeenMinutes = (updatedAt: string, nowMs = Date.now()) => {
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((nowMs - updatedAtMs) / 60_000));
};

export const resolveMemberPresenceStatus = (location: Pick<GroupLocation, "sharingState" | "updatedAt">, nowMs = Date.now()) => {
  if (location.sharingState !== "live") {
    return "live" as const;
  }

  const updatedAtMs = Date.parse(location.updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return "offline" as const;
  }

  return nowMs - updatedAtMs > MEMBER_OFFLINE_THRESHOLD_MS ? "offline" as const : "live" as const;
};

export const formatLastSeenLabel = (minutes: number | null | undefined) => {
  if (minutes === null || minutes === undefined) {
    return "last seen recently";
  }

  if (minutes < 1) {
    return "last seen just now";
  }

  if (minutes < 60) {
    return `last seen ${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  return `last seen ${hours}h ago`;
};

export const isSosEventActiveForHomeContacts = (
  event: Pick<SosEvent, "createdAt" | "status">,
  nowMs = Date.now(),
) => {
  if (event.status !== "active") {
    return false;
  }

  const createdAtMs = Date.parse(event.createdAt);
  if (!Number.isFinite(createdAtMs)) {
    return false;
  }

  return nowMs - createdAtMs <= ACTIVE_SOS_CONTACT_WINDOW_MS;
};

export const buildHomeContactSubtitle = ({
  activeSos,
  distanceLabel,
  lastSeenMinutes,
  markerVisible,
  presenceStatus,
}: {
  activeSos: boolean;
  distanceLabel?: string | null;
  lastSeenMinutes?: number | null;
  markerVisible: boolean;
  presenceStatus?: HomeMapMarker["presenceStatus"] | null;
}) => {
  if (!markerVisible) {
    return "Location hidden";
  }

  const parts = [
    activeSos ? "Active SOS" : presenceStatus === "offline" ? "Offline" : "Live",
    distanceLabel,
    formatLastSeenLabel(lastSeenMinutes),
  ].filter((part): part is string => Boolean(part));

  return parts.join(" · ");
};

export const NEARBY_SAFETY_HUB_MAX_DISTANCE_METERS = 2_000;

type NearbySafetyHubCandidate = {
  centerId: string;
  distanceMeters?: number;
  latitude: number;
  longitude: number;
  name: string;
};

const resolveSafetyHubDistanceMeters = (
  center: Pick<NearbySafetyHubCandidate, "distanceMeters" | "latitude" | "longitude">,
  currentLocation: MapCoordinate | null,
) =>
  center.distanceMeters ??
  (currentLocation ? Math.round(locationService.distanceBetween(currentLocation, center)) : Number.POSITIVE_INFINITY);

export const sortNearbySafetyHubs = <T extends NearbySafetyHubCandidate>(
  centers: T[],
  currentLocation: MapCoordinate | null,
) =>
  centers
    .map((center) => ({
      center,
      distanceMeters: resolveSafetyHubDistanceMeters(center, currentLocation),
    }))
    .filter(({ distanceMeters }) => distanceMeters <= NEARBY_SAFETY_HUB_MAX_DISTANCE_METERS)
    .sort((left, right) => {
      const leftDistance = left.distanceMeters;
      const rightDistance = right.distanceMeters;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.center.name.localeCompare(right.center.name);
    })
    .map(({ center, distanceMeters }) => ({
      ...center,
      distanceMeters,
    }))
    .slice(0, 8);

export const buildHomeMapMarkers = ({
  blockedUserIds = [],
  currentLocation,
  currentUser,
  groupLocations,
  members,
  nowMs = Date.now(),
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
      presenceStatus: "live",
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
    const presenceStatus = resolveMemberPresenceStatus(location, nowMs);
    const lastSeenMinutes = getLastSeenMinutes(location.updatedAt, nowMs);

    markers.set(location.userId, {
      markerId: location.userId,
      userId: location.userId,
      displayName: resolveHomeMarkerDisplayName(member.displayName, "Circle member"),
      role: member.role,
      photoURL: sanitizeHomeMarkerPhotoURL(member.photoURL),
      latitude: location.latitude,
      longitude: location.longitude,
      sharingState: location.sharingState,
      presenceStatus,
      lastSeenAt: location.updatedAt,
      lastSeenMinutes: lastSeenMinutes ?? undefined,
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

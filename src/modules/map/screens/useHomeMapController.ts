/** Purpose: Keep Home map orchestration in one hook so the screen file stays focused on composition only. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image } from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetTimingConfigs } from "@gorhom/bottom-sheet";
import Animated, { Easing, useSharedValue } from "react-native-reanimated";

import { useAlerts } from "@/hooks/useAlerts";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupPreferences } from "@/hooks/useGroupPreferences";
import { useGroups } from "@/hooks/useGroups";
import { useLocation } from "@/hooks/useLocation";
import {
  getHomeMapPalette,
  resolveActiveGroup,
  type HomeContactItem,
} from "@/modules/map/homeMapTheme";
import {
  buildHomeContactSubtitle,
  buildHomeMapMarkers,
  HOME_SHEET_SNAP_POINTS,
  isSosEventActiveForHomeContacts,
  resolveHomeMarkerDisplayName,
  resolveHomeAddressLabel,
  resolveHomeMapAppearance,
  sortNearbySafetyHubs,
} from "@/modules/map/homeUtils";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { EvacuationTravelMode, HomeMapFocusTarget, SosEvent } from "@/types";
import { USER_SEED } from "@/utils/constants";
import { toDistanceLabel } from "@/utils/helpers";

type HomeMapFocusRequest =
  | { kind: "currentUser" }
  | { kind: "center"; centerId: string }
  | { kind: "marker"; markerId: string };

const useStableValueBySignature = <T,>(value: T, signature: string): T => {
  const stableRef = useRef<{ signature: string; value: T } | null>(null);

  if (!stableRef.current || stableRef.current.signature !== signature) {
    stableRef.current = { signature, value };
  }

  return stableRef.current.value;
};

export const useHomeMapController = () => {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { resolvedTheme } = useAppTheme();
  const appearance = resolveHomeMapAppearance(resolvedTheme);
  const palette = useMemo(() => getHomeMapPalette(appearance), [appearance]);
  const sheetSnapPoints = useMemo(() => [...HOME_SHEET_SNAP_POINTS], []);
  const sheetAnimationConfigs = useBottomSheetTimingConfigs({
    duration: 220,
    easing: Easing.out(Easing.cubic),
  });
  const { authUser, profile, saveProfile } = useAuthSession();
  const { groups, selectedGroupId, setSelectedGroupId } = useGroups();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const { preferences } = useGroupPreferences(authUser?.uid, selectedGroupId);
  const {
    centers,
    currentLocation,
    groupLocations,
    permissionStatus,
    requestLocationAccess,
  } = useLocation(
    authUser?.uid,
    selectedGroupId,
    Boolean(profile?.privacy.locationSharingEnabled),
    blockedUserIds,
  );
  const members = useGroupMembers(selectedGroupId).filter((member) => !blockedUserIds.includes(member.userId));
  const alerts = useAlerts(selectedGroupId);
  const privacy = profile?.privacy ?? USER_SEED.privacy;
  const activeGroup = useMemo(
    () => resolveActiveGroup(groups, selectedGroupId),
    [groups, selectedGroupId],
  );
  const currentUser = useMemo(
    () => ({
      displayName: resolveHomeMarkerDisplayName(profile?.name ?? authUser?.displayName, USER_SEED.name),
      photoURL: profile?.photoURL ?? authUser?.photoURL ?? undefined,
      role: activeGroup?.ownerId === authUser?.uid ? "owner" : activeGroup?.memberRole,
      userId: authUser?.uid ?? USER_SEED.userId,
    }),
    [activeGroup?.memberRole, activeGroup?.ownerId, authUser?.displayName, authUser?.photoURL, authUser?.uid, profile?.name, profile?.photoURL],
  );
  const primaryContactIds = preferences?.primaryContactIds ?? [];
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(currentUser.userId);
  const [selectedMarkerBubbleId, setSelectedMarkerBubbleId] = useState<string | null>(null);
  const [focusTarget, setFocusTarget] = useState<HomeMapFocusTarget | null>(null);
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState<string | null>(null);
  const [reverseGeocodedLocality, setReverseGeocodedLocality] = useState<string | null>(null);
  const [sharingOverride, setSharingOverride] = useState<boolean | null>(null);
  const [prefetchedMarkerPhotos, setPrefetchedMarkerPhotos] = useState<Record<string, true>>({});
  const [photoPrefetchAttempt, setPhotoPrefetchAttempt] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedCenterId, setSelectedCenterId] = useState<string | null>(null);
  const [selectedTravelMode, setSelectedTravelMode] = useState<EvacuationTravelMode>("four_wheeler");
  const [presenceNowMs, setPresenceNowMs] = useState(Date.now());
  const sheetAnimatedIndex = useSharedValue(0);
  const focusTokenRef = useRef(0);
  const hasFocusedCurrentUserRef = useRef(false);
  const lastGeocodeRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isSharingLive = sharingOverride ?? privacy.locationSharingEnabled;

  useEffect(() => {
    setSharingOverride(null);
  }, [privacy.locationSharingEnabled]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPresenceNowMs(Date.now());
    }, 60_000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!selectedGroupId) {
      setSosEvents([]);
      return;
    }

    return firestoreService.listenToSosEvents(selectedGroupId, (events) => {
      setSosEvents(events);
    });
  }, [selectedGroupId]);

  useEffect(() => {
    if (!currentLocation) {
      return;
    }

    if (
      lastGeocodeRef.current &&
      locationService.distanceBetween(lastGeocodeRef.current, currentLocation) < 150
    ) {
      return;
    }

    let active = true;

    void locationService
      .reverseGeocodeDetails(currentLocation)
      .then(({ addressLabel: nextAddressLabel, localityLabel }) => {
        if (!active) {
          return;
        }

        setReverseGeocodedAddress(nextAddressLabel);
        setReverseGeocodedLocality(localityLabel);
        lastGeocodeRef.current = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        };
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [currentLocation]);

  const homeMarkers = useMemo(
    () =>
      buildHomeMapMarkers({
        blockedUserIds,
        currentLocation,
        currentUser,
        groupLocations,
        members,
        nowMs: presenceNowMs,
        primaryContactIds,
      }),
    [blockedUserIds, currentLocation, currentUser, groupLocations, members, presenceNowMs, primaryContactIds],
  );
  const stableAlerts = useStableValueBySignature(
    alerts,
    useMemo(
      () =>
        alerts
          .map(
            (alert) =>
              `${alert.alertId}:${alert.severity}:${alert.latitude}:${alert.longitude}:${alert.createdAt}`,
          )
          .join("|"),
      [alerts],
    ),
  );
  const stableCenters = useStableValueBySignature(
    centers,
    useMemo(
      () =>
        centers
          .map(
            (center) =>
              `${center.centerId}:${center.latitude}:${center.longitude}:${center.name}:${center.address}`,
          )
          .join("|"),
      [centers],
    ),
  );
  const stableHomeMarkers = useStableValueBySignature(
    homeMarkers,
    useMemo(
      () =>
        homeMarkers
          .map(
            (marker) =>
              `${marker.markerId}:${marker.latitude}:${marker.longitude}:${marker.photoURL ?? ""}:${marker.sharingState}:${marker.presenceStatus}:${marker.lastSeenMinutes ?? ""}:${marker.isCurrentUser ? 1 : 0}:${marker.isPrimaryContact ? 1 : 0}`,
          )
          .join("|"),
      [homeMarkers],
    ),
  );
  const nearbySafetyHubs = useMemo(() => {
    return sortNearbySafetyHubs(stableCenters, currentLocation);
  }, [stableCenters, currentLocation]);
  const nearestVisibleCenter = nearbySafetyHubs[0] ?? null;
  const markerLookup = useMemo(
    () =>
      stableHomeMarkers.reduce<Record<string, (typeof stableHomeMarkers)[number]>>((lookup, marker) => {
        lookup[marker.userId] = marker;
        return lookup;
      }, {}),
    [stableHomeMarkers],
  );
  const centerLookup = useMemo(
    () =>
      nearbySafetyHubs.reduce<Record<string, (typeof nearbySafetyHubs)[number]>>((lookup, center) => {
        lookup[center.centerId] = center;
        return lookup;
      }, {}),
    [nearbySafetyHubs],
  );
  const visibleCircleMarkers = useMemo(
    () => stableHomeMarkers.filter((marker) => !marker.isCurrentUser),
    [stableHomeMarkers],
  );
  const activeSosSenderIds = useMemo(
    () =>
      [
        ...new Set(
          sosEvents
            .filter(
              (event) =>
                isSosEventActiveForHomeContacts(event, presenceNowMs) &&
                !blockedUserIds.includes(event.senderId),
            )
            .map((event) => event.senderId),
        ),
      ],
    [blockedUserIds, presenceNowMs, sosEvents],
  );
  const contactItems = useMemo<HomeContactItem[]>(
    () =>
      members
        .filter((member) => member.userId !== currentUser.userId)
        .map((member) => {
          const marker = markerLookup[member.userId] ?? null;
          const distanceLabel =
            currentLocation && marker
              ? `${toDistanceLabel(locationService.distanceBetween(currentLocation, marker))} away`
              : null;
          const activeSos = activeSosSenderIds.includes(member.userId);

          return {
            activeSos,
            marker,
            member,
            subtitle: buildHomeContactSubtitle({
              activeSos,
              distanceLabel,
              lastSeenMinutes: marker?.lastSeenMinutes,
              markerVisible: Boolean(marker),
              presenceStatus: marker?.presenceStatus,
            }),
          };
      }),
    [activeSosSenderIds, currentLocation, currentUser.userId, markerLookup, members],
  );
  const addressLabel = resolveHomeAddressLabel({
    reverseGeocodedAddress,
    nearestCenterAddress: nearestVisibleCenter?.address ?? null,
    groupName: activeGroup?.name ?? null,
  });
  const sheetContentPaddingBottom = Math.max(Math.min(insets.bottom, 8), 4);
  const isSheetFullyExpanded = sheetIndex >= sheetSnapPoints.length - 1;
  const missingMarkerPhotoUrls = useMemo(
    () =>
      [...new Set(stableHomeMarkers.map((marker) => marker.photoURL).filter((photoURL): photoURL is string => Boolean(photoURL)))]
        .filter((photoURL) => !prefetchedMarkerPhotos[photoURL]),
    [stableHomeMarkers, prefetchedMarkerPhotos],
  );

  useEffect(() => {
    if (!selectedMarkerId && currentUser.userId) {
      setSelectedMarkerId(currentUser.userId);
    }
  }, [currentUser.userId, selectedMarkerId]);

  useEffect(() => {
    if (selectedMarkerBubbleId && !markerLookup[selectedMarkerBubbleId]) {
      setSelectedMarkerBubbleId(null);
    }
  }, [markerLookup, selectedMarkerBubbleId, selectedGroupId]);

  useEffect(() => {
    if (!nearestVisibleCenter) {
      setSelectedCenterId(null);
      return;
    }

    if (selectedCenterId && !centerLookup[selectedCenterId]) {
      setSelectedCenterId(null);
    }
  }, [centerLookup, nearestVisibleCenter, selectedCenterId, selectedGroupId]);

  useEffect(() => {
    if (!currentLocation || hasFocusedCurrentUserRef.current || !currentUser.userId) {
      return;
    }

    hasFocusedCurrentUserRef.current = true;
    setSelectedMarkerId(currentUser.userId);
    focusTokenRef.current += 1;
    setFocusTarget({ kind: "currentUser", token: focusTokenRef.current });
  }, [currentLocation, currentUser.userId]);

  useEffect(() => {
    if (!missingMarkerPhotoUrls.length) {
      return;
    }

    let active = true;

    void Promise.allSettled(
      missingMarkerPhotoUrls.map(async (photoURL) => {
        await Image.prefetch(photoURL);
        return photoURL;
      }),
    ).then((results) => {
      if (!active) {
        return;
      }

      const readyUrls = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
        .map((result) => result.value);

      if (!readyUrls.length) {
        return;
      }

      setPrefetchedMarkerPhotos((currentValue) => {
        const nextValue = { ...currentValue };
        let didChange = false;

        readyUrls.forEach((photoURL) => {
          if (!nextValue[photoURL]) {
            nextValue[photoURL] = true;
            didChange = true;
          }
        });

        return didChange ? nextValue : currentValue;
      });
    });

    return () => {
      active = false;
    };
  }, [missingMarkerPhotoUrls, photoPrefetchAttempt]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && missingMarkerPhotoUrls.length) {
        setPhotoPrefetchAttempt((currentValue) => currentValue + 1);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [missingMarkerPhotoUrls.length]);

  const issueFocus = useCallback((target: HomeMapFocusRequest) => {
    focusTokenRef.current += 1;
    setFocusTarget({ ...target, token: focusTokenRef.current });
  }, []);

  const handleFocusCurrentUser = useCallback(() => {
    setSelectedCenterId(null);
    setSelectedMarkerBubbleId(null);
    issueFocus({ kind: "currentUser" });
  }, [issueFocus]);

  const handleMarkerFocus = useCallback((markerId: string) => {
    setSelectedMarkerId(markerId);
    setSelectedCenterId(null);
    setSelectedMarkerBubbleId(markerId);
    issueFocus({ kind: "marker", markerId });
  }, [issueFocus]);

  const handleFocusCenter = useCallback((centerId: string) => {
    const targetCenter = centerLookup[centerId];
    if (!targetCenter) {
      return;
    }

    setSelectedCenterId(centerId);
    setSelectedMarkerBubbleId(null);
    issueFocus({ kind: "center", centerId });
  }, [centerLookup, issueFocus]);

  const handleFocusNearestHub = useCallback(() => {
    if (!nearestVisibleCenter) {
      return;
    }

    handleFocusCenter(nearestVisibleCenter.centerId);
  }, [handleFocusCenter, nearestVisibleCenter]);

  const handleTravelModeSelect = useCallback((travelMode: EvacuationTravelMode) => {
    setSelectedTravelMode(travelMode);
  }, []);

  const handleCenterPress = useCallback((centerId: string) => {
    setSelectedCenterId(centerId);
    setSelectedMarkerBubbleId(null);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedCenterId(null);
    setSelectedMarkerBubbleId(null);
  }, []);

  const handleMemberBubbleDismiss = useCallback(() => {
    setSelectedMarkerBubbleId(null);
  }, []);

  const handleToggleSharing = useCallback(async () => {
    const nextValue = !isSharingLive;
    setSharingOverride(nextValue);

    try {
      await saveProfile({
        privacy: {
          locationSharingEnabled: nextValue,
          shareWhileUsingOnly: true,
          emergencyBroadcastEnabled: privacy.emergencyBroadcastEnabled,
        },
      });

      if (nextValue) {
        issueFocus({ kind: "currentUser" });
      }
    } catch {
      setSharingOverride(null);
    }
  }, [isSharingLive, issueFocus, privacy.emergencyBroadcastEnabled, saveProfile]);

  const handleOpenSos = useCallback(() => {
    router.push("/(tabs)/sos");
  }, [router]);

  return {
    activeGroupName: activeGroup?.name ?? "SOSync Home",
    addressLabel,
    appearance,
    centers: nearbySafetyHubs,
    contactItems,
    currentLocation,
    groups,
    handleCenterPress,
    handleFocusCurrentUser,
    handleFocusNearestHub,
    handleMapPress,
    handleMarkerFocus,
    handleMemberBubbleDismiss,
    handleOpenSos,
    handleTravelModeSelect,
    handleToggleSharing,
    handleTrustedCircleSelect: setSelectedGroupId,
    nearbySafetyHubs,
    isSheetFullyExpanded,
    isSharingLive,
    nearestCenter: nearestVisibleCenter,
    palette,
    permissionStatus,
    prefetchedMarkerPhotos,
    profile,
    quickMemberMarkers: visibleCircleMarkers,
    reverseGeocodedLocality,
    requestLocationAccess,
    selectedCenterId,
    selectedTravelMode,
    selectedMarkerBubbleId,
    selectedGroupId,
    selectedMarkerId,
    sheetIndex,
    sheetAnimatedIndex,
    sheetAnimationConfigs,
    sheetContentPaddingBottom,
    sheetSnapPoints,
    setSheetIndex,
    stableAlerts,
    stableHomeMarkers,
    focusTarget,
  };
};

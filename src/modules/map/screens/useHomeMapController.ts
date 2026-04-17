/** Purpose: Keep Home map orchestration in one hook so the screen file stays focused on composition only. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, Linking, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomSheetTimingConfigs } from "@gorhom/bottom-sheet";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import type { MapOverviewHandle } from "@/modules/map/components/MapOverview";
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
  buildHomeMapMarkers,
  buildGoogleMapsDirectionsUrls,
  HOME_SHEET_SNAP_POINTS,
  resolveHomeAddressLabel,
  resolveHomeMapAppearance,
} from "@/modules/map/homeUtils";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { HomeMapFocusTarget } from "@/types";
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
    nearestCenter,
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
      displayName: profile?.name ?? authUser?.displayName ?? USER_SEED.name,
      photoURL: profile?.photoURL ?? authUser?.photoURL ?? undefined,
      role: activeGroup?.ownerId === authUser?.uid ? "owner" : activeGroup?.memberRole,
      userId: authUser?.uid ?? USER_SEED.userId,
    }),
    [activeGroup?.memberRole, activeGroup?.ownerId, authUser?.displayName, authUser?.photoURL, authUser?.uid, profile?.name, profile?.photoURL],
  );
  const primaryContactIds = preferences?.primaryContactIds ?? [];
  const [activeSosSenderIds, setActiveSosSenderIds] = useState<string[]>([]);
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
  const [mapSnapshotUri, setMapSnapshotUri] = useState<string | null>(null);
  const sheetAnimatedIndex = useSharedValue(0);
  const snapshotOpacity = useSharedValue(0);
  const focusTokenRef = useRef(0);
  const mapOverviewRef = useRef<MapOverviewHandle | null>(null);
  const hasFocusedCurrentUserRef = useRef(false);
  const hasSeenFocusedHomeRef = useRef(false);
  const lastGeocodeRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const isSharingLive = sharingOverride ?? privacy.locationSharingEnabled;

  useEffect(() => {
    setSharingOverride(null);
  }, [privacy.locationSharingEnabled]);

  useEffect(() => {
    if (!selectedGroupId) {
      setActiveSosSenderIds([]);
      return;
    }

    return firestoreService.listenToSosEvents(selectedGroupId, (events) => {
      setActiveSosSenderIds(
        events
          .filter((event) => event.status === "active" && !blockedUserIds.includes(event.senderId))
          .map((event) => event.senderId),
      );
    });
  }, [blockedUserIds, selectedGroupId]);

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
        primaryContactIds,
      }),
    [blockedUserIds, currentLocation, currentUser, groupLocations, members, primaryContactIds],
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
              `${marker.markerId}:${marker.latitude}:${marker.longitude}:${marker.photoURL ?? ""}:${marker.sharingState}:${marker.isCurrentUser ? 1 : 0}:${marker.isPrimaryContact ? 1 : 0}`,
          )
          .join("|"),
      [homeMarkers],
    ),
  );
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
      stableCenters.reduce<Record<string, (typeof stableCenters)[number]>>((lookup, center) => {
        lookup[center.centerId] = center;
        return lookup;
      }, {}),
    [stableCenters],
  );
  const visibleCircleMarkers = useMemo(
    () => stableHomeMarkers.filter((marker) => !marker.isCurrentUser),
    [stableHomeMarkers],
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
              : marker
                ? "Live on map"
                : "Location hidden";

          return {
            activeSos: activeSosSenderIds.includes(member.userId),
            marker,
            member,
            subtitle: activeSosSenderIds.includes(member.userId)
              ? "Active SOS"
              : `${member.role || "Circle member"} | ${distanceLabel}`,
          };
      }),
    [activeSosSenderIds, currentLocation, currentUser.userId, markerLookup, members],
  );
  const addressLabel = resolveHomeAddressLabel({
    reverseGeocodedAddress,
    nearestCenterAddress: nearestCenter?.address ?? null,
    groupName: activeGroup?.name ?? null,
  });
  const selectedCenter = selectedCenterId ? centerLookup[selectedCenterId] ?? null : null;
  const activeHubCenter = selectedCenter ?? nearestCenter ?? null;
  const hubSummaryLabel = currentLocation && activeHubCenter
    ? `${toDistanceLabel(locationService.distanceBetween(currentLocation, activeHubCenter))} away`
    : activeHubCenter
      ? "Open this safety hub in Maps for directions."
      : "Location access is required to resolve nearby hubs.";
  const sheetContentPaddingBottom = Math.max(Math.min(insets.bottom, 8), 4);
  const isSheetFullyExpanded = sheetIndex >= sheetSnapPoints.length - 1;
  const missingMarkerPhotoUrls = useMemo(
    () =>
      [...new Set(stableHomeMarkers.map((marker) => marker.photoURL).filter((photoURL): photoURL is string => Boolean(photoURL)))]
        .filter((photoURL) => !prefetchedMarkerPhotos[photoURL]),
    [stableHomeMarkers, prefetchedMarkerPhotos],
  );
  const mapSnapshotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: snapshotOpacity.value,
  }));

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
    if (!nearestCenter) {
      setSelectedCenterId(null);
      return;
    }

    if (selectedCenterId && !centerLookup[selectedCenterId]) {
      setSelectedCenterId(null);
    }
  }, [centerLookup, nearestCenter, selectedCenterId, selectedGroupId]);

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

  useEffect(() => {
    if (Platform.OS !== "android" || isFocused || !hasSeenFocusedHomeRef.current) {
      return;
    }

    let active = true;

    const timer = setTimeout(() => {
      void mapOverviewRef.current?.takeSnapshot().then((snapshotUri: string | null) => {
        if (active && snapshotUri) {
          setMapSnapshotUri((currentValue) => (currentValue === snapshotUri ? currentValue : snapshotUri));
        }
      });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isFocused]);

  useEffect(() => {
    if (Platform.OS !== "android" || !isFocused) {
      return;
    }

    if (!hasSeenFocusedHomeRef.current) {
      hasSeenFocusedHomeRef.current = true;
      return;
    }

    if (!mapSnapshotUri) {
      return;
    }

    snapshotOpacity.value = 1;
    snapshotOpacity.value = withDelay(
      90,
      withTiming(0, {
        duration: 150,
      }),
    );
  }, [isFocused, mapSnapshotUri, snapshotOpacity]);

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
    if (!nearestCenter) {
      return;
    }

    handleFocusCenter(nearestCenter.centerId);
  }, [handleFocusCenter, nearestCenter]);

  const handleOpenHubInMaps = useCallback(async (centerId?: string | null) => {
    const targetCenter =
      (centerId ? centerLookup[centerId] : null) ??
      activeHubCenter;

    if (!targetCenter) {
      return;
    }

    const urls = buildGoogleMapsDirectionsUrls({
      destination: {
        latitude: targetCenter.latitude,
        longitude: targetCenter.longitude,
      },
      origin: currentLocation ?? undefined,
    });

    try {
      const canOpenAppUrl = await Linking.canOpenURL(urls.appUrl);
      await Linking.openURL(canOpenAppUrl ? urls.appUrl : urls.webUrl);
    } catch {
      await Linking.openURL(urls.webUrl);
    }
  }, [activeHubCenter, centerLookup, currentLocation]);

  const handleCenterPress = useCallback((centerId: string) => {
    setSelectedCenterId(centerId);
    setSelectedMarkerBubbleId(null);
    issueFocus({ kind: "center", centerId });
  }, [issueFocus]);

  const handleMapPress = useCallback(() => {
    setSelectedCenterId(null);
    setSelectedMarkerBubbleId(null);
  }, []);

  const handleMemberBubbleDismiss = useCallback(() => {
    setSelectedMarkerBubbleId(null);
  }, []);

  const handleCenterOpenMaps = useCallback((centerId: string) => {
    void handleOpenHubInMaps(centerId);
  }, [handleOpenHubInMaps]);

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
    activeHubCenter,
    addressLabel,
    appearance,
    centers: stableCenters,
    contactItems,
    currentLocation,
    groups,
    handleCenterOpenMaps,
    handleCenterPress,
    handleFocusCurrentUser,
    handleFocusNearestHub,
    handleMapPress,
    handleMarkerFocus,
    handleMemberBubbleDismiss,
    handleOpenHubInMaps,
    handleOpenSos,
    handleToggleSharing,
    handleTrustedCircleSelect: setSelectedGroupId,
    hubSummaryLabel,
    isSheetFullyExpanded,
    isSharingLive,
    mapOverviewRef,
    mapSnapshotAnimatedStyle,
    mapSnapshotUri,
    nearestCenter,
    palette,
    permissionStatus,
    prefetchedMarkerPhotos,
    profile,
    quickMemberMarkers: visibleCircleMarkers,
    reverseGeocodedLocality,
    requestLocationAccess,
    selectedCenterId,
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

/** Purpose: Render the Home scene as a map-first experience with a draggable bottom sheet and Home-only dock. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, Platform, Pressable, Text, useColorScheme, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import BottomSheet, {
  BottomSheetFlatList,
  TouchableOpacity as BottomSheetTouchableOpacity,
  useBottomSheetTimingConfigs,
} from "@gorhom/bottom-sheet";
import { ScrollView as GestureHandlerScrollView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { MapOverview, type MapOverviewHandle } from "@/modules/map/components/MapOverview";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useGroupPreferences } from "@/hooks/useGroupPreferences";
import { useGroupStatuses } from "@/hooks/useGroupStatuses";
import { useGroups } from "@/hooks/useGroups";
import { useLocation } from "@/hooks/useLocation";
import {
  buildHomeMapMarkers,
  HOME_SHEET_SNAP_POINTS,
  resolveHomeAddressLabel,
  resolveHomeMapAppearance,
} from "@/modules/map/homeUtils";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";
import type { GroupMember, HomeMapAppearance, HomeMapFocusTarget, SafetyStatus } from "@/types";
import { USER_SEED } from "@/utils/constants";
import { getSafetyStatusLabel, toDistanceLabel, toDurationLabel, toInitials } from "@/utils/helpers";

const statusOptions: Array<{ key: SafetyStatus; label: string }> = [
  { key: "safe", label: "Feeling Safe" },
  { key: "need_help", label: "Need Help" },
  { key: "need_evacuation", label: "Need Evacuation" },
  { key: "unavailable", label: "Unavailable" },
];

const getPalette = (appearance: HomeMapAppearance) =>
  appearance === "dark"
    ? {
        chip: "#294053",
        chipText: "#FFFFFF",
        danger: "#FF4B3E",
        divider: "rgba(255, 255, 255, 0.12)",
        floatingBorder: "rgba(255, 255, 255, 0.16)",
        floatingSurface: "rgba(55, 74, 95, 0.96)",
        iconTint: "#FFFFFF",
        page: "#13202D",
        share: "#5C1515",
        sheet: "#33475B",
        sheetHandle: "#8EA3B7",
        sheetText: "#FFFFFF",
        sheetTextMuted: "rgba(232, 237, 242, 0.76)",
        statusDot: "#2DDE63",
        topPill: "rgba(53, 72, 94, 0.95)",
      }
    : {
        chip: "#FFFFFF",
        chipText: "#2E2C2C",
        danger: "#B4463F",
        divider: "#E5D9D4",
        floatingBorder: "#E8DDD8",
        floatingSurface: "rgba(255, 255, 255, 0.96)",
        iconTint: "#7B2C28",
        page: "#FFFFFF",
        share: "#A9443D",
        sheet: "#FCFAF8",
        sheetHandle: "#B8AAA4",
        sheetText: "#2E2C2C",
        sheetTextMuted: "#6A6767",
        statusDot: "#2DDE63",
        topPill: "rgba(255, 255, 255, 0.97)",
      };

const statusColorByKey: Record<SafetyStatus, string> = {
  safe: "#2DDE63",
  need_help: "#F2A93B",
  need_evacuation: "#FF7A45",
  unavailable: "#9AA4AE",
};

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

export default function HomeMapScreen() {
  const router = useRouter();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const appearance = resolveHomeMapAppearance(colorScheme);
  const palette = getPalette(appearance);
  const sheetSnapPoints = useMemo(() => [...HOME_SHEET_SNAP_POINTS], []);
  const sheetAnimationConfigs = useBottomSheetTimingConfigs({
    duration: 220,
    easing: Easing.out(Easing.cubic),
  });
  const { authUser, profile, saveProfile } = useAuthSession();
  const { groups, selectedGroupId, setSelectedGroupId } = useGroups();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const { preferences } = useGroupPreferences(authUser?.uid, selectedGroupId);
  const privacy = profile?.privacy ?? USER_SEED.privacy;
  const safety = profile?.safety ?? USER_SEED.safety;
  const members = useGroupMembers(selectedGroupId).filter((member) => !blockedUserIds.includes(member.userId));
  const statuses = useGroupStatuses(selectedGroupId).filter((status) => !blockedUserIds.includes(status.userId));
  const alerts = useAlerts(selectedGroupId);
  const [activeSosSenderIds, setActiveSosSenderIds] = useState<string[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(authUser?.uid ?? null);
  const [focusTarget, setFocusTarget] = useState<HomeMapFocusTarget | null>(null);
  const [reverseGeocodedAddress, setReverseGeocodedAddress] = useState<string | null>(null);
  const [sharingOverride, setSharingOverride] = useState<boolean | null>(null);
  const [prefetchedMarkerPhotos, setPrefetchedMarkerPhotos] = useState<Record<string, true>>({});
  const [photoPrefetchAttempt, setPhotoPrefetchAttempt] = useState(0);
  const [sheetIndex, setSheetIndex] = useState(0);
  const sheetAnimatedIndex = useSharedValue(0);
  const snapshotOpacity = useSharedValue(0);
  const focusTokenRef = useRef(0);
  const mapOverviewRef = useRef<MapOverviewHandle | null>(null);
  const hasFocusedCurrentUserRef = useRef(false);
  const lastGeocodeRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [mapSnapshotUri, setMapSnapshotUri] = useState<string | null>(null);
  const { centers, currentLocation, groupLocations, nearestCenter, permissionStatus, requestRoute, route } = useLocation(
    authUser?.uid,
    selectedGroupId,
    Boolean(privacy.locationSharingEnabled),
    blockedUserIds,
  );
  const activeGroup = groups.find((group) => group.groupId === selectedGroupId) ?? groups[0];
  const primaryContactIds = preferences?.primaryContactIds ?? [];
  const currentUser = {
    userId: authUser?.uid ?? USER_SEED.userId,
    displayName: profile?.name ?? authUser?.displayName ?? USER_SEED.name,
    photoURL: profile?.photoURL ?? authUser?.photoURL ?? undefined,
    role: activeGroup?.ownerId === authUser?.uid ? "owner" : activeGroup?.memberRole,
  };
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
      .reverseGeocode(currentLocation)
      .then((label) => {
        if (!active) {
          return;
        }

        setReverseGeocodedAddress(label);
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

  const statusLookup = useMemo(
    () =>
      statuses.reduce<Record<string, SafetyStatus>>((lookup, status) => {
        lookup[status.userId] = status.status;
        return lookup;
      }, {}),
    [statuses],
  );
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
  const visibleCircleMarkers = stableHomeMarkers.filter((marker) => !marker.isCurrentUser);
  const contactMembers = useMemo(
    () => members.filter((member) => member.userId !== currentUser.userId),
    [currentUser.userId, members],
  );
  const currentUserStatus: SafetyStatus =
    statusLookup[currentUser.userId] ?? (safety.shareStatusEnabled ? "safe" : "unavailable");
  const addressLabel = resolveHomeAddressLabel({
    reverseGeocodedAddress,
    nearestCenterAddress: nearestCenter?.address ?? null,
    groupName: activeGroup?.name ?? null,
  });
  const routeOrDistanceLabel =
    route && route.targetCenterId === nearestCenter?.centerId
      ? `${toDistanceLabel(route.distanceMeters)} • ${toDurationLabel(route.durationSeconds)}`
      : currentLocation && nearestCenter
        ? `${toDistanceLabel(locationService.distanceBetween(currentLocation, nearestCenter))} away`
        : "Tap to center the nearest safety hub";
  const sheetContentPaddingBottom = Math.max(insets.bottom + 20, 32);
  const isSheetFullyExpanded = sheetIndex >= sheetSnapPoints.length - 1;
  const missingMarkerPhotoUrls = useMemo(
    () =>
      [...new Set(stableHomeMarkers.map((marker) => marker.photoURL).filter((photoURL): photoURL is string => Boolean(photoURL)))]
        .filter((photoURL) => !prefetchedMarkerPhotos[photoURL]),
    [stableHomeMarkers, prefetchedMarkerPhotos],
  );
  const quickMemberStack = useMemo(() => {
    const count = visibleCircleMarkers.length;

    if (count >= 6) {
      return { innerSize: 32, outerSize: 38, verticalGap: 8, offsetX: 3, maxVisible: 6 };
    }

    if (count >= 5) {
      return { innerSize: 34, outerSize: 40, verticalGap: 9, offsetX: 4, maxVisible: 5 };
    }

    if (count >= 4) {
      return { innerSize: 36, outerSize: 42, verticalGap: 10, offsetX: 5, maxVisible: 4 };
    }

    return { innerSize: 42, outerSize: 50, verticalGap: 12, offsetX: 8, maxVisible: 4 };
  }, [visibleCircleMarkers.length]);
  const quickMemberStackAnimatedStyle = useAnimatedStyle(() => {
    const topIndex = Math.max(sheetSnapPoints.length - 1, 0);
    const fadeStartIndex = Math.max(topIndex - 0.35, 0);
    const opacity = interpolate(
      sheetAnimatedIndex.value,
      [fadeStartIndex, topIndex],
      [1, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity,
    };
  }, [sheetSnapPoints.length]);
  const mapSnapshotAnimatedStyle = useAnimatedStyle(() => ({
    opacity: snapshotOpacity.value,
  }));

  useEffect(() => {
    if (!selectedMarkerId && currentUser.userId) {
      setSelectedMarkerId(currentUser.userId);
    }
  }, [currentUser.userId, selectedMarkerId]);

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
    if (Platform.OS !== "android" || !isFocused) {
      return;
    }

    let active = true;

    const timer = setTimeout(() => {
      void mapOverviewRef.current?.takeSnapshot().then((snapshotUri: string | null) => {
        if (active && snapshotUri) {
          setMapSnapshotUri(snapshotUri);
        }
      });
    }, 420);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isFocused, selectedGroupId, stableHomeMarkers]);

  useEffect(() => {
    if (Platform.OS !== "android" || !isFocused || !mapSnapshotUri) {
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

  const handleMarkerFocus = useCallback((markerId: string) => {
    setSelectedMarkerId(markerId);
    issueFocus({ kind: "marker", markerId });
  }, [issueFocus]);

  const handleToggleSharing = async () => {
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
  };

  const handleSelectStatus = async (status: SafetyStatus) => {
    if (!authUser?.uid || !selectedGroupId) {
      return;
    }

    await firestoreService.saveGroupStatus({
      groupId: selectedGroupId,
      userId: authUser.uid,
      status,
      updatedAt: new Date().toISOString(),
    });
  };

  const renderContact = ({ item: member }: { item: GroupMember }) => {
    const marker = markerLookup[member.userId];
    const activeSos = activeSosSenderIds.includes(member.userId);
    const distanceLabel =
      currentLocation && marker
        ? `${toDistanceLabel(locationService.distanceBetween(currentLocation, marker))} away`
        : marker
          ? "Live on map"
          : "Location hidden";

    return (
      <View className="flex-row items-center px-5 py-3">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-white">
          {member.photoURL ? (
            <Image className="h-10 w-10 rounded-full" resizeMode="cover" source={{ uri: member.photoURL }} />
          ) : (
            <Text className="text-sm font-semibold" style={{ color: palette.danger }}>
              {toInitials(member.displayName)}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[16px] font-medium" style={{ color: palette.sheetText }}>
            {member.displayName}
          </Text>
          <Text className="mt-1 text-[13px]" style={{ color: palette.sheetTextMuted }}>
            {activeSos ? "Active SOS" : `${member.role || "Circle member"} | ${distanceLabel}`}
          </Text>
        </View>
        <BottomSheetTouchableOpacity
          activeOpacity={0.85}
          disabled={!marker}
          onPress={() => marker && handleMarkerFocus(marker.markerId)}
          style={{
            alignItems: "center",
            backgroundColor: marker ? palette.chip : "transparent",
            borderRadius: 999,
            height: 44,
            justifyContent: "center",
            opacity: marker ? 1 : 0.4,
            width: 44,
          }}
        >
          <MaterialCommunityIcons color={palette.iconTint} name="map-marker-account-outline" size={18} />
        </BottomSheetTouchableOpacity>
      </View>
    );
  };

  const listHeader = (
    <View className="px-5 pt-1">
      <View className="mb-4">
        <View className="flex-row items-center justify-between">
          <View
            className="mr-3 flex-row items-center rounded-full px-3 py-2.5"
            style={{ backgroundColor: palette.chip, flexShrink: 1 }}
          >
            <View
              className="mr-2.5 h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: statusColorByKey[currentUserStatus] }}
            />
            <Text className="text-[16px] font-medium" numberOfLines={1} style={{ color: palette.chipText, flexShrink: 1 }}>
              {safety.shareStatusEnabled ? getSafetyStatusLabel(currentUserStatus) : "Status Private"}
            </Text>
          </View>
          <BottomSheetTouchableOpacity
            activeOpacity={0.85}
            onPress={handleToggleSharing}
            style={{
              alignItems: "center",
              backgroundColor: palette.share,
              borderRadius: 999,
              flexDirection: "row",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <MaterialCommunityIcons
              color="#FFFFFF"
              name={isSharingLive ? "pause" : "share-variant"}
              size={16}
            />
            <Text className="ml-2.5 text-[15px] font-semibold text-white">
              {isSharingLive ? "Pause Live" : "Share Live"}
            </Text>
          </BottomSheetTouchableOpacity>
        </View>
        <Text className="mt-4 text-[22px] font-semibold" style={{ color: palette.sheetText }}>
          {activeGroup?.name ?? "SOSync Home"}
        </Text>
        <Text className="mt-1 text-[14px]" style={{ color: isSharingLive ? palette.statusDot : palette.sheetTextMuted }}>
          {isSharingLive ? "Live tracking active" : "Live tracking paused"}
        </Text>
        <BottomSheetTouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push("/(tabs)/sos")}
          style={{
            alignItems: "center",
            backgroundColor: palette.danger,
            borderRadius: 22,
            marginTop: 16,
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <View className="flex-row items-center">
            <MaterialCommunityIcons color="#FFFFFF" name="alert-circle-outline" size={20} />
            <Text className="ml-3 text-[18px] font-semibold text-white">Report/SOS</Text>
          </View>
        </BottomSheetTouchableOpacity>
      </View>

      {groups.length > 1 ? (
        <View className="mb-4">
          <Text className="mb-2 text-[18px] font-semibold" style={{ color: palette.sheetText }}>
            Trusted circles
          </Text>
          <GestureHandlerScrollView
            horizontal
            contentContainerStyle={{ paddingRight: 8 }}
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
          >
            {groups.map((group) => {
              const selected = group.groupId === selectedGroupId;
              return (
                <BottomSheetTouchableOpacity
                  activeOpacity={0.85}
                  key={group.groupId}
                  onPress={() => setSelectedGroupId(group.groupId)}
                  style={{
                    backgroundColor: selected ? palette.danger : palette.chip,
                    borderColor: selected ? palette.danger : palette.divider,
                    borderRadius: 999,
                    borderWidth: 1,
                    marginRight: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    className="text-[14px] font-semibold"
                    style={{ color: selected ? "#FFFFFF" : palette.sheetText }}
                  >
                    {group.name}
                  </Text>
                </BottomSheetTouchableOpacity>
              );
            })}
          </GestureHandlerScrollView>
        </View>
      ) : null}

      <View className="mb-4">
        <Text className="mb-2 text-[18px] font-semibold" style={{ color: palette.sheetText }}>
          Shared status
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {statusOptions.map((option) => {
            const selected = currentUserStatus === option.key;
            return (
              <BottomSheetTouchableOpacity
                activeOpacity={0.85}
                key={option.key}
                onPress={() => handleSelectStatus(option.key)}
                style={{
                  backgroundColor: selected ? palette.danger : palette.chip,
                  borderRadius: 999,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text
                  className="text-[13px] font-medium"
                  style={{ color: selected ? "#FFFFFF" : palette.sheetText }}
                >
                  {option.label}
                </Text>
              </BottomSheetTouchableOpacity>
            );
          })}
        </View>
      </View>

      <View className="mb-1 border-t pt-4" style={{ borderTopColor: palette.divider }}>
        <Text className="text-[18px] font-semibold" style={{ color: palette.sheetText }}>
          Contacts
        </Text>
      </View>
    </View>
  );

  const listEmpty = (
    <View className="px-5 py-4">
      <Text className="text-sm leading-6" style={{ color: palette.sheetTextMuted }}>
        Join or create a trusted circle to see live contact markers and quick focusing.
      </Text>
    </View>
  );

  const listFooter = (
    <View className="px-5 pb-1 pt-4">
      <View className="border-t pt-4" style={{ borderTopColor: palette.divider }}>
        <Text className="text-[18px] font-semibold" style={{ color: palette.sheetText }}>
          Nearest Safety Hub
        </Text>
        <BottomSheetTouchableOpacity
          activeOpacity={0.88}
          disabled={!nearestCenter}
          onPress={() => {
            if (!nearestCenter) {
              return;
            }

            issueFocus({ kind: "center", centerId: nearestCenter.centerId });
            void requestRoute().catch(() => undefined);
          }}
          style={{
            backgroundColor: appearance === "dark" ? "#6C1F1D" : "#7B1F1E",
            borderRadius: 22,
            marginTop: 12,
            opacity: nearestCenter ? 1 : 0.5,
            paddingHorizontal: 18,
            paddingVertical: 16,
          }}
        >
          <View className="flex-row items-center">
            <MaterialCommunityIcons color="#FFFFFF" name="home-city-outline" size={24} />
            <View className="ml-3 flex-1">
              <Text className="text-[20px] font-semibold text-white">
                {nearestCenter?.name ?? "No safety hub available"}
              </Text>
              <Text className="mt-1 text-[13px] text-white/80">
                {nearestCenter ? routeOrDistanceLabel : "Location access is required to resolve nearby hubs."}
              </Text>
            </View>
            <MaterialCommunityIcons color="#FFFFFF" name="navigation-variant" size={20} />
          </View>
        </BottomSheetTouchableOpacity>
      </View>

      <Text className="mt-4 text-center text-[12px]" style={{ color: palette.sheetTextMuted }}>
        {permissionStatus === "granted"
          ? "Drag the sheet down anytime to keep more of the map in view."
          : "Grant location access to improve focus, address labels, and nearest safety hub routing."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.page }}>
      <StatusBar style={appearance === "dark" ? "light" : "dark"} />
      <View className="flex-1">
        <View
          style={{
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        >
          <MapOverview
            ref={mapOverviewRef}
            alerts={stableAlerts}
            centers={stableCenters}
            focusTarget={focusTarget}
            mapTheme={appearance}
            markers={stableHomeMarkers}
            onMarkerPress={handleMarkerFocus}
            prefetchedMarkerPhotos={prefetchedMarkerPhotos}
          />
          {Platform.OS === "android" && mapSnapshotUri ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  bottom: 0,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                },
                mapSnapshotAnimatedStyle,
              ]}
            >
              <Image
                resizeMode="cover"
                source={{ uri: mapSnapshotUri }}
                style={{
                  bottom: 0,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                }}
              />
            </Animated.View>
          ) : null}
        </View>

        <View className="absolute left-0 right-0 top-0 z-10 px-5" pointerEvents="box-none">
          <View
            className="mt-2 flex-row items-center rounded-full border px-4 py-3"
            style={{
              backgroundColor: palette.topPill,
              borderColor: palette.floatingBorder,
            }}
          >
            <MaterialCommunityIcons color={palette.iconTint} name="map-marker-radius-outline" size={18} />
            <Text
              className="ml-3 flex-1 text-[13px]"
              numberOfLines={1}
              style={{ color: palette.sheetText }}
            >
              {addressLabel}
            </Text>
            <View className="ml-3 flex-row gap-2">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={!currentLocation}
                onPress={() => issueFocus({ kind: "currentUser" })}
                style={{
                  backgroundColor: palette.floatingSurface,
                  opacity: currentLocation ? 1 : 0.5,
                }}
              >
                <MaterialCommunityIcons color={palette.iconTint} name="crosshairs-gps" size={18} />
              </Pressable>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={!nearestCenter}
                onPress={() => {
                  if (!nearestCenter) {
                    return;
                  }

                  issueFocus({ kind: "center", centerId: nearestCenter.centerId });
                  void requestRoute().catch(() => undefined);
                }}
                style={{
                  backgroundColor: palette.floatingSurface,
                  opacity: nearestCenter ? 1 : 0.5,
                }}
              >
                <MaterialCommunityIcons color={palette.iconTint} name="map-marker-path" size={18} />
              </Pressable>
            </View>
          </View>
        </View>

        {visibleCircleMarkers.length ? (
          <Animated.View
            className="absolute right-4 top-32 z-10"
            pointerEvents={isSheetFullyExpanded ? "none" : "auto"}
            style={quickMemberStackAnimatedStyle}
          >
            {visibleCircleMarkers.slice(0, quickMemberStack.maxVisible).map((marker, index) => {
              const selected = marker.markerId === selectedMarkerId;
              return (
                <Pressable
                  key={marker.markerId}
                  className="mb-3 items-center justify-center rounded-full border-2 bg-white shadow-soft"
                  onPress={() => handleMarkerFocus(marker.markerId)}
                  style={{
                    borderColor: selected ? palette.share : "#FFFFFF",
                    height: quickMemberStack.outerSize,
                    marginBottom: quickMemberStack.verticalGap,
                    marginRight: index % 2 === 0 ? 0 : quickMemberStack.offsetX,
                    width: quickMemberStack.outerSize,
                  }}
                >
                  {marker.photoURL ? (
                    <Image
                      className="rounded-full"
                      resizeMode="cover"
                      source={{ uri: marker.photoURL }}
                      style={{
                        height: quickMemberStack.innerSize,
                        width: quickMemberStack.innerSize,
                      }}
                    />
                  ) : (
                    <Text className="font-semibold" style={{ color: palette.danger, fontSize: quickMemberStack.innerSize >= 40 ? 12 : 11 }}>
                      {toInitials(marker.displayName)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        ) : null}

        <BottomSheet
          animationConfigs={sheetAnimationConfigs}
          backgroundStyle={{
            backgroundColor: palette.sheet,
            borderColor: palette.divider,
            borderTopLeftRadius: 34,
            borderTopRightRadius: 34,
            borderWidth: 1,
          }}
          enableDynamicSizing={false}
          enableOverDrag={false}
          enablePanDownToClose={false}
          handleIndicatorStyle={{
            backgroundColor: palette.sheetHandle,
            height: 6,
            width: 56,
          }}
          handleStyle={{
            paddingBottom: 8,
            paddingTop: 12,
          }}
          index={0}
          animatedIndex={sheetAnimatedIndex}
          onChange={setSheetIndex}
          snapPoints={sheetSnapPoints}
          style={{ zIndex: 20 }}
        >
          <BottomSheetFlatList<GroupMember>
            contentContainerStyle={{ paddingBottom: sheetContentPaddingBottom }}
            data={contactMembers}
            keyExtractor={(member: GroupMember) => member.userId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={listEmpty}
            ListFooterComponent={listFooter}
            ListHeaderComponent={listHeader}
            nestedScrollEnabled
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
          />
        </BottomSheet>
      </View>
    </SafeAreaView>
  );
}

/** Purpose: Track the current user position, nearby centers, and active group map data. */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { EvacuationCenter, GroupLocation } from "@/types";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";

type CurrentLocation = { latitude: number; longitude: number; accuracy?: number };
const LAST_SUCCESSFUL_LOCATION_STORAGE_KEY = "sosync:last-successful-location";
const LOCATION_COORDINATE_EPSILON = 0.00001;
const LOCATION_ACCURACY_EPSILON_METERS = 5;

const toCurrentLocation = (input: { coords: { accuracy?: number | null; latitude: number; longitude: number } }): CurrentLocation => ({
  latitude: input.coords.latitude,
  longitude: input.coords.longitude,
  accuracy: input.coords.accuracy ?? undefined,
});

const readCachedLocation = async (): Promise<CurrentLocation | null> => {
  try {
    const stored = await AsyncStorage.getItem(LAST_SUCCESSFUL_LOCATION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<CurrentLocation>;
    if (!Number.isFinite(parsed.latitude) || !Number.isFinite(parsed.longitude)) {
      return null;
    }

    return {
      latitude: Number(parsed.latitude),
      longitude: Number(parsed.longitude),
      accuracy: Number.isFinite(parsed.accuracy) ? Number(parsed.accuracy) : undefined,
    };
  } catch {
    return null;
  }
};

const areLocationsEquivalent = (
  currentValue: CurrentLocation | null,
  nextValue: CurrentLocation,
) => {
  if (!currentValue) {
    return false;
  }

  return (
    Math.abs(currentValue.latitude - nextValue.latitude) <= LOCATION_COORDINATE_EPSILON &&
    Math.abs(currentValue.longitude - nextValue.longitude) <= LOCATION_COORDINATE_EPSILON &&
    Math.abs((currentValue.accuracy ?? 0) - (nextValue.accuracy ?? 0)) <= LOCATION_ACCURACY_EPSILON_METERS
  );
};

export const useLocation = (
  userId: string | undefined,
  groupId: string | null,
  sharingEnabled: boolean,
  blockedUserIds: string[] = [],
  region = "PH",
) => {
  const [permissionStatus, setPermissionStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [rawGroupLocations, setRawGroupLocations] = useState<GroupLocation[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const previousSharingEnabled = useRef(sharingEnabled);
  const watchSubscriptionRef = useRef<{ remove: () => void } | null>(null);
  const permissionStatusRef = useRef<"idle" | "granted" | "denied">("idle");
  const currentLocationRef = useRef<CurrentLocation | null>(null);

  const applyCurrentLocation = useCallback((nextLocation: CurrentLocation) => {
    if (areLocationsEquivalent(currentLocationRef.current, nextLocation)) {
      return false;
    }

    currentLocationRef.current = nextLocation;
    setCurrentLocation(nextLocation);
    void AsyncStorage.setItem(LAST_SUCCESSFUL_LOCATION_STORAGE_KEY, JSON.stringify(nextLocation)).catch(() => undefined);
    return true;
  }, []);

  const setNextPermissionStatus = useCallback((nextStatus: "idle" | "granted" | "denied") => {
    permissionStatusRef.current = nextStatus;
    setPermissionStatus((currentValue) => (currentValue === nextStatus ? currentValue : nextStatus));
  }, []);

  const restoreCachedLocation = useCallback(async () => {
    if (currentLocationRef.current) {
      return;
    }

    const cachedLocation = await readCachedLocation();
    if (cachedLocation) {
      applyCurrentLocation(cachedLocation);
    }
  }, [applyCurrentLocation]);

  const ensureWatchSubscription = useCallback(async () => {
    if (watchSubscriptionRef.current) {
      return;
    }

    watchSubscriptionRef.current = await locationService.watchPosition((next) => {
      applyCurrentLocation(toCurrentLocation(next));
    });
  }, [applyCurrentLocation]);

  const hydrateLocationTracking = useCallback(async () => {
    const permission = await locationService.requestPermission();
    if (permission.status !== "granted") {
      setNextPermissionStatus("denied");
      throw new Error("Location permission is required to show the live disaster map.");
    }

    setNextPermissionStatus("granted");
    await restoreCachedLocation();
    await ensureWatchSubscription();

    try {
      const location = await locationService.getCurrentPosition();
      applyCurrentLocation(toCurrentLocation(location));
    } catch (error) {
      if (!currentLocationRef.current) {
        throw error;
      }
    }
  }, [applyCurrentLocation, ensureWatchSubscription, restoreCachedLocation, setNextPermissionStatus]);

  useEffect(() => {
    firestoreService.listEvacuationCenters(region).then(setCenters).catch(() => setCenters([]));
  }, [region]);

  useEffect(() => {
    if (!groupId) {
      setRawGroupLocations([]);
      return;
    }

    return firestoreService.listenToLocations(groupId, setRawGroupLocations);
  }, [groupId]);

  useEffect(() => {
    hydrateLocationTracking()
      .catch(() => undefined);

    return () => {
      watchSubscriptionRef.current?.remove();
      watchSubscriptionRef.current = null;
    };
  }, [groupId, hydrateLocationTracking, sharingEnabled, userId]);

  useEffect(() => {
    if (!currentLocation || !userId || !groupId) {
      previousSharingEnabled.current = sharingEnabled;
      return;
    }

    if (sharingEnabled) {
      previousSharingEnabled.current = true;
      void firestoreService.upsertLocation({
        userId,
        groupId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        sharingState: "live",
      });
      return;
    }

    if (previousSharingEnabled.current) {
      void firestoreService.upsertLocation({
        userId,
        groupId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        sharingState: "paused",
      });
    }

    previousSharingEnabled.current = false;
  }, [
    currentLocation,
    groupId,
    sharingEnabled,
    userId,
  ]);

  const nearestCenter = useMemo(
    () => locationService.getNearestCenter(currentLocation, centers),
    [centers, currentLocation],
  );
  const groupLocations = useMemo(
    () =>
      rawGroupLocations.filter(
        (location) => !blockedUserIds.includes(location.userId) && location.sharingState !== "paused",
      ),
    [blockedUserIds, rawGroupLocations],
  );

  return {
    permissionStatus,
    currentLocation,
    groupLocations,
    centers,
    nearestCenter,
    requestLocationAccess: async () => {
      try {
        await hydrateLocationTracking();
        return true;
      } catch {
        return permissionStatusRef.current === "granted";
      }
    },
  };
};

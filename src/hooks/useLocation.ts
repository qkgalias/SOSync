/** Purpose: Track the current user position, nearby centers, and active group map data. */
import { useEffect, useMemo, useRef, useState } from "react";

import type { EvacuationCenter, GroupLocation, RouteSummary } from "@/types";
import { apiService } from "@/services/apiService";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";

type CurrentLocation = { latitude: number; longitude: number; accuracy?: number };

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
  const [route, setRoute] = useState<RouteSummary | null>(null);
  const previousSharingEnabled = useRef(sharingEnabled);

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
    let active = true;
    let subscription: { remove: () => void } | null = null;

    locationService
      .getCurrentPosition()
      .then((location) => {
        if (!active) {
          return;
        }

        setPermissionStatus("granted");
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
        });
        return locationService.watchPosition((next) =>
          setCurrentLocation({
            latitude: next.coords.latitude,
            longitude: next.coords.longitude,
            accuracy: next.coords.accuracy ?? undefined,
          }),
        );
      })
      .then((watcher) => {
        subscription = watcher ?? null;
      })
      .catch(() => {
        if (active) {
          setPermissionStatus("denied");
        }
      });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

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

  const requestRoute = async () => {
    if (!currentLocation || !nearestCenter) {
      setRoute(null);
      return;
    }

    const nextRoute = await apiService.getEvacuationRoute({
      origin: currentLocation,
      destination: {
        centerId: nearestCenter.centerId,
        latitude: nearestCenter.latitude,
        longitude: nearestCenter.longitude,
      },
    });
    setRoute(nextRoute);
  };

  return {
    permissionStatus,
    currentLocation,
    groupLocations,
    centers,
    nearestCenter,
    route,
    requestRoute,
  };
};

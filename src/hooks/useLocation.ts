/** Purpose: Track the current user position, nearby centers, and active group map data. */
import { useEffect, useEffectEvent, useMemo, useState } from "react";

import type { EvacuationCenter, GroupLocation, RouteSummary } from "@/types";
import { apiService } from "@/services/apiService";
import { firestoreService } from "@/services/firestoreService";
import { locationService } from "@/services/locationService";

type CurrentLocation = { latitude: number; longitude: number; accuracy?: number };

export const useLocation = (
  userId: string | undefined,
  groupId: string | null,
  sharingEnabled: boolean,
  region = "PH",
) => {
  const [permissionStatus, setPermissionStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [currentLocation, setCurrentLocation] = useState<CurrentLocation | null>(null);
  const [groupLocations, setGroupLocations] = useState<GroupLocation[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [route, setRoute] = useState<RouteSummary | null>(null);

  const persistLocation = useEffectEvent(async (next: CurrentLocation) => {
    setCurrentLocation(next);

    if (!userId || !groupId || !sharingEnabled) {
      return;
    }

    await firestoreService.upsertLocation({
      userId,
      groupId,
      latitude: next.latitude,
      longitude: next.longitude,
      accuracy: next.accuracy,
      sharingState: "live",
    });
  });

  useEffect(() => {
    firestoreService.listEvacuationCenters(region).then(setCenters).catch(() => setCenters([]));
  }, [region]);

  useEffect(() => {
    if (!groupId) {
      setGroupLocations([]);
      return;
    }

    return firestoreService.listenToLocations(groupId, setGroupLocations);
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
        persistLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy ?? undefined,
        });
        return locationService.watchPosition((next) =>
          persistLocation({
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
  }, [persistLocation]);

  const nearestCenter = useMemo(
    () => locationService.getNearestCenter(currentLocation, centers),
    [centers, currentLocation],
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

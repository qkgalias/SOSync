/** Purpose: Provide location permission, watch, and distance helpers for the app. */
import * as Location from "expo-location";

import type { EvacuationCenter } from "@/types";

const toRadians = (value: number) => (value * Math.PI) / 180;

export const locationService = {
  requestPermission() {
    return Location.requestForegroundPermissionsAsync();
  },

  async getCurrentPosition() {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") {
      throw new Error("Location permission is required to show the live disaster map.");
    }

    return Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
  },

  watchPosition(onUpdate: (location: Location.LocationObject) => void) {
    return Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15_000,
        distanceInterval: 50,
      },
      onUpdate,
    );
  },

  distanceBetween(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) {
    const earthRadius = 6_371_000;
    const deltaLat = toRadians(to.latitude - from.latitude);
    const deltaLng = toRadians(to.longitude - from.longitude);
    const lat1 = toRadians(from.latitude);
    const lat2 = toRadians(to.latitude);
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

    return 2 * earthRadius * Math.asin(Math.sqrt(a));
  },

  getNearestCenter(
    origin: { latitude: number; longitude: number } | null,
    centers: EvacuationCenter[],
  ) {
    if (!origin || !centers.length) {
      return null;
    }

    return centers.reduce((closest, candidate) => {
      if (!closest) {
        return candidate;
      }

      const currentDistance = locationService.distanceBetween(origin, candidate);
      const closestDistance = locationService.distanceBetween(origin, closest);
      return currentDistance < closestDistance ? candidate : closest;
    }, null as EvacuationCenter | null);
  },
};

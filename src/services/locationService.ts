/** Purpose: Provide location permission, watch, and distance helpers for the app. */
import * as Location from "expo-location";
import { Platform } from "react-native";

import type { EvacuationCenter } from "@/types";

const toRadians = (value: number) => (value * Math.PI) / 180;
const LAST_KNOWN_LOCATION_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const LAST_KNOWN_LOCATION_REQUIRED_ACCURACY_METERS = 500;
const WATCH_LOCATION_TIMEOUT_MS = 12_000;

const getFirstWatchedPosition = () =>
  new Promise<Location.LocationObject>((resolve, reject) => {
    let settled = false;
    let subscription: Location.LocationSubscription | null = null;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutId);
      subscription?.remove();
      callback();
    };

    const timeoutId = setTimeout(() => {
      finish(() => reject(new Error("Current location is unavailable. Make sure that location services are enabled.")));
    }, WATCH_LOCATION_TIMEOUT_MS);

    void Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 0,
        timeInterval: 1_000,
      },
      (nextLocation) => {
        finish(() => resolve(nextLocation));
      },
    )
      .then((nextSubscription) => {
        if (settled) {
          nextSubscription.remove();
          return;
        }

        subscription = nextSubscription;
      })
      .catch((error) => {
        finish(() => reject(error));
      });
  });

const buildReverseGeocodeLabels = (
  result: Location.LocationGeocodedAddress | null | undefined,
) => {
  if (!result) {
    return {
      addressLabel: null,
      localityLabel: null,
    };
  }

  const primaryLine = [result.streetNumber, result.street].filter(Boolean).join(" ").trim();
  const addressLabel = primaryLine ||
    [result.district, result.city, result.region].filter(Boolean).join(", ").trim() ||
    null;

  return {
    addressLabel,
    localityLabel: result.city?.trim() || result.district?.trim() || result.region?.trim() || null,
  };
};

export const locationService = {
  async requestPermission() {
    const currentPermission = await Location.getForegroundPermissionsAsync();
    if (currentPermission.status === "granted") {
      return currentPermission;
    }

    return Location.requestForegroundPermissionsAsync();
  },

  async reverseGeocodeDetails(coordinate: { latitude: number; longitude: number }) {
    const [result] = await Location.reverseGeocodeAsync(coordinate);
    return buildReverseGeocodeLabels(result);
  },

  async reverseGeocode(coordinate: { latitude: number; longitude: number }) {
    return (await locationService.reverseGeocodeDetails(coordinate)).addressLabel;
  },

  async reverseGeocodeLocality(coordinate: { latitude: number; longitude: number }) {
    return (await locationService.reverseGeocodeDetails(coordinate)).localityLabel;
  },

  async getCurrentPosition() {
    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.status === "granted"
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      throw new Error("Location permission is required to show the live disaster map.");
    }

    const lastKnownLocation = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_LOCATION_REQUIRED_ACCURACY_METERS,
    });

    if (lastKnownLocation) {
      return lastKnownLocation;
    }

    try {
      if (Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => undefined);
      }

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      try {
        return await getFirstWatchedPosition();
      } catch {
        // Fall through to the last-known retry below.
      }

      const fallbackLocation = await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_LOCATION_MAX_AGE_MS,
        requiredAccuracy: LAST_KNOWN_LOCATION_REQUIRED_ACCURACY_METERS,
      });

      if (fallbackLocation) {
        return fallbackLocation;
      }

      throw error;
    }
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

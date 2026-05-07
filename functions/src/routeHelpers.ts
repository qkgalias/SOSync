/** Purpose: Keep evacuation center filtering and route response normalization testable outside HTTP handlers. */
export type EvacuationTravelMode = "walk" | "two_wheeler" | "four_wheeler";

export type EvacuationCenterDoc = {
  address?: string;
  capacity?: number;
  centerId: string;
  city?: string;
  contact?: string;
  islandGroup?: string;
  latitude?: number;
  longitude?: number;
  name?: string;
  province?: string;
  region?: string;
  serviceRadiusKm?: number;
};

export type GoogleRoutesTravelMode = "DRIVE" | "TWO_WHEELER" | "WALK";

const EARTH_RADIUS_METERS = 6_371_000;
const DEFAULT_CENTER_RADIUS_KM = 35;
const MAX_CENTER_RADIUS_KM = 75;
const MAX_NEARBY_CENTERS = 8;

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceMetersBetween = (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) => {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

export const isValidCoordinatePair = (latitude?: number, longitude?: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude as number) <= 90 &&
  Math.abs(longitude as number) <= 180;

export const filterNearbyEvacuationCenters = (
  centers: EvacuationCenterDoc[],
  origin: { latitude: number; longitude: number },
) =>
  centers
    .filter((center) => isValidCoordinatePair(center.latitude, center.longitude))
    .map((center) => {
      const distanceMeters = distanceMetersBetween(origin, {
        latitude: center.latitude as number,
        longitude: center.longitude as number,
      });
      const serviceRadiusKm = Math.min(
        Math.max(Number(center.serviceRadiusKm ?? DEFAULT_CENTER_RADIUS_KM), 0),
        MAX_CENTER_RADIUS_KM,
      );

      return {
        ...center,
        distanceMeters: Math.round(distanceMeters),
        serviceRadiusKm,
      };
    })
    .filter((center) => center.distanceMeters <= center.serviceRadiusKm * 1000)
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .slice(0, MAX_NEARBY_CENTERS);

export const resolveNearbyEvacuationCenter = (
  centers: EvacuationCenterDoc[],
  input: {
    centerId: string;
    destination: { latitude: number; longitude: number };
    origin: { latitude: number; longitude: number };
  },
) => {
  const nearbyCenters = filterNearbyEvacuationCenters(centers, input.origin);
  const matchedCenter = nearbyCenters.find((center) => center.centerId === input.centerId);

  if (!matchedCenter) {
    return null;
  }

  const latitudeMatches = Math.abs((matchedCenter.latitude as number) - input.destination.latitude) <= 0.0001;
  const longitudeMatches = Math.abs((matchedCenter.longitude as number) - input.destination.longitude) <= 0.0001;

  return latitudeMatches && longitudeMatches ? matchedCenter : null;
};

export const mapTravelModeToGoogle = (travelMode: EvacuationTravelMode): GoogleRoutesTravelMode => {
  if (travelMode === "walk") {
    return "WALK";
  }

  if (travelMode === "two_wheeler") {
    return "TWO_WHEELER";
  }

  return "DRIVE";
};

export const coerceEvacuationTravelMode = (value: unknown): EvacuationTravelMode | null => {
  if (value === "walk" || value === "two_wheeler" || value === "four_wheeler") {
    return value;
  }

  return null;
};

const parseGoogleDurationSeconds = (value: unknown) => {
  const match = String(value ?? "").match(/^(\d+(?:\.\d+)?)s$/);
  return match ? Math.round(Number(match[1])) : 0;
};

export const normalizeGoogleRoute = (
  input: {
    centerId: string;
    googleRoute: any;
    travelMode: EvacuationTravelMode;
  },
) => {
  const leg = input.googleRoute?.legs?.[0] ?? null;
  const steps = Array.isArray(leg?.steps)
    ? leg.steps.map((step: any) => ({
        distanceMeters: Number(step.distanceMeters ?? 0),
        durationSeconds: parseGoogleDurationSeconds(step.staticDuration),
        encodedPolyline: String(step.polyline?.encodedPolyline ?? ""),
        instruction: String(step.navigationInstruction?.instructions ?? "").trim(),
      })).filter((step: { instruction: string }) => Boolean(step.instruction))
    : [];
  const encodedPolyline = String(input.googleRoute?.polyline?.encodedPolyline ?? "");

  return {
    distanceMeters: Number(input.googleRoute?.distanceMeters ?? leg?.distanceMeters ?? 0),
    durationSeconds: parseGoogleDurationSeconds(input.googleRoute?.duration ?? leg?.duration),
    encodedPolyline,
    hasGeometry: Boolean(encodedPolyline),
    steps,
    targetCenterId: input.centerId,
    travelMode: input.travelMode,
    warnings: Array.isArray(input.googleRoute?.warnings)
      ? input.googleRoute.warnings.map((warning: unknown) => String(warning)).filter(Boolean)
      : [],
  };
};

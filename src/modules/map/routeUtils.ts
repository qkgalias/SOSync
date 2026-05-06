/** Purpose: Decode route geometry and keep Home evacuation-route labels deterministic. */
import type { EvacuationTravelMode, MapCoordinate, RouteSummary } from "@/types";

export const evacuationTravelModeLabels: Record<EvacuationTravelMode, string> = {
  four_wheeler: "Four-wheel",
  two_wheeler: "Two-wheel",
  walk: "Walk",
};

export const evacuationTravelModeWarnings: Partial<Record<EvacuationTravelMode, string>> = {
  two_wheeler: "Two-wheel routes are in beta and may miss some local motorcycle access details.",
  walk: "Walking routes are in beta and may miss some sidewalks or pedestrian paths.",
};

export const toGoogleNavigationTravelMode = (
  travelMode: EvacuationTravelMode,
): import("@googlemaps/react-native-navigation-sdk").TravelMode => {
  let TravelMode:
    | typeof import("@googlemaps/react-native-navigation-sdk")["TravelMode"]
    | undefined;

  try {
    TravelMode = require("@googlemaps/react-native-navigation-sdk")?.TravelMode;
  } catch {
    TravelMode = undefined;
  }

  if (travelMode === "walk") {
    return (TravelMode?.WALKING ??
      "WALKING") as import("@googlemaps/react-native-navigation-sdk").TravelMode;
  }

  if (travelMode === "two_wheeler") {
    return (TravelMode?.TWO_WHEELER ??
      "TWO_WHEELER") as import("@googlemaps/react-native-navigation-sdk").TravelMode;
  }

  return (TravelMode?.DRIVING ?? "DRIVING") as import("@googlemaps/react-native-navigation-sdk").TravelMode;
};

export const decodeEncodedPolyline = (encodedPolyline?: string | null): MapCoordinate[] => {
  if (!encodedPolyline) {
    return [];
  }

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const coordinates: MapCoordinate[] = [];

  while (index < encodedPolyline.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedPolyline.length);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;
    result = 0;
    shift = 0;

    do {
      byte = encodedPolyline.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encodedPolyline.length);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;
    coordinates.push({
      latitude: latitude / 100000,
      longitude: longitude / 100000,
    });
  }

  return coordinates;
};

export const buildRouteCoordinates = (
  route: RouteSummary | null,
  origin: MapCoordinate | null,
  destination: MapCoordinate | null,
) => {
  if (!route || !destination) {
    return [];
  }

  const decodedCoordinates = decodeEncodedPolyline(route.encodedPolyline);
  if (decodedCoordinates.length) {
    return decodedCoordinates;
  }

  return origin ? [origin, destination] : [];
};

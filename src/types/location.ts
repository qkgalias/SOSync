/** Purpose: Location, route, and evacuation center contracts for mapping flows. */
export type SharingState = "live" | "paused" | "sos";
export type MemberPresenceStatus = "live" | "offline";
export type MapCoordinate = { latitude: number; longitude: number };
export type HomeMapAppearance = "light" | "dark";
export type EvacuationTravelMode = "walk" | "two_wheeler" | "four_wheeler";

export type GroupLocation = {
  locationId: string;
  userId: string;
  groupId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt: string;
  sharingState: SharingState;
};

export type EvacuationCenter = {
  centerId: string;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  contact: string;
  address: string;
  region: string;
  city?: string;
  province?: string;
  islandGroup?: string;
  serviceRadiusKm?: number;
  distanceMeters?: number;
};

export type RouteStep = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  instruction: string;
};

export type RouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  hasGeometry: boolean;
  steps: RouteStep[];
  targetCenterId: string;
  travelMode: EvacuationTravelMode;
  warnings: string[];
};

export type HomeMapMarker = {
  markerId: string;
  userId: string;
  displayName: string;
  role?: string;
  photoURL?: string;
  latitude: number;
  longitude: number;
  sharingState: SharingState;
  presenceStatus: MemberPresenceStatus;
  lastSeenAt?: string;
  lastSeenMinutes?: number;
  isCurrentUser: boolean;
  isPrimaryContact: boolean;
};

export type HomeMapFocusTarget =
  | { kind: "currentUser"; token: number }
  | { kind: "center"; centerId: string; token: number }
  | { kind: "marker"; markerId: string; token: number };

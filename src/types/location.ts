/** Purpose: Location, route, and evacuation center contracts for mapping flows. */
export type SharingState = "live" | "paused" | "sos";
export type MapCoordinate = { latitude: number; longitude: number };
export type HomeMapAppearance = "light" | "dark";

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
};

export type RouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  encodedPolyline: string;
  hasGeometry: boolean;
  targetCenterId: string;
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
  isCurrentUser: boolean;
  isPrimaryContact: boolean;
};

export type HomeMapFocusTarget =
  | { kind: "currentUser"; token: number }
  | { kind: "center"; centerId: string; token: number }
  | { kind: "marker"; markerId: string; token: number };

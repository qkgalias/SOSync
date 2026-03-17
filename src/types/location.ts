/** Purpose: Location, route, and evacuation center contracts for mapping flows. */
export type SharingState = "live" | "paused" | "sos";

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
  targetCenterId: string;
};

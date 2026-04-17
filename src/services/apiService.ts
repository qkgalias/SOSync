/** Purpose: Use axios for route and disaster-sync requests that must stay off-device. */
import axios from "axios";

import { requireFunctionsBaseUrl, resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { normalizeFloodRiskOverviewResponse } from "@/modules/map/floodOverviewAdapter";
import { buildMockFloodRiskOverview } from "@/modules/map/mockFloodRiskScenarios";
import type { DisasterAlert, FloodRiskOverview, RouteSummary } from "@/types";
import { firebaseAuth, hasFirebaseApp } from "@/services/firebase";

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());
const API_TIMEOUT_MS = 12_000;

const getAuthenticatedHeaders = async () => {
  const currentUser = firebaseAuth().currentUser;
  if (!currentUser) {
    throw new Error("Sign in before requesting backend data.");
  }

  const idToken = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
  };
};

export const apiService = {
  async getEvacuationRoute(input: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number; centerId: string };
  }) {
    if (getClientMode() === "demo") {
      const distanceMeters = 1850;
      return {
        distanceMeters,
        durationSeconds: 660,
        encodedPolyline: "",
        hasGeometry: false,
        targetCenterId: input.destination.centerId,
      } satisfies RouteSummary;
    }

    const headers = await getAuthenticatedHeaders();
    const response = await axios.post<{ route: RouteSummary }>(
      `${requireFunctionsBaseUrl()}/getEvacuationRoute`,
      input,
      {
        headers,
        timeout: API_TIMEOUT_MS,
      },
    );
    return response.data.route;
  },

  async syncDisasterAlerts(groupId: string) {
    if (getClientMode() === "demo") {
      return [] as DisasterAlert[];
    }

    const normalizedGroupId = groupId.trim();
    if (!normalizedGroupId) {
      throw new Error("groupId is required to sync alerts.");
    }

    const headers = await getAuthenticatedHeaders();
    const response = await axios.post<{ alerts: DisasterAlert[] }>(
      `${requireFunctionsBaseUrl()}/syncDisasterAlerts`,
      { groupId: normalizedGroupId },
      {
        headers,
        timeout: API_TIMEOUT_MS,
      },
    );
    return response.data.alerts;
  },

  async getFloodRiskOverview(input: { latitude: number; longitude: number }) {
    if (getClientMode() === "demo") {
      return buildMockFloodRiskOverview({
        latitude: input.latitude,
        longitude: input.longitude,
      }) satisfies FloodRiskOverview;
    }

    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Valid coordinates are required to fetch flood risk.");
    }

    const headers = await getAuthenticatedHeaders();
    const response = await axios.post<unknown>(
      `${requireFunctionsBaseUrl()}/getFloodRiskOverview`,
      { latitude, longitude },
      {
        headers,
        timeout: API_TIMEOUT_MS,
      },
    );
    return normalizeFloodRiskOverviewResponse(response.data);
  },
};

/** Purpose: Use axios for route and disaster-sync requests that must stay off-device. */
import axios from "axios";

import { requireFunctionsBaseUrl, resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import type { DisasterAlert, RouteSummary } from "@/types";
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
};

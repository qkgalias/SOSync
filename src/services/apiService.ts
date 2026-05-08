/** Purpose: Use axios for route and disaster-sync requests that must stay off-device. */
import axios from "axios";

import { requireFunctionsBaseUrl, resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { normalizeFloodRiskOverviewResponse } from "@/modules/map/floodOverviewAdapter";
import { buildMockFloodRiskOverview } from "@/modules/map/mockFloodRiskScenarios";
import type { DisasterAlert, EvacuationCenter, EvacuationTravelMode, FloodRiskOverview, RouteSummary } from "@/types";
import { firebaseAuth, hasFirebaseApp } from "@/services/firebase";
import { toFriendlyBackendErrorMessage } from "@/utils/backendErrors";

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());
const API_TIMEOUT_MS = 12_000;
const AUTH_SESSION_SETTLE_MS = 250;
const AUTH_SESSION_READY_ATTEMPTS = 10;

export class NavigationAuthorizationError extends Error {
  code: "invalid_center" | "rate_limited" | "unknown";
  retryAfterSeconds?: number;

  constructor(input: {
    code: "invalid_center" | "rate_limited" | "unknown";
    message: string;
    retryAfterSeconds?: number;
  }) {
    super(input.message);
    this.name = "NavigationAuthorizationError";
    this.code = input.code;
    this.retryAfterSeconds = input.retryAfterSeconds;
  }
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForAuthenticatedUser = async () => {
  const immediateUser = firebaseAuth().currentUser;
  if (immediateUser) {
    return immediateUser;
  }

  for (let attempt = 0; attempt < AUTH_SESSION_READY_ATTEMPTS; attempt += 1) {
    await wait(AUTH_SESSION_SETTLE_MS);

    const currentUser = firebaseAuth().currentUser;
    if (currentUser) {
      return currentUser;
    }
  }

  return null;
};

const getAuthenticatedHeaders = async () => {
  const currentUser = await waitForAuthenticatedUser();
  if (!currentUser) {
    throw new Error("Sign in before requesting backend data.");
  }

  const idToken = await currentUser.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
  };
};

export const apiService = {
  async authorizeEvacuationNavigationStart(input: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number; centerId: string };
    travelMode: EvacuationTravelMode;
  }) {
    if (getClientMode() === "demo") {
      return { allowed: true as const };
    }

    const headers = await getAuthenticatedHeaders();
    try {
      const response = await axios.post<{ allowed: true }>(
        `${requireFunctionsBaseUrl()}/authorizeEvacuationNavigationStart`,
        input,
        {
          headers,
          timeout: API_TIMEOUT_MS,
        },
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          throw new NavigationAuthorizationError({
            code: "invalid_center",
            message:
              typeof error.response.data?.error === "string"
                ? error.response.data.error
                : "That evacuation center is no longer nearby.",
          });
        }

        if (error.response?.status === 429) {
          throw new NavigationAuthorizationError({
            code: "rate_limited",
            message:
              typeof error.response.data?.error === "string"
                ? error.response.data.error
                : "Too many navigation attempts. Try again shortly.",
            retryAfterSeconds:
              typeof error.response.data?.retryAfterSeconds === "number"
                ? error.response.data.retryAfterSeconds
                : undefined,
          });
        }
      }

      throw new NavigationAuthorizationError({
        code: "unknown",
        message: "Navigation authorization failed. Please try again.",
      });
    }
  },

  async getEvacuationRoute(input: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number; centerId: string };
    travelMode: EvacuationTravelMode;
  }) {
    if (getClientMode() === "demo") {
      const distanceMeters = 1850;
      return {
        distanceMeters,
        durationSeconds: 660,
        encodedPolyline: "",
        hasGeometry: false,
        steps: [],
        targetCenterId: input.destination.centerId,
        travelMode: input.travelMode,
        warnings: [],
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

  async getNearbyEvacuationCenters(input: { latitude: number; longitude: number }) {
    if (getClientMode() === "demo") {
      const { EVACUATION_CENTER_SEED } = await import("@/utils/constants");
      const { locationService } = await import("@/services/locationService");

      return EVACUATION_CENTER_SEED
        .map((center) => ({
          ...center,
          distanceMeters: Math.round(locationService.distanceBetween(input, center)),
          serviceRadiusKm: Math.min(Math.max(center.serviceRadiusKm ?? 35, 0), 75),
        }))
        .filter((center) => (center.distanceMeters ?? Number.POSITIVE_INFINITY) <= (center.serviceRadiusKm ?? 35) * 1000)
        .sort((left, right) => (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0))
        .slice(0, 8);
    }

    const headers = await getAuthenticatedHeaders();
    try {
      const response = await axios.post<{ centers: EvacuationCenter[] }>(
        `${requireFunctionsBaseUrl()}/getNearbyEvacuationCenters`,
        { origin: input },
        {
          headers,
          timeout: API_TIMEOUT_MS,
        },
      );
      return response.data.centers;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error(
          "The live getNearbyEvacuationCenters function is missing. Deploy the backend with `npm run firebase:deploy:backend`.",
        );
      }

      throw error;
    }
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
    try {
      const response = await axios.post<unknown>(
        `${requireFunctionsBaseUrl()}/getFloodRiskOverview`,
        { latitude, longitude },
        {
          headers,
          timeout: API_TIMEOUT_MS,
        },
      );
      return normalizeFloodRiskOverviewResponse(response.data);
    } catch (error) {
      throw new Error(
        toFriendlyBackendErrorMessage(error, {
          authMessage: "Sign in again to check local conditions near you.",
          genericMessage: "We couldn't load flood information right now. Try again in a moment.",
          offlineMessage: "We couldn't load flood information because you're offline. Reconnect to the internet and try again.",
          rateLimitMessage: "You've refreshed flood outlook too often. Please wait a bit before trying again.",
          timeoutMessage: "Checking flood outlook took too long. Check your connection and try again.",
        }),
      );
    }
  },
};

/** Purpose: Use axios for route and disaster-sync requests that must stay off-device. */
import axios from "axios";

import { env } from "@/config/env";
import type { DisasterAlert, RouteSummary } from "@/types";

const functionsBaseUrl = `https://${env.functionsRegion}-${env.firebaseProjectId}.cloudfunctions.net`;

const client = axios.create({
  baseURL: functionsBaseUrl,
  timeout: 12_000,
});

export const apiService = {
  async getEvacuationRoute(input: {
    origin: { latitude: number; longitude: number };
    destination: { latitude: number; longitude: number; centerId: string };
  }) {
    if (env.firebaseProjectId === "demo-sosync") {
      const distanceMeters = 1850;
      return {
        distanceMeters,
        durationSeconds: 660,
        encodedPolyline: "",
        targetCenterId: input.destination.centerId,
      } satisfies RouteSummary;
    }

    const response = await client.post<{ route: RouteSummary }>("/getEvacuationRoute", input);
    return response.data.route;
  },

  async syncDisasterAlerts(groupId: string) {
    if (env.firebaseProjectId === "demo-sosync") {
      return [] as DisasterAlert[];
    }

    const response = await client.post<{ alerts: DisasterAlert[] }>("/syncDisasterAlerts", { groupId });
    return response.data.alerts;
  },
};

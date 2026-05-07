/** Purpose: Pull weather data, normalize it, and write group-scoped disaster alerts. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

import { adminDb } from "./admin.js";
import { functionsRegion, openMeteoForecastUrl } from "./config.js";
import { buildAlertId, nowIso, toAlertSeverity, toAlertType } from "./helpers.js";
import {
  ensurePostRequest,
  handleCorsPreflight,
  requireAuthenticatedRequest,
  sendJsonError,
  setCorsHeaders,
} from "./http.js";

type AlertLocationBasis = "group_locations" | "group_default" | "philippines_default";
type AlertLocation = {
  basis: AlertLocationBasis;
  confidence: "higher" | "medium" | "fallback";
  latitude: number;
  longitude: number;
};
type GroupDoc = {
  defaultLatitude?: number;
  defaultLongitude?: number;
  groupId: string;
  latitude?: number;
  longitude?: number;
  name: string;
  region: string;
};
type GroupLocationDoc = {
  latitude?: number;
  longitude?: number;
  sharingState?: string;
  updatedAt?: string;
};
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const PH_DEFAULT_LOCATION: AlertLocation = {
  basis: "philippines_default",
  confidence: "fallback",
  latitude: 14.5995,
  longitude: 120.9842,
};

const isValidCoordinatePair = (latitude?: number, longitude?: number) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  Math.abs(latitude as number) <= 90 &&
  Math.abs(longitude as number) <= 180;

const resolveGroupAlertLocation = async (group: GroupDoc): Promise<AlertLocation> => {
  const locationsSnapshot = await adminDb.collection("locations").where("groupId", "==", group.groupId).get();
  const locations = locationsSnapshot.docs
    .map((doc) => doc.data() as GroupLocationDoc)
    .filter((location) => location.sharingState !== "paused" && isValidCoordinatePair(location.latitude, location.longitude))
    .sort((left, right) => String(right.updatedAt ?? "").localeCompare(String(left.updatedAt ?? "")));

  if (locations.length) {
    const recentLocations = locations.slice(0, 5);
    const totals = recentLocations.reduce<{ latitude: number; longitude: number }>(
      (accumulator, location) => ({
        latitude: accumulator.latitude + (location.latitude as number),
        longitude: accumulator.longitude + (location.longitude as number),
      }),
      { latitude: 0, longitude: 0 },
    );

    return {
      basis: "group_locations",
      confidence: "higher",
      latitude: totals.latitude / recentLocations.length,
      longitude: totals.longitude / recentLocations.length,
    };
  }

  const groupLatitude = group.defaultLatitude ?? group.latitude;
  const groupLongitude = group.defaultLongitude ?? group.longitude;
  if (isValidCoordinatePair(groupLatitude, groupLongitude)) {
    return {
      basis: "group_default",
      confidence: "medium",
      latitude: groupLatitude as number,
      longitude: groupLongitude as number,
    };
  }

  return PH_DEFAULT_LOCATION;
};

const syncAlertsForGroups = async (groups: GroupDoc[]) => {
  const alertBatches = await Promise.all(
    groups.map(async (group) => {
      const alertLocation = await resolveGroupAlertLocation(group);
      const forecast = await axios.get(openMeteoForecastUrl, {
        params: {
          latitude: alertLocation.latitude,
          longitude: alertLocation.longitude,
          hourly: "precipitation_probability,precipitation",
          timezone: "Asia/Manila",
          forecast_days: 1,
        },
      });

      const rainfallSeries = forecast.data.hourly?.precipitation ?? [];
      const peakRainfall = Math.max(0, ...rainfallSeries);
      if (peakRainfall <= 4) {
        return [];
      }

      const createdAt = nowIso();
      const forecastTimes = forecast.data.hourly?.time ?? [];
      const forecastWindow =
        Array.isArray(forecastTimes) && forecastTimes.length
          ? `${forecastTimes[0]} to ${forecastTimes[forecastTimes.length - 1]}`
          : "next 24 hours";

      return [
        {
          alertId: buildAlertId(group.groupId, toAlertType(peakRainfall), createdAt),
          groupId: group.groupId,
          type: toAlertType(peakRainfall),
          severity: toAlertSeverity(peakRainfall),
          source: "open-meteo",
          sourceProvider: "open-meteo",
          title: peakRainfall >= 20 ? "Flood risk rising near your circle" : "Storm conditions expected near your circle",
          message:
            peakRainfall >= 20
              ? "Heavy rainfall is building near your circle. Use official local alerts and keep members reachable."
              : "Weather volatility is increasing near your circle. Keep notifications enabled and confirm your circle is up to date.",
          latitude: alertLocation.latitude,
          longitude: alertLocation.longitude,
          forecastWindow,
          generatedAt: createdAt,
          locationBasis: alertLocation.basis,
          locationConfidence: alertLocation.confidence,
          createdAt,
        },
      ];
    }),
  );

  const alerts = alertBatches.flat();
  if (!alerts.length) {
    return [];
  }

  const batch = adminDb.batch();
  alerts.forEach((alert) => {
    batch.set(adminDb.collection("alerts").doc(alert.alertId), alert, { merge: true });
  });
  await batch.commit();
  return alerts;
};

export const syncDisasterAlerts = onRequest(
  { region: functionsRegion },
  async (request, response) => {
    setCorsHeaders(response);

    if (handleCorsPreflight(request, response)) {
      return;
    }

    if (!ensurePostRequest(request, response)) {
      return;
    }

    const authContext = await requireAuthenticatedRequest(request, response, {
      authenticatedLimit: 10,
      routeKey: "syncDisasterAlerts",
      unauthenticatedLimit: 20,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!authContext) {
      return;
    }

    const body = typeof request.body === "object" && request.body ? request.body : {};
    const requestedGroupId = String((body as { groupId?: unknown }).groupId ?? "").trim();
    if (!requestedGroupId) {
      sendJsonError(response, 400, "groupId is required.");
      return;
    }

    const memberSnapshot = await adminDb.collection("groups").doc(requestedGroupId).collection("members").doc(authContext.userId).get();
    if (!memberSnapshot.exists) {
      sendJsonError(response, 403, "You are not a member of this trusted circle.");
      return;
    }

    const snapshot = await adminDb.collection("groups").where("__name__", "==", requestedGroupId).limit(1).get();
    if (snapshot.empty) {
      sendJsonError(response, 404, "Trusted circle not found.");
      return;
    }

    const groups = snapshot.docs.map((doc) => ({ groupId: doc.id, ...doc.data() }) as GroupDoc);
    const alerts = await syncAlertsForGroups(groups);
    response.json({ alerts });
  },
);

export const scheduledAlertSync = onSchedule(
  { region: functionsRegion, schedule: "every 30 minutes" },
  async () => {
    const groupsSnapshot = await adminDb.collection("groups").where("region", "==", "PH").get();
    const groups = groupsSnapshot.docs.map((doc) => ({ groupId: doc.id, ...doc.data() }) as GroupDoc);
    const alerts = await syncAlertsForGroups(groups);
    logger.info("Disaster sync completed", { alertCount: alerts.length });
  },
);

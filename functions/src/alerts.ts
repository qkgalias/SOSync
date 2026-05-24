/** Purpose: Pull weather data, normalize it, and write group-scoped disaster alerts. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

import { adminDb } from "./admin.js";
import { functionsRegion, openMeteoForecastUrl } from "./config.js";
import { buildActiveAlertId, extractOpenMeteoAlertMetrics, nowIso, toAlertSeverity, toAlertType } from "./helpers.js";
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
type AlertSeverity = "advisory" | "watch" | "warning" | "critical";
type AlertType = "flood" | "storm";
type GeneratedAlert = {
  alertId: string;
  areaLabel: string;
  createdAt: string;
  dedupeKey: string;
  forecastEnd?: string;
  forecastStart?: string;
  forecastWindow: string;
  generatedAt: string;
  groupId: string;
  lastEvaluatedAt: string;
  latitude: number;
  locationBasis: AlertLocationBasis;
  locationConfidence: AlertLocation["confidence"];
  longitude: number;
  message: string;
  peakRiskEnd?: string;
  peakRiskStart?: string;
  peakRainfallMm: number;
  rainChancePercent?: number;
  recommendedActions: string[];
  severity: AlertSeverity;
  source: "open-meteo";
  sourceProvider: "open-meteo";
  temperatureC?: number;
  title: string;
  type: AlertType;
  uvIndex?: number;
  windGustKph?: number;
  windSpeedKph?: number;
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

const withoutUndefined = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;

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

const getAreaLabel = (basis: AlertLocationBasis) => {
  switch (basis) {
    case "group_locations":
      return "Near shared circle locations";
    case "group_default":
      return "Near your circle's saved area";
    case "philippines_default":
      return "Philippines default monitoring area";
  }
};

const buildAlertCopy = (input: { peakRainfall: number; severity: AlertSeverity; type: AlertType }) => {
  if (input.type === "flood") {
    switch (input.severity) {
      case "critical":
        return {
          title: "Severe flood risk near your circle",
          message: "Very heavy rainfall is forecast near your circle. Check on members and follow official evacuation guidance.",
          recommendedActions: [
            "Confirm everyone in your circle is reachable.",
            "Prepare to move away from flood-prone roads and low-lying areas.",
            "Follow local government and emergency advisories.",
          ],
        };
      case "warning":
        return {
          title: "Flood risk rising near your circle",
          message: "Heavy rainfall is forecast near your circle. Keep members reachable and avoid flood-prone routes.",
          recommendedActions: [
            "Check on members who may need help moving.",
            "Avoid low-lying roads if rain intensifies.",
            "Keep phone batteries charged and notifications on.",
          ],
        };
      default:
        return {
          title: "Flood conditions possible near your circle",
          message: "Rainfall may increase flood risk near your circle. Stay aware and keep your trusted circle updated.",
          recommendedActions: [
            "Monitor local rainfall and official advisories.",
            "Review your safest route before conditions worsen.",
            "Keep your trusted circle contact details current.",
          ],
        };
    }
  }

  switch (input.severity) {
    case "watch":
      return {
        title: "Storm watch near your circle",
        message: "Rain and storm conditions may strengthen near your circle. Stay aware and keep members updated.",
        recommendedActions: [
          "Keep notifications on for your trusted circle.",
          "Confirm important contacts are reachable.",
          "Plan around possible heavy rain and slower travel.",
        ],
      };
    case "advisory":
    default:
      return {
        title: "Storm conditions expected near your circle",
        message: "Weather conditions may become unsettled near your circle. Stay aware and keep your circle up to date.",
        recommendedActions: [
          "Keep notifications on.",
          "Check that your circle details are current.",
          "Watch for official local weather updates.",
        ],
      };
  }
};

const syncAlertsForGroups = async (groups: GroupDoc[]) => {
  const alertBatches = await Promise.all(
    groups.map(async (group) => {
      const alertLocation = await resolveGroupAlertLocation(group);
      const forecast = await axios.get(openMeteoForecastUrl, {
        params: {
          latitude: alertLocation.latitude,
          longitude: alertLocation.longitude,
          current: "temperature_2m,wind_speed_10m,wind_gusts_10m",
          hourly: "precipitation_probability,precipitation,temperature_2m,wind_speed_10m,wind_gusts_10m,uv_index",
          timezone: "Asia/Manila",
          forecast_days: 1,
        },
      });

      const rainfallSeries = forecast.data.hourly?.precipitation ?? [];
      const peakRainfall = Math.max(0, ...rainfallSeries);
      if (peakRainfall <= 4) {
        return [];
      }
      const metrics = extractOpenMeteoAlertMetrics(forecast.data);

      const createdAt = nowIso();
      const forecastTimes = forecast.data.hourly?.time ?? [];
      const forecastStart = Array.isArray(forecastTimes) ? forecastTimes[0] : undefined;
      const forecastEnd = Array.isArray(forecastTimes) ? forecastTimes[forecastTimes.length - 1] : undefined;
      const forecastWindow =
        forecastStart && forecastEnd
          ? `${forecastStart} to ${forecastEnd}`
          : "next 24 hours";
      const type = toAlertType(peakRainfall) as AlertType;
      const severity = toAlertSeverity(peakRainfall);
      const alertId = buildActiveAlertId(group.groupId, type, severity, forecastStart ?? createdAt);
      const copy = buildAlertCopy({ peakRainfall, severity, type });

      return [
        {
          alertId,
          areaLabel: getAreaLabel(alertLocation.basis),
          dedupeKey: alertId,
          forecastEnd,
          forecastStart,
          groupId: group.groupId,
          type,
          severity,
          source: "open-meteo" as const,
          sourceProvider: "open-meteo" as const,
          title: copy.title,
          message: copy.message,
          latitude: alertLocation.latitude,
          longitude: alertLocation.longitude,
          forecastWindow,
          peakRiskEnd: metrics.peakRiskEnd,
          peakRiskStart: metrics.peakRiskStart,
          peakRainfallMm: Number(peakRainfall.toFixed(1)),
          rainChancePercent: metrics.rainChancePercent,
          temperatureC: metrics.temperatureC,
          uvIndex: metrics.uvIndex,
          windGustKph: metrics.windGustKph,
          windSpeedKph: metrics.windSpeedKph,
          recommendedActions: copy.recommendedActions,
          generatedAt: createdAt,
          lastEvaluatedAt: createdAt,
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
  const existingSnapshots = await Promise.all(alerts.map((alert) => adminDb.collection("alerts").doc(alert.alertId).get()));
  alerts.forEach((alert, index) => {
    const existingCreatedAt = existingSnapshots[index]?.data()?.createdAt;
    const nextAlert: GeneratedAlert = {
      ...alert,
      createdAt: typeof existingCreatedAt === "string" ? existingCreatedAt : alert.createdAt,
    };
    batch.set(adminDb.collection("alerts").doc(alert.alertId), withoutUndefined(nextAlert), { merge: true });
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

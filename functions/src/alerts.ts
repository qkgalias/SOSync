/** Purpose: Pull weather data, normalize it, and write group-scoped disaster alerts. */
import axios from "axios";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";

import { adminDb } from "./admin.js";
import { functionsRegion, googleFloodApiKey, openMeteoForecastUrl } from "./config.js";
import { buildAlertId, nowIso, toAlertSeverity, toAlertType } from "./helpers.js";

type GroupDoc = { groupId: string; name: string; region: string };

const syncAlertsForGroups = async (groups: GroupDoc[]) => {
  const forecast = await axios.get(openMeteoForecastUrl, {
    params: {
      latitude: 14.5995,
      longitude: 120.9842,
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
  const alerts = groups.map((group) => ({
    alertId: buildAlertId(group.groupId, toAlertType(peakRainfall), createdAt),
    groupId: group.groupId,
    type: toAlertType(peakRainfall),
    severity: toAlertSeverity(peakRainfall),
    source: googleFloodApiKey.value() ? "google-flood-forecasting" : "open-meteo",
    title: peakRainfall >= 20 ? "Flood risk rising near your circle" : "Storm conditions expected near your circle",
    message:
      peakRainfall >= 20
        ? "Heavy rainfall is building in the next forecast window. Review evacuation routes and keep members reachable."
        : "Weather volatility is increasing. Keep notifications enabled and confirm your circle is up to date.",
    latitude: 14.5995,
    longitude: 120.9842,
    createdAt,
  }));

  const batch = adminDb.batch();
  alerts.forEach((alert) => {
    batch.set(adminDb.collection("alerts").doc(alert.alertId), alert, { merge: true });
  });
  await batch.commit();
  return alerts;
};

export const syncDisasterAlerts = onRequest(
  { region: functionsRegion, secrets: [googleFloodApiKey] },
  async (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    const requestedGroupId = String(request.body?.groupId ?? "");
    const snapshot = requestedGroupId
      ? await adminDb.collection("groups").where("__name__", "==", requestedGroupId).get()
      : await adminDb.collection("groups").where("region", "==", "PH").get();

    const groups = snapshot.docs.map((doc) => ({ groupId: doc.id, ...doc.data() }) as GroupDoc);
    const alerts = await syncAlertsForGroups(groups);
    response.json({ alerts });
  },
);

export const scheduledAlertSync = onSchedule(
  { region: functionsRegion, schedule: "every 30 minutes", secrets: [googleFloodApiKey] },
  async () => {
    const groupsSnapshot = await adminDb.collection("groups").where("region", "==", "PH").get();
    const groups = groupsSnapshot.docs.map((doc) => ({ groupId: doc.id, ...doc.data() }) as GroupDoc);
    const alerts = await syncAlertsForGroups(groups);
    logger.info("Disaster sync completed", { alertCount: alerts.length });
  },
);

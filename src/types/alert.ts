/** Purpose: Disaster alert types shared by the map, notification, and alert modules. */
export type AlertType = "flood" | "storm" | "evacuation";
export type AlertSeverity = "advisory" | "watch" | "warning" | "critical";
export type AlertSource = "open-meteo" | "google-flood-forecasting" | "manual";

export type DisasterAlert = {
  alertId: string;
  groupId: string;
  type: AlertType;
  severity: AlertSeverity;
  source: AlertSource;
  sourceProvider?: string;
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  forecastWindow?: string;
  forecastStart?: string;
  forecastEnd?: string;
  peakRiskStart?: string;
  peakRiskEnd?: string;
  peakRainfallMm?: number;
  rainChancePercent?: number;
  temperatureC?: number;
  uvIndex?: number;
  windGustKph?: number;
  windSpeedKph?: number;
  recommendedActions?: string[];
  areaLabel?: string;
  dedupeKey?: string;
  lastEvaluatedAt?: string;
  generatedAt?: string;
  locationBasis?: "group_locations" | "group_default" | "philippines_default";
  locationConfidence?: "higher" | "medium" | "fallback";
  createdAt: string;
};

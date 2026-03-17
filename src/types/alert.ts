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
  title: string;
  message: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

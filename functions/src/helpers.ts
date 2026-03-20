/** Purpose: Reuse backend data shaping helpers across alert and notification functions. */
type AlertSeverity = "advisory" | "watch" | "warning" | "critical";

export const nowIso = () => new Date().toISOString();

export const toAlertSeverity = (rainfallMm: number): AlertSeverity => {
  if (rainfallMm >= 40) {
    return "critical";
  }
  if (rainfallMm >= 25) {
    return "warning";
  }
  if (rainfallMm >= 12) {
    return "watch";
  }
  return "advisory";
};

export const toAlertType = (rainfallMm: number) => (rainfallMm >= 20 ? "flood" : "storm");

export const buildAlertId = (groupId: string, type: string, createdAt: string) =>
  `${groupId}_${type}_${createdAt.slice(0, 13).replaceAll(":", "-")}`;

/** Purpose: Keep flood monitoring labels, icons, and hero copy readable in the Home flood sheet. */
import type { FloodLevel, FloodTrend } from "@/types";

export const resolveFloodGaugeDisplayLabel = (input: {
  distanceLabel: string;
  isPrimary: boolean;
  localityLabel?: string | null;
  river?: string;
  siteName?: string;
}) => {
  const siteName = input.siteName?.trim();
  if (siteName) {
    return siteName;
  }

  const river = input.river?.trim();
  if (river) {
    return river;
  }

  const localityLabel = input.localityLabel?.trim();
  if (localityLabel) {
    return input.isPrimary
      ? `Monitoring point near ${localityLabel}`
      : `Monitoring point near ${localityLabel} • ${input.distanceLabel}`;
  }

  return input.isPrimary
    ? "Closest monitoring point"
    : `Monitoring point ${input.distanceLabel} away`;
};

export const shouldRenderFloodHeroTitle = (input: {
  badgeLabel: string;
  title: string;
}) => {
  const normalizedBadgeLabel = input.badgeLabel.trim().toLowerCase();
  const normalizedTitle = input.title.trim().toLowerCase();

  if (!normalizedTitle) {
    return false;
  }

  return normalizedTitle !== normalizedBadgeLabel;
};

export const getFloodLevelIconName = (level: FloodLevel) => {
  switch (level) {
    case "EXTREME_DANGER":
      return "alert-octagram";
    case "DANGER":
      return "home-flood";
    case "WARNING":
      return "waves-arrow-up";
    case "CAUTION":
      return "alert-outline";
    case "LIMITED_DATA":
      return "chart-box-outline";
    default:
      return "shield-check-outline";
  }
};

export const getFloodTrendLabel = (trend: FloodTrend) => {
  switch (trend) {
    case "rising":
      return "Rising";
    case "falling":
      return "Falling";
    case "stable":
      return "Stable";
    default:
      return "Trend unavailable";
  }
};

export const getFloodTrendIconName = (trend: FloodTrend) => {
  switch (trend) {
    case "rising":
      return "arrow-top-right";
    case "falling":
      return "arrow-bottom-right";
    case "stable":
      return "arrow-right";
    default:
      return "help-circle-outline";
  }
};

export const formatFloodLowConfidenceNote = (input: {
  confidenceNote?: string;
  isPrimary?: boolean;
  verified: boolean;
}) => {
  if (input.verified) {
    return null;
  }

  const confidenceNote = input.confidenceNote?.trim();
  if (confidenceNote) {
    return confidenceNote;
  }

  return input.isPrimary
    ? "This is the best nearby reference we found, but confidence is lower than a quality-verified monitoring point."
    : "This nearby monitoring point has lower-confidence data.";
};

export const buildFloodRiskLadder = () => [
  {
    description: "Conditions are changing. Stay alert and check local updates.",
    key: "caution",
    title: "Caution",
  },
  {
    description: "Flood risk is increasing near this area. Prepare to move if needed.",
    key: "warning",
    title: "Warning",
  },
  {
    description: "Flood conditions may affect nearby roads or homes. Be ready to act quickly.",
    key: "danger",
    title: "Danger",
  },
  {
    description: "Severe flood conditions need urgent attention. Follow official instructions immediately.",
    key: "extreme-danger",
    title: "Extreme danger",
  },
];

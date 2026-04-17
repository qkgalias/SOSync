/** Purpose: Normalize legacy and current flood overview responses into one UI-safe contract. */
import { getFloodTrendLabel, resolveFloodGaugeDisplayLabel } from "@/modules/map/floodPresentation";
import type { FloodGaugeSummary, FloodLevel, FloodRiskOverview, FloodTrend } from "@/types";
import { formatTimestampLabel, toDistanceLabel } from "@/utils/helpers";

type LegacyFloodRiskSeverity = "advisory" | "critical" | "none" | "unknown" | "warning" | "watch";

type LegacyFloodGauge = {
  distanceMeters: number;
  gaugeId: string;
  gaugeValueUnit?: string;
  hasModel: boolean;
  latestForecastIssuedTime?: string;
  latestStatusIssuedTime?: string;
  qualityVerified: boolean;
  river?: string;
  siteName?: string;
  source?: string;
  summarySeverity: LegacyFloodRiskSeverity;
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  };
};

type LegacyFloodRiskWindow = {
  endTime: string;
  gaugeId: string;
  severity: LegacyFloodRiskSeverity;
  startTime: string;
  value: number;
};

type LegacyFloodTimelinePoint = {
  endTime: string;
  severity: LegacyFloodRiskSeverity;
  startTime: string;
  value?: number;
};

type LegacyFloodRiskOverview = {
  currentWeather: FloodRiskOverview["currentWeather"];
  location: {
    label?: string;
    latitude: number;
    localityLabel?: string;
    longitude: number;
  };
  nextRiskWindow: LegacyFloodRiskWindow | null;
  primaryGauge: LegacyFloodGauge | null;
  sevenDayFloodTimeline: LegacyFloodTimelinePoint[];
  severity: LegacyFloodRiskSeverity;
  state: "no_data" | "ok";
  summary: string;
  supportingGauges: LegacyFloodGauge[];
  updatedAt: string;
  weatherDaily: FloodRiskOverview["weatherDaily"];
  weatherHourly: FloodRiskOverview["weatherHourly"];
};

const formatForecastWindowLabel = (startTime?: string, endTime?: string) => {
  if (!startTime || !endTime) {
    return undefined;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return undefined;
  }

  const startLabel = startDate.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
  const endLabel = endDate.toLocaleString("en-US", {
    day: startDate.toDateString() === endDate.toDateString() ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: startDate.toDateString() === endDate.toDateString() ? undefined : "short",
  });

  return `Forecast window ${startLabel} to ${endLabel}`;
};

const mapLegacySeverityToFloodLevel = (severity?: LegacyFloodRiskSeverity): FloodLevel => {
  switch (severity) {
    case "critical":
      return "EXTREME_DANGER";
    case "warning":
      return "DANGER";
    case "watch":
      return "WARNING";
    case "advisory":
      return "CAUTION";
    case "none":
      return "SAFE";
    default:
      return "LIMITED_DATA";
  }
};

const normalizeGaugeUnit = (value?: string) => {
  switch (String(value ?? "").trim().toUpperCase()) {
    case "METERS":
      return "m";
    case "FEET":
      return "ft";
    case "CUBIC_METERS_PER_SECOND":
      return "m³/s";
    case "CUBIC_FEET_PER_SECOND":
      return "ft³/s";
    default: {
      const normalized = String(value ?? "").trim();
      return normalized ? normalized.toLowerCase().replaceAll("_", " ") : undefined;
    }
  }
};

const buildConfidenceNote = (gauge: LegacyFloodGauge) => {
  if (gauge.qualityVerified && gauge.thresholds) {
    return "Higher confidence from a quality-verified nearby modeled gauge.";
  }
  if (gauge.qualityVerified) {
    return "Quality-verified nearby gauge, but threshold details are limited.";
  }
  if (gauge.hasModel) {
    return "Useful nearby model, but confidence is lower because the gauge is not quality verified.";
  }

  return "Nearby monitoring exists, but the confidence in this result is limited.";
};

const deriveLegacyTrend = (input: {
  level: FloodLevel;
  nextRiskWindow: LegacyFloodRiskWindow | null;
  timeline: LegacyFloodTimelinePoint[];
}): FloodTrend => {
  const valuedEntries = input.timeline.filter((entry) => entry.value !== undefined);
  if (valuedEntries.length >= 2) {
    const firstValue = valuedEntries[0]?.value;
    const lastValue = valuedEntries[valuedEntries.length - 1]?.value;
    if (firstValue !== undefined && lastValue !== undefined) {
      if (lastValue > firstValue) {
        return "rising";
      }
      if (lastValue < firstValue) {
        return "falling";
      }
      return "stable";
    }
  }

  if (input.nextRiskWindow) {
    const nextLevel = mapLegacySeverityToFloodLevel(input.nextRiskWindow.severity);
    const ranking: FloodLevel[] = ["SAFE", "CAUTION", "WARNING", "DANGER", "EXTREME_DANGER", "LIMITED_DATA"];
    const currentIndex = ranking.indexOf(input.level);
    const nextIndex = ranking.indexOf(nextLevel);
    if (currentIndex >= 0 && nextIndex >= 0) {
      if (nextIndex > currentIndex) {
        return "rising";
      }
      if (nextIndex < currentIndex) {
        return "falling";
      }
      return "stable";
    }
  }

  return "unknown";
};

const buildSafetyMessage = (level: FloodLevel, state: LegacyFloodRiskOverview["state"]) => {
  if (state === "no_data") {
    return "Use official local alerts and rainfall warnings for decisions right now.";
  }

  switch (level) {
    case "EXTREME_DANGER":
      return "Move to safety immediately if you are in a flood-prone area and follow official instructions.";
    case "DANGER":
      return "Be ready to move quickly if local officials advise evacuation.";
    case "WARNING":
      return "Prepare essentials now and keep your safest route clear.";
    case "CAUTION":
      return "Keep an eye on local updates and be ready if conditions worsen.";
    case "SAFE":
      return "Stay aware of rainfall and official warnings, especially in low-lying areas.";
    default:
      return "Stay alert and treat official local warnings as your main source.";
  }
};

const buildHeroTitle = (level: FloodLevel, state: LegacyFloodRiskOverview["state"]) => {
  if (state === "no_data") {
    return "No local flood coverage yet";
  }

  switch (level) {
    case "EXTREME_DANGER":
      return "Extreme flood danger possible";
    case "DANGER":
      return "Dangerous flood conditions possible";
    case "WARNING":
      return "Flood risk is rising";
    case "CAUTION":
      return "Conditions are changing";
    case "SAFE":
      return "No elevated flood signal right now";
    default:
      return "Limited flood data";
  }
};

const buildLegacyGaugeSummary = (input: {
  gauge: LegacyFloodGauge;
  isPrimary: boolean;
  localityLabel?: string;
  trend: FloodTrend;
}): FloodGaugeSummary => {
  const lastUpdatedAt = input.gauge.latestForecastIssuedTime ?? input.gauge.latestStatusIssuedTime;
  const distanceLabel = toDistanceLabel(input.gauge.distanceMeters);

  return {
    confidenceNote: buildConfidenceNote(input.gauge),
    distanceLabel,
    distanceMeters: input.gauge.distanceMeters,
    gaugeId: input.gauge.gaugeId,
    hasModel: input.gauge.hasModel,
    label: resolveFloodGaugeDisplayLabel({
      distanceLabel,
      isPrimary: input.isPrimary,
      localityLabel: input.localityLabel,
      river: input.gauge.river,
      siteName: input.gauge.siteName,
    }),
    lastUpdatedAt,
    lastUpdatedLabel: lastUpdatedAt ? formatTimestampLabel(lastUpdatedAt) : "just now",
    level: mapLegacySeverityToFloodLevel(input.gauge.summarySeverity),
    referenceNote: input.isPrimary
      ? "This is the nearest available modeled reference for your location, not an exact street-level reading."
      : undefined,
    river: input.gauge.river,
    siteName: input.gauge.siteName,
    sourceLabel: input.gauge.source?.trim() || undefined,
    thresholds: input.gauge.thresholds
      ? {
          dangerLevel: input.gauge.thresholds.dangerLevel,
          extremeDangerLevel: input.gauge.thresholds.extremeDangerLevel,
          unit: normalizeGaugeUnit(input.gauge.gaugeValueUnit),
          warningLevel: input.gauge.thresholds.warningLevel,
        }
      : undefined,
    trend: input.trend,
    trendLabel: getFloodTrendLabel(input.trend),
    verified: input.gauge.qualityVerified,
  };
};

const isCurrentFloodRiskOverview = (value: unknown): value is FloodRiskOverview =>
  Boolean(
    value &&
      typeof value === "object" &&
      "flood" in value &&
      value.flood &&
      typeof value.flood === "object" &&
      "hero" in value.flood,
  );

const isLegacyFloodRiskOverview = (value: unknown): value is LegacyFloodRiskOverview =>
  Boolean(
    value &&
      typeof value === "object" &&
      "primaryGauge" in value &&
      "supportingGauges" in value &&
      "severity" in value &&
      "summary" in value,
  );

export const normalizeFloodRiskOverviewResponse = (value: unknown): FloodRiskOverview => {
  if (isCurrentFloodRiskOverview(value)) {
    return value;
  }

  if (!isLegacyFloodRiskOverview(value)) {
    throw new Error("Flood overview response is missing expected data.");
  }

  const level = value.state === "no_data" ? "LIMITED_DATA" : mapLegacySeverityToFloodLevel(value.severity);
  const trend = deriveLegacyTrend({
    level,
    nextRiskWindow: value.nextRiskWindow,
    timeline: value.sevenDayFloodTimeline,
  });
  const localityLabel = value.location.localityLabel?.trim() || value.location.label?.trim() || undefined;
  const primaryPoint = value.primaryGauge
    ? buildLegacyGaugeSummary({
        gauge: value.primaryGauge,
        isPrimary: true,
        localityLabel,
        trend,
      })
    : null;
  const nearbyPoints = (value.supportingGauges ?? [])
    .slice(0, 4)
    .map((gauge) =>
      buildLegacyGaugeSummary({
        gauge,
        isPrimary: false,
        localityLabel,
        trend: "unknown",
      }),
    );

  return {
    currentWeather: value.currentWeather,
    flood: {
      hero: {
        badgeLabel: level.replaceAll("_", " "),
        forecastWindowLabel: formatForecastWindowLabel(value.nextRiskWindow?.startTime, value.nextRiskWindow?.endTime),
        safetyMessage: buildSafetyMessage(level, value.state),
        summary: value.summary,
        title: buildHeroTitle(level, value.state),
        trend,
        trendLabel: getFloodTrendLabel(trend),
      },
      level,
      map: null,
      measurement: primaryPoint?.thresholds
        ? {
            dangerLevel: primaryPoint.thresholds.dangerLevel,
            explanation:
              "This nearby monitoring point uses modeled water-level thresholds to estimate when conditions move from caution to danger.",
            extremeDangerLevel: primaryPoint.thresholds.extremeDangerLevel,
            sourceNote: primaryPoint.sourceLabel
              ? `Threshold guidance from ${primaryPoint.sourceLabel} and Google flood models.`
              : "Threshold guidance from a nearby Google-modeled flood gauge.",
            unit: primaryPoint.thresholds.unit,
            warningLevel: primaryPoint.thresholds.warningLevel,
          }
        : null,
      nearbyPoints,
      primaryPoint,
      state: value.state === "no_data" ? "no_coverage" : level === "LIMITED_DATA" ? "limited_data" : "ready",
      updatedAt: value.updatedAt,
    },
    location: {
      label: value.location.label,
      latitude: value.location.latitude,
      localityLabel: value.location.localityLabel,
      longitude: value.location.longitude,
    },
    weatherDaily: value.weatherDaily,
    weatherHourly: value.weatherHourly,
  };
};

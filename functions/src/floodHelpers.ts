/** Purpose: Keep flood risk parsing, ranking, and payload shaping deterministic and reusable. */
type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type FloodRiskSeverity = "none" | "advisory" | "watch" | "warning" | "critical" | "unknown";
type FloodTrend = "falling" | "rising" | "stable" | "unknown";
type FloodLevel = "SAFE" | "CAUTION" | "WARNING" | "DANGER" | "EXTREME_DANGER" | "LIMITED_DATA";

type FloodGaugeApi = {
  countryCode?: string;
  gaugeId: string;
  hasModel?: boolean;
  location?: MapCoordinate;
  qualityVerified?: boolean;
  river?: string;
  siteName?: string;
  source?: string;
};

type FloodStatusApi = {
  forecastChange?: {
    valueChange?: {
      lowerBound?: number;
      upperBound?: number;
    };
  };
  forecastTimeRange?: { endTime?: string; startTime?: string };
  forecastTrend?: string;
  gaugeId: string;
  gaugeLocation?: MapCoordinate;
  inundationMapSet?: {
    inundationMaps?: Array<{
      level?: string;
      serializedPolygonId?: string;
    }>;
  };
  issuedTime?: string;
  qualityVerified?: boolean;
  serializedNotificationPolygonId?: string;
  severity?: string;
  source?: string;
};

type GaugeModelApi = {
  gaugeId: string;
  gaugeModelId?: string;
  gaugeValueUnit?: string;
  qualityVerified?: boolean;
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  };
};

type GaugeForecastApi = {
  forecastRanges?: Array<{
    forecastEndTime?: string;
    forecastStartTime?: string;
    value?: number;
  }>;
  gaugeId: string;
  issuedTime?: string;
};

export type FloodGaugeOverview = {
  countryCode?: string;
  distanceMeters: number;
  gaugeId: string;
  gaugeModelId?: string;
  gaugeValueUnit?: string;
  hasModel: boolean;
  latestForecastIssuedTime?: string;
  latestStatusIssuedTime?: string;
  location?: MapCoordinate;
  polygonRefs: Array<{
    kind: "inundation" | "notification";
    level?: string;
    polygonId: string;
  }>;
  qualityVerified: boolean;
  river?: string;
  siteName?: string;
  source?: string;
  statusForecastWindow?: {
    endTime?: string;
    startTime?: string;
  };
  statusSeverity: FloodRiskSeverity;
  summarySeverity: FloodRiskSeverity;
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  };
  trend: FloodTrend;
};

export type FloodRiskWindow = {
  endTime: string;
  gaugeId: string;
  severity: FloodRiskSeverity;
  startTime: string;
  value: number;
};

export type FloodPolygonOverlay = {
  kind: "inundation" | "notification";
  level?: FloodLevel;
  points: Array<{ latitude: number; longitude: number }>;
  polygonId: string;
};

const EARTH_RADIUS_METERS = 6_371_000;
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const SIMILAR_DISTANCE_METERS = 2_000;

export const TALISAY_CITY_CEBU_QA_COORDINATES = Object.freeze({
  latitude: 10.2447,
  longitude: 123.8494,
});

const toRadians = (value: number) => (value * Math.PI) / 180;

const toTimeMs = (value?: string) => {
  if (!value) {
    return Number.NEGATIVE_INFINITY;
  }

  const nextValue = new Date(value).getTime();
  return Number.isFinite(nextValue) ? nextValue : Number.NEGATIVE_INFINITY;
};

const formatRelativeTimeLabel = (value: string | undefined, now: Date) => {
  if (!value) {
    return "Just updated";
  }

  const issuedAt = new Date(value).getTime();
  if (!Number.isFinite(issuedAt)) {
    return "Just updated";
  }

  const deltaMs = issuedAt - now.getTime();
  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const deltaMinutes = Math.round(deltaMs / (60 * 1000));

  if (Math.abs(deltaMinutes) < 60) {
    return formatter.format(deltaMinutes, "minute");
  }

  const deltaHours = Math.round(deltaMs / (60 * 60 * 1000));
  if (Math.abs(deltaHours) < 24) {
    return formatter.format(deltaHours, "hour");
  }

  return formatter.format(Math.round(deltaMs / MS_IN_DAY), "day");
};

export const distanceMetersBetween = (from: MapCoordinate, to: MapCoordinate) => {
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
};

export const buildSquareLoop = (center: MapCoordinate, radiusKm: number) => {
  const latDelta = radiusKm / 111.32;
  const lngDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos(toRadians(center.latitude))));

  return {
    vertices: [
      { latitude: center.latitude - latDelta, longitude: center.longitude - lngDelta },
      { latitude: center.latitude - latDelta, longitude: center.longitude + lngDelta },
      { latitude: center.latitude + latDelta, longitude: center.longitude + lngDelta },
      { latitude: center.latitude + latDelta, longitude: center.longitude - lngDelta },
    ],
  };
};

export const severityRank = (value: FloodRiskSeverity) => {
  switch (value) {
    case "critical":
      return 5;
    case "warning":
      return 4;
    case "watch":
      return 3;
    case "advisory":
      return 2;
    case "unknown":
      return 1;
    default:
      return 0;
  }
};

export const maxSeverity = (values: FloodRiskSeverity[]) =>
  values.reduce<FloodRiskSeverity>((highest, current) =>
    severityRank(current) > severityRank(highest) ? current : highest, "none");

export const mapGoogleSeverityToFloodRiskSeverity = (value?: string): FloodRiskSeverity => {
  switch (String(value ?? "").trim()) {
    case "EXTREME":
      return "critical";
    case "SEVERE":
      return "warning";
    case "ABOVE_NORMAL":
      return "advisory";
    case "NO_FLOODING":
      return "none";
    case "UNKNOWN":
      return "unknown";
    default:
      return "unknown";
  }
};

export const mapSeverityToFloodLevel = (value: FloodRiskSeverity): FloodLevel => {
  switch (value) {
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

export const toFloodTrend = (value?: string): FloodTrend => {
  switch (String(value ?? "").trim()) {
    case "RISE":
      return "rising";
    case "FALL":
      return "falling";
    case "NO_CHANGE":
      return "stable";
    default:
      return "unknown";
  }
};

export const toForecastSeverity = (
  value: number | undefined,
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  },
): FloodRiskSeverity => {
  if (!Number.isFinite(value) || !thresholds) {
    return "unknown";
  }

  const safeValue = Number(value);
  if (Number.isFinite(thresholds.extremeDangerLevel) && safeValue >= Number(thresholds.extremeDangerLevel)) {
    return "critical";
  }
  if (Number.isFinite(thresholds.dangerLevel) && safeValue >= Number(thresholds.dangerLevel)) {
    return "warning";
  }
  if (Number.isFinite(thresholds.warningLevel) && safeValue >= Number(thresholds.warningLevel)) {
    return "watch";
  }

  return "none";
};

export const pickLatestForecast = (forecasts: GaugeForecastApi[] = []) =>
  [...forecasts]
    .filter((forecast) => forecast.issuedTime)
    .sort((left, right) => toTimeMs(right.issuedTime) - toTimeMs(left.issuedTime))[0] ?? null;

const deriveFloodTrendFromChange = (input?: {
  lowerBound?: number;
  upperBound?: number;
}): FloodTrend => {
  if (!input) {
    return "unknown";
  }

  const lowerBound = Number(input.lowerBound);
  const upperBound = Number(input.upperBound);
  if (Number.isFinite(lowerBound) && Number.isFinite(upperBound)) {
    if (lowerBound > 0 && upperBound > 0) {
      return "rising";
    }
    if (lowerBound < 0 && upperBound < 0) {
      return "falling";
    }
    if (lowerBound === 0 && upperBound === 0) {
      return "stable";
    }
  }

  return "unknown";
};

export const deriveFloodTrend = (input: {
  forecastRanges: FloodRiskWindow[];
  status?: FloodStatusApi;
}): FloodTrend => {
  const trendFromStatus = toFloodTrend(input.status?.forecastTrend);
  if (trendFromStatus !== "unknown") {
    return trendFromStatus;
  }

  const trendFromChange = deriveFloodTrendFromChange(input.status?.forecastChange?.valueChange);
  if (trendFromChange !== "unknown") {
    return trendFromChange;
  }

  const valuedRanges = input.forecastRanges.filter((range) => Number.isFinite(range.value));
  if (valuedRanges.length >= 2) {
    const firstValue = valuedRanges[0]?.value;
    const lastValue = valuedRanges[valuedRanges.length - 1]?.value;
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

  return "unknown";
};

export const buildTimelineByGauge = (input: {
  forecastsByGaugeId: Record<string, GaugeForecastApi | undefined>;
  modelsByGaugeId: Record<string, GaugeModelApi | undefined>;
  now: Date;
}) => {
  const sevenDaysFromNow = input.now.getTime() + (7 * MS_IN_DAY);
  const nextByGauge: Record<string, FloodRiskWindow[]> = {};

  Object.entries(input.forecastsByGaugeId).forEach(([gaugeId, forecast]) => {
    const thresholds = input.modelsByGaugeId[gaugeId]?.thresholds;
    const ranges = (forecast?.forecastRanges ?? [])
      .map((range) => {
        const startTime = String(range.forecastStartTime ?? "").trim();
        const endTime = String(range.forecastEndTime ?? "").trim();
        const value = Number(range.value);
        if (!startTime || !endTime || !Number.isFinite(value)) {
          return null;
        }

        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
          return null;
        }
        if (endMs < input.now.getTime() || startMs > sevenDaysFromNow) {
          return null;
        }

        return {
          endTime,
          gaugeId,
          severity: toForecastSeverity(value, thresholds),
          startTime,
          value,
        } satisfies FloodRiskWindow;
      })
      .filter((entry): entry is FloodRiskWindow => Boolean(entry))
      .sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());

    nextByGauge[gaugeId] = ranges;
  });

  return nextByGauge;
};

export const normalizeGaugeOverviews = (input: {
  gauges: FloodGaugeApi[];
  latestForecastsByGaugeId: Record<string, GaugeForecastApi | undefined>;
  location: MapCoordinate;
  modelsByGaugeId: Record<string, GaugeModelApi | undefined>;
  statusesByGaugeId: Record<string, FloodStatusApi | undefined>;
  timelineByGaugeId: Record<string, FloodRiskWindow[]>;
}) => {
  return input.gauges
    .map<FloodGaugeOverview>((gauge) => {
      const model = input.modelsByGaugeId[gauge.gaugeId];
      const status = input.statusesByGaugeId[gauge.gaugeId];
      const latestForecast = input.latestForecastsByGaugeId[gauge.gaugeId];
      const timeline = input.timelineByGaugeId[gauge.gaugeId] ?? [];
      const forecastSeverity = maxSeverity(timeline.map((entry) => entry.severity));
      const statusSeverity = mapGoogleSeverityToFloodRiskSeverity(status?.severity);
      const location = gauge.location ?? status?.gaugeLocation;
      const polygonRefs = [
        status?.serializedNotificationPolygonId
          ? {
              kind: "notification" as const,
              polygonId: status.serializedNotificationPolygonId,
            }
          : null,
        ...(status?.inundationMapSet?.inundationMaps ?? []).map((map) =>
          map.serializedPolygonId
            ? {
                kind: "inundation" as const,
                level: map.level,
                polygonId: map.serializedPolygonId,
              }
            : null,
        ),
      ].filter((value): value is NonNullable<typeof value> => Boolean(value));

      return {
        countryCode: gauge.countryCode,
        distanceMeters: location ? distanceMetersBetween(input.location, location) : Number.POSITIVE_INFINITY,
        gaugeId: gauge.gaugeId,
        gaugeModelId: model?.gaugeModelId,
        gaugeValueUnit: model?.gaugeValueUnit,
        hasModel: Boolean(gauge.hasModel ?? model),
        latestForecastIssuedTime: latestForecast?.issuedTime,
        latestStatusIssuedTime: status?.issuedTime,
        location,
        polygonRefs,
        qualityVerified: Boolean(model?.qualityVerified ?? status?.qualityVerified ?? gauge.qualityVerified),
        river: gauge.river,
        siteName: gauge.siteName,
        source: status?.source ?? gauge.source,
        statusForecastWindow: status?.forecastTimeRange
          ? {
              endTime: status.forecastTimeRange.endTime,
              startTime: status.forecastTimeRange.startTime,
            }
          : undefined,
        statusSeverity,
        summarySeverity: maxSeverity([forecastSeverity, statusSeverity]),
        thresholds: model?.thresholds,
        trend: deriveFloodTrend({ forecastRanges: timeline, status }),
      };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
};

export const rankGaugeCandidates = (left: FloodGaugeOverview, right: FloodGaugeOverview) => {
  const distanceDelta = left.distanceMeters - right.distanceMeters;
  if (Math.abs(distanceDelta) > SIMILAR_DISTANCE_METERS) {
    return distanceDelta;
  }

  if (left.qualityVerified !== right.qualityVerified) {
    return left.qualityVerified ? -1 : 1;
  }

  if (left.hasModel !== right.hasModel) {
    return left.hasModel ? -1 : 1;
  }

  const severityDelta = severityRank(right.summarySeverity) - severityRank(left.summarySeverity);
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const rightUpdatedAt = Math.max(toTimeMs(right.latestForecastIssuedTime), toTimeMs(right.latestStatusIssuedTime));
  const leftUpdatedAt = Math.max(toTimeMs(left.latestForecastIssuedTime), toTimeMs(left.latestStatusIssuedTime));
  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  return distanceDelta;
};

export const pickPrimaryGauge = (gauges: FloodGaugeOverview[]) =>
  [...gauges].sort(rankGaugeCandidates)[0] ?? null;

export const formatGaugeUnit = (value?: string) => {
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

export const buildFloodMeasurementExplanation = (input: {
  gaugeLabel: string;
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  };
  unit?: string;
}) => {
  if (!input.thresholds) {
    return "This nearby monitoring point does not include published flood thresholds right now.";
  }

  const unit = input.unit ? ` ${input.unit}` : "";
  const warningText = Number.isFinite(input.thresholds.warningLevel)
    ? `When the modeled water level approaches ${input.thresholds.warningLevel}${unit}, we move from safe conditions into caution or warning.`
    : "When the modeled water level starts moving above its normal range, we move from safe conditions into caution or warning.";
  const dangerText = Number.isFinite(input.thresholds.dangerLevel)
    ? `At about ${input.thresholds.dangerLevel}${unit}, conditions are treated as dangerous.`
    : "Higher modeled water levels are treated as dangerous.";
  const extremeText = Number.isFinite(input.thresholds.extremeDangerLevel)
    ? `Extreme danger starts around ${input.thresholds.extremeDangerLevel}${unit}.`
    : "";

  return [warningText, dangerText, extremeText].filter(Boolean).join(" ");
};

export const buildGaugeConfidenceNote = (input: {
  hasModel: boolean;
  thresholds?: {
    dangerLevel?: number;
    extremeDangerLevel?: number;
    warningLevel?: number;
  };
  verified: boolean;
}) => {
  if (input.verified && input.hasModel && input.thresholds) {
    return "Higher confidence from a quality-verified nearby modeled gauge.";
  }
  if (input.verified && input.hasModel) {
    return "Quality-verified nearby gauge, but threshold details are limited.";
  }
  if (input.hasModel) {
    return "Useful nearby model, but confidence is lower because the gauge is not quality verified.";
  }
  if (input.verified) {
    return "Verified nearby monitoring is available, but model guidance is limited.";
  }

  return "Nearby monitoring exists, but the confidence in this result is limited.";
};

const buildGaugeLabel = (input: {
  distanceMeters: number;
  isPrimary: boolean;
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

  if (input.isPrimary) {
    return "Closest monitoring point";
  }

  return `Monitoring point ${input.distanceMeters >= 1000
    ? `${(input.distanceMeters / 1000).toFixed(1)} km`
    : `${Math.round(input.distanceMeters)} m`} away`;
};

export const buildDistanceLabel = (distanceMeters: number) =>
  distanceMeters >= 1000
    ? `${(distanceMeters / 1000).toFixed(1)} km`
    : `${Math.round(distanceMeters)} m`;

export const buildTrendLabel = (trend: FloodTrend) => {
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

export const buildForecastWindowLabel = (input: {
  nextRiskWindow?: FloodRiskWindow | null;
  statusForecastWindow?: {
    endTime?: string;
    startTime?: string;
  };
}) => {
  const startTime = input.statusForecastWindow?.startTime ?? input.nextRiskWindow?.startTime;
  const endTime = input.statusForecastWindow?.endTime ?? input.nextRiskWindow?.endTime;
  if (!startTime || !endTime) {
    return undefined;
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime())) {
    return undefined;
  }

  const sameDay = startDate.toDateString() === endDate.toDateString();
  const startLabel = startDate.toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
  const endLabel = endDate.toLocaleString("en-US", {
    day: sameDay ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: sameDay ? undefined : "short",
  });

  return sameDay
    ? `Forecast window ${startLabel} to ${endLabel}`
    : `Forecast window ${startLabel} to ${endLabel}`;
};

const buildFloodLocationReference = (gauge: FloodGaugeOverview | null) =>
  gauge?.siteName?.trim() || gauge?.river?.trim() || "your area";

export const buildFloodHeroCopy = (input: {
  forecastWindowLabel?: string;
  level: FloodLevel;
  locationReference: string;
  state: "limited_data" | "no_coverage" | "ready";
  trend: FloodTrend;
}) => {
  if (input.state === "no_coverage") {
    return {
      badgeLabel: "NO COVERAGE",
      forecastWindowLabel: undefined,
      safetyMessage: "Use official local alerts and rainfall warnings for decisions right now.",
      summary: "We could not find a nearby Google flood model for this area yet.",
      title: "No local flood coverage yet",
      trend: "unknown" as const,
      trendLabel: "Coverage unavailable",
    };
  }

  if (input.state === "limited_data") {
    return {
      badgeLabel: "LIMITED DATA",
      forecastWindowLabel: input.forecastWindowLabel,
      safetyMessage: "Stay alert and treat official local warnings as your main source.",
      summary: `Nearby flood monitoring exists near ${input.locationReference}, but the current data is not strong enough for a clear flood rating.`,
      title: "Limited flood data",
      trend: input.trend,
      trendLabel: buildTrendLabel(input.trend),
    };
  }

  switch (input.level) {
    case "EXTREME_DANGER":
      return {
        badgeLabel: "EXTREME DANGER",
        forecastWindowLabel: input.forecastWindowLabel,
        safetyMessage: "Move to safety immediately if you are in a flood-prone area and follow official instructions.",
        summary: `Extreme flood danger is possible near ${input.locationReference}.`,
        title: "Extreme flood danger possible",
        trend: input.trend,
        trendLabel: buildTrendLabel(input.trend),
      };
    case "DANGER":
      return {
        badgeLabel: "DANGER",
        forecastWindowLabel: input.forecastWindowLabel,
        safetyMessage: "Be ready to move quickly if local officials advise evacuation.",
        summary: `Dangerous flood conditions are possible near ${input.locationReference}.`,
        title: "Dangerous flood conditions possible",
        trend: input.trend,
        trendLabel: buildTrendLabel(input.trend),
      };
    case "WARNING":
      return {
        badgeLabel: "WARNING",
        forecastWindowLabel: input.forecastWindowLabel,
        safetyMessage: "Prepare essentials now and keep your safest route clear.",
        summary: `Flood risk is rising near ${input.locationReference}.`,
        title: "Flood risk is rising",
        trend: input.trend,
        trendLabel: buildTrendLabel(input.trend),
      };
    case "CAUTION":
      return {
        badgeLabel: "CAUTION",
        forecastWindowLabel: input.forecastWindowLabel,
        safetyMessage: "Keep an eye on local updates and be ready if conditions worsen.",
        summary: `Conditions near ${input.locationReference} are changing.`,
        title: "Conditions are changing",
        trend: input.trend,
        trendLabel: buildTrendLabel(input.trend),
      };
    default:
      return {
        badgeLabel: "SAFE",
        forecastWindowLabel: input.forecastWindowLabel,
        safetyMessage: "Stay aware of rainfall and official warnings, especially in low-lying areas.",
        summary: `Nearby monitoring does not show an elevated flood signal near ${input.locationReference} right now.`,
        title: "No elevated flood signal right now",
        trend: input.trend,
        trendLabel: buildTrendLabel(input.trend),
      };
  }
};

export const buildPrimaryGaugeSummary = (input: {
  gauge: FloodGaugeOverview;
  now: Date;
}) => {
  const lastUpdatedAt = input.gauge.latestForecastIssuedTime ?? input.gauge.latestStatusIssuedTime;
  const unit = formatGaugeUnit(input.gauge.gaugeValueUnit);

  return {
    confidenceNote: buildGaugeConfidenceNote({
      hasModel: input.gauge.hasModel,
      thresholds: input.gauge.thresholds,
      verified: input.gauge.qualityVerified,
    }),
    distanceLabel: buildDistanceLabel(input.gauge.distanceMeters),
    distanceMeters: input.gauge.distanceMeters,
    gaugeId: input.gauge.gaugeId,
    hasModel: input.gauge.hasModel,
    label: buildGaugeLabel({
      distanceMeters: input.gauge.distanceMeters,
      isPrimary: true,
      river: input.gauge.river,
      siteName: input.gauge.siteName,
    }),
    lastUpdatedAt,
    lastUpdatedLabel: formatRelativeTimeLabel(lastUpdatedAt, input.now),
    latitude: input.gauge.location?.latitude,
    level: mapSeverityToFloodLevel(input.gauge.summarySeverity),
    longitude: input.gauge.location?.longitude,
    referenceNote: "This is the nearest available modeled reference for your location, not an exact street-level reading.",
    river: input.gauge.river,
    siteName: input.gauge.siteName,
    sourceLabel: input.gauge.source?.trim() || undefined,
    thresholds: input.gauge.thresholds
      ? {
          dangerLevel: input.gauge.thresholds.dangerLevel,
          extremeDangerLevel: input.gauge.thresholds.extremeDangerLevel,
          unit,
          warningLevel: input.gauge.thresholds.warningLevel,
        }
      : undefined,
    trend: input.gauge.trend,
    trendLabel: buildTrendLabel(input.gauge.trend),
    verified: input.gauge.qualityVerified,
  };
};

export const buildNearbyGaugeSummary = (input: {
  gauge: FloodGaugeOverview;
  now: Date;
}) => {
  const lastUpdatedAt = input.gauge.latestForecastIssuedTime ?? input.gauge.latestStatusIssuedTime;
  const unit = formatGaugeUnit(input.gauge.gaugeValueUnit);

  return {
    confidenceNote: buildGaugeConfidenceNote({
      hasModel: input.gauge.hasModel,
      thresholds: input.gauge.thresholds,
      verified: input.gauge.qualityVerified,
    }),
    distanceLabel: buildDistanceLabel(input.gauge.distanceMeters),
    distanceMeters: input.gauge.distanceMeters,
    gaugeId: input.gauge.gaugeId,
    hasModel: input.gauge.hasModel,
    label: buildGaugeLabel({
      distanceMeters: input.gauge.distanceMeters,
      isPrimary: false,
      river: input.gauge.river,
      siteName: input.gauge.siteName,
    }),
    lastUpdatedAt,
    lastUpdatedLabel: formatRelativeTimeLabel(lastUpdatedAt, input.now),
    latitude: input.gauge.location?.latitude,
    level: mapSeverityToFloodLevel(input.gauge.summarySeverity),
    longitude: input.gauge.location?.longitude,
    river: input.gauge.river,
    siteName: input.gauge.siteName,
    sourceLabel: input.gauge.source?.trim() || undefined,
    thresholds: input.gauge.thresholds
      ? {
          dangerLevel: input.gauge.thresholds.dangerLevel,
          extremeDangerLevel: input.gauge.thresholds.extremeDangerLevel,
          unit,
          warningLevel: input.gauge.thresholds.warningLevel,
        }
      : undefined,
    trend: input.gauge.trend,
    trendLabel: buildTrendLabel(input.gauge.trend),
    verified: input.gauge.qualityVerified,
  };
};

export const buildMeasurementOverview = (input: {
  gauge: FloodGaugeOverview;
}) => {
  const unit = formatGaugeUnit(input.gauge.gaugeValueUnit);
  if (!input.gauge.thresholds) {
    return null;
  }

  return {
    dangerLevel: input.gauge.thresholds.dangerLevel,
    explanation: buildFloodMeasurementExplanation({
      gaugeLabel: buildFloodLocationReference(input.gauge),
      thresholds: input.gauge.thresholds,
      unit,
    }),
    extremeDangerLevel: input.gauge.thresholds.extremeDangerLevel,
    sourceNote: input.gauge.source?.trim()
      ? `Threshold guidance from ${input.gauge.source.trim()} and Google flood models.`
      : "Threshold guidance from a nearby Google-modeled flood gauge.",
    unit,
    warningLevel: input.gauge.thresholds.warningLevel,
  };
};

export const parseKmlPolygonPoints = (kml?: string) => {
  if (!kml) {
    return [] as Array<{ latitude: number; longitude: number }>;
  }

  const coordinateBlocks = [...kml.matchAll(/<coordinates>([\s\S]*?)<\/coordinates>/gi)];
  for (const [, rawCoordinates] of coordinateBlocks) {
    const points = rawCoordinates
      .trim()
      .split(/\s+/)
      .map((entry) => {
        const [longitude, latitude] = entry.split(",").map((value) => Number(value));
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        return { latitude, longitude };
      })
      .filter((value): value is { latitude: number; longitude: number } => Boolean(value));

    if (points.length >= 3) {
      return points;
    }
  }

  return [] as Array<{ latitude: number; longitude: number }>;
};

export const normalizePolygonOverlays = (input: {
  currentLevel: FloodLevel;
  polygonKmlById: Record<string, string | undefined>;
  polygonRefs: Array<{
    kind: "inundation" | "notification";
    level?: string;
    polygonId: string;
  }>;
}) =>
  input.polygonRefs
    .map<FloodPolygonOverlay | null>((polygonRef) => {
      const points = parseKmlPolygonPoints(input.polygonKmlById[polygonRef.polygonId]);
      if (points.length < 3) {
        return null;
      }

      return {
        kind: polygonRef.kind,
        level: polygonRef.kind === "notification" ? input.currentLevel : undefined,
        points,
        polygonId: polygonRef.polygonId,
      };
    })
    .filter((polygon): polygon is FloodPolygonOverlay => Boolean(polygon));

export const buildSevenDayTimeline = (input: {
  primaryGaugeId?: string;
  timelineByGaugeId: Record<string, FloodRiskWindow[]>;
  now: Date;
}) => {
  if (!input.primaryGaugeId) {
    return [] as Array<{
      dayLabel: string;
      endTime: string;
      gaugeId?: string;
      severity: FloodRiskSeverity;
      startTime: string;
      value?: number;
    }>;
  }

  const primaryTimeline = input.timelineByGaugeId[input.primaryGaugeId] ?? [];
  if (!primaryTimeline.length) {
    return [] as Array<{
      dayLabel: string;
      endTime: string;
      gaugeId?: string;
      severity: FloodRiskSeverity;
      startTime: string;
      value?: number;
    }>;
  }

  const points: Array<{
    dayLabel: string;
    endTime: string;
    gaugeId?: string;
    severity: FloodRiskSeverity;
    startTime: string;
    value?: number;
  }> = [];
  for (let index = 0; index < 7; index += 1) {
    const dayStart = new Date(input.now.getTime() + (index * MS_IN_DAY));
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + MS_IN_DAY);

    const entries = primaryTimeline.filter((entry) => {
      const startMs = new Date(entry.startTime).getTime();
      const endMs = new Date(entry.endTime).getTime();
      return endMs >= dayStart.getTime() && startMs < dayEnd.getTime();
    });

    if (!entries.length) {
      points.push({
        dayLabel: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
        endTime: dayEnd.toISOString(),
        gaugeId: input.primaryGaugeId,
        severity: "none" as const,
        startTime: dayStart.toISOString(),
      });
      continue;
    }

    const highest = [...entries].sort((left, right) => severityRank(right.severity) - severityRank(left.severity))[0];
    points.push({
      dayLabel: dayStart.toLocaleDateString("en-US", { month: "short", day: "numeric", weekday: "short" }),
      endTime: highest.endTime,
      gaugeId: highest.gaugeId,
      severity: highest.severity,
      startTime: highest.startTime,
      value: highest.value,
    });
  }

  return points;
};

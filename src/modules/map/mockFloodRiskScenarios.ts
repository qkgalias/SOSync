/** Purpose: Provide stable flood-risk demo fixtures for Home flood-sheet development and tests. */
import type { FloodGaugeSummary, FloodLevel, FloodOverview, FloodRiskOverview, FloodTrend } from "@/types";

type FloodScenarioName =
  | "cautionRising"
  | "dangerFalling"
  | "extremeDanger"
  | "limitedData"
  | "noCoverage"
  | "polygonEnabled"
  | "safeStable"
  | "warningRising";

const now = new Date();

const buildGaugeSummary = (input: {
  confidenceNote: string;
  distanceMeters: number;
  gaugeId: string;
  label: string;
  level: FloodLevel;
  trend: FloodTrend;
  verified: boolean;
}) =>
  ({
    confidenceNote: input.confidenceNote,
    distanceLabel: input.distanceMeters >= 1000 ? `${(input.distanceMeters / 1000).toFixed(1)} km` : `${input.distanceMeters} m`,
    distanceMeters: input.distanceMeters,
    gaugeId: input.gaugeId,
    hasModel: true,
    label: input.label,
    lastUpdatedAt: now.toISOString(),
    lastUpdatedLabel: "just now",
    level: input.level,
    referenceNote: "This is the nearest available modeled reference for your location, not an exact street-level reading.",
    sourceLabel: "Google Flood Forecasting",
    thresholds: {
      dangerLevel: 4.2,
      extremeDangerLevel: 5.1,
      unit: "m",
      warningLevel: 3.3,
    },
    trend: input.trend,
    trendLabel:
      input.trend === "rising" ? "Rising" : input.trend === "falling" ? "Falling" : input.trend === "stable" ? "Stable" : "Trend unavailable",
    verified: input.verified,
  }) satisfies FloodGaugeSummary;

const buildFloodOverview = (input: Partial<FloodOverview> & Pick<FloodOverview, "hero" | "level" | "state">) =>
  ({
    hero: input.hero,
    level: input.level,
    map: input.map ?? null,
    measurement: input.measurement ?? null,
    nearbyPoints: input.nearbyPoints ?? [],
    primaryPoint: input.primaryPoint ?? null,
    state: input.state,
    updatedAt: now.toISOString(),
  }) satisfies FloodOverview;

const baseLocation = {
  label: "Quezon City",
  latitude: 14.676,
  localityLabel: "Quezon City",
  longitude: 121.0437,
};

export const FLOOD_RISK_SCENARIOS: Record<FloodScenarioName, FloodRiskOverview> = {
  safeStable: {
    currentWeather: {
      feelsLikeC: 33,
      temperatureC: 30,
      time: now.toISOString(),
      weatherCode: 2,
    },
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "SAFE",
        forecastWindowLabel: "Forecast window Apr 10, 5:00 PM to 11:00 PM",
        safetyMessage: "Stay aware of rainfall and official warnings, especially in low-lying areas.",
        summary: "Nearby monitoring does not show an elevated flood signal near your area right now.",
        title: "No elevated flood signal right now",
        trend: "stable",
        trendLabel: "Stable",
      },
      level: "SAFE",
      map: {
        gauges: [
          {
            gaugeId: "gauge-safe-primary",
            isPrimary: true,
            label: "La Mesa River",
            latitude: 14.688,
            level: "SAFE",
            longitude: 121.073,
          },
        ],
        hasRenderableData: true,
        polygons: [],
        userLocation: {
          latitude: baseLocation.latitude,
          longitude: baseLocation.longitude,
        },
      },
      measurement: {
        dangerLevel: 4.2,
        explanation:
          "When the modeled water level approaches 3.3 m, we move from safe conditions into caution or warning. At about 4.2 m, conditions are treated as dangerous. Extreme danger starts around 5.1 m.",
        extremeDangerLevel: 5.1,
        sourceNote: "Threshold guidance from a nearby Google-modeled flood gauge.",
        unit: "m",
        warningLevel: 3.3,
      },
      nearbyPoints: [
        buildGaugeSummary({
          confidenceNote: "Quality-verified nearby gauge with stable conditions.",
          distanceMeters: 1800,
          gaugeId: "gauge-safe-alt",
          label: "Marikina River",
          level: "SAFE",
          trend: "stable",
          verified: true,
        }),
      ],
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 8600,
        gaugeId: "gauge-safe-primary",
        label: "La Mesa River",
        level: "SAFE",
        trend: "stable",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  cautionRising: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "CAUTION",
        safetyMessage: "Keep an eye on local updates and be ready if conditions worsen.",
        summary: "Conditions near your area are changing.",
        title: "Conditions are changing",
        trend: "rising",
        trendLabel: "Rising",
      },
      level: "CAUTION",
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 2200,
        gaugeId: "gauge-caution-primary",
        label: "Monitoring point near Quezon City",
        level: "CAUTION",
        trend: "rising",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  warningRising: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "WARNING",
        safetyMessage: "Prepare essentials now and keep your safest route clear.",
        summary: "Flood risk is rising near your area.",
        title: "Flood risk is rising",
        trend: "rising",
        trendLabel: "Rising",
      },
      level: "WARNING",
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 1900,
        gaugeId: "gauge-warning-primary",
        label: "Monitoring point near Quezon City",
        level: "WARNING",
        trend: "rising",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  dangerFalling: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "DANGER",
        safetyMessage: "Be ready to move quickly if local officials advise evacuation.",
        summary: "Dangerous flood conditions are possible near your area.",
        title: "Dangerous flood conditions possible",
        trend: "falling",
        trendLabel: "Falling",
      },
      level: "DANGER",
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 1600,
        gaugeId: "gauge-danger-primary",
        label: "Marikina River",
        level: "DANGER",
        trend: "falling",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  extremeDanger: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "EXTREME DANGER",
        safetyMessage: "Move to safety immediately if you are in a flood-prone area and follow official instructions.",
        summary: "Extreme flood danger is possible near your area.",
        title: "Extreme flood danger possible",
        trend: "rising",
        trendLabel: "Rising",
      },
      level: "EXTREME_DANGER",
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 900,
        gaugeId: "gauge-extreme-primary",
        label: "Pasig River",
        level: "EXTREME_DANGER",
        trend: "rising",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  limitedData: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "LIMITED DATA",
        safetyMessage: "Stay alert and treat official local warnings as your main source.",
        summary: "Nearby flood monitoring exists near your area, but the current data is not strong enough for a clear flood rating.",
        title: "Limited flood data",
        trend: "unknown",
        trendLabel: "Trend unavailable",
      },
      level: "LIMITED_DATA",
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Nearby monitoring exists, but the confidence in this result is limited.",
        distanceMeters: 2400,
        gaugeId: "gauge-limited-primary",
        label: "Closest monitoring point",
        level: "LIMITED_DATA",
        trend: "unknown",
        verified: false,
      }),
      state: "limited_data",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  noCoverage: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "NO COVERAGE",
        safetyMessage: "Use official local alerts and rainfall warnings for decisions right now.",
        summary: "We could not find a nearby Google flood model for this area yet.",
        title: "No local flood coverage yet",
        trend: "unknown",
        trendLabel: "Coverage unavailable",
      },
      level: "LIMITED_DATA",
      state: "no_coverage",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
  polygonEnabled: {
    currentWeather: null,
    flood: buildFloodOverview({
      hero: {
        badgeLabel: "WARNING",
        forecastWindowLabel: "Forecast window Apr 10, 6:00 PM to Apr 11, 6:00 AM",
        safetyMessage: "Prepare essentials now and keep your safest route clear.",
        summary: "Flood risk is rising near your area.",
        title: "Flood risk is rising",
        trend: "rising",
        trendLabel: "Rising",
      },
      level: "WARNING",
      map: {
        gauges: [
          {
            gaugeId: "gauge-polygon-primary",
            isPrimary: true,
            label: "Marikina River",
            latitude: 14.67,
            level: "WARNING",
            longitude: 121.08,
          },
        ],
        hasRenderableData: true,
        polygons: [
          {
            kind: "notification",
            level: "WARNING",
            points: [
              { latitude: 14.668, longitude: 121.05 },
              { latitude: 14.682, longitude: 121.05 },
              { latitude: 14.682, longitude: 121.082 },
              { latitude: 14.668, longitude: 121.082 },
            ],
            polygonId: "polygon-warning",
          },
        ],
        userLocation: {
          latitude: baseLocation.latitude,
          longitude: baseLocation.longitude,
        },
      },
      primaryPoint: buildGaugeSummary({
        confidenceNote: "Higher confidence from a quality-verified nearby modeled gauge.",
        distanceMeters: 1400,
        gaugeId: "gauge-polygon-primary",
        label: "Marikina River",
        level: "WARNING",
        trend: "rising",
        verified: true,
      }),
      state: "ready",
    }),
    location: baseLocation,
    weatherDaily: [],
    weatherHourly: [],
  },
};

export const buildMockFloodRiskOverview = (
  input: {
    latitude: number;
    longitude: number;
    scenario?: FloodScenarioName;
  },
) => {
  const scenario = FLOOD_RISK_SCENARIOS[input.scenario ?? "safeStable"];
  return {
    ...scenario,
    location: {
      ...scenario.location,
      latitude: input.latitude,
      longitude: input.longitude,
    },
  } satisfies FloodRiskOverview;
};

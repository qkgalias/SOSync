/** Purpose: Personal flood-risk and weather forecast contracts for the Home outlook sheets. */
export type FloodLevel =
  | "SAFE"
  | "CAUTION"
  | "WARNING"
  | "DANGER"
  | "EXTREME_DANGER"
  | "LIMITED_DATA";

export type FloodTrend = "rising" | "falling" | "stable" | "unknown";

export type FloodThresholds = {
  dangerLevel?: number;
  extremeDangerLevel?: number;
  unit?: string;
  warningLevel?: number;
};

export type FloodGaugeSummary = {
  confidenceNote: string;
  distanceLabel: string;
  distanceMeters: number;
  gaugeId: string;
  hasModel: boolean;
  latitude?: number;
  label: string;
  lastUpdatedAt?: string;
  lastUpdatedLabel: string;
  level: FloodLevel;
  longitude?: number;
  referenceNote?: string;
  river?: string;
  siteName?: string;
  sourceLabel?: string;
  thresholds?: FloodThresholds;
  trend: FloodTrend;
  trendLabel: string;
  verified: boolean;
};

export type FloodPolygonOverlay = {
  kind: "inundation" | "notification";
  level?: FloodLevel;
  points: Array<{ latitude: number; longitude: number }>;
  polygonId: string;
};

export type FloodMapMarker = {
  gaugeId: string;
  isPrimary: boolean;
  label: string;
  latitude: number;
  level: FloodLevel;
  longitude: number;
};

export type FloodMeasurementOverview = {
  dangerLevel?: number;
  explanation: string;
  extremeDangerLevel?: number;
  sourceNote: string;
  unit?: string;
  warningLevel?: number;
};

export type FloodHeroOverview = {
  badgeLabel: string;
  forecastWindowLabel?: string;
  safetyMessage: string;
  summary: string;
  title: string;
  trend: FloodTrend;
  trendLabel: string;
};

export type FloodOverview = {
  hero: FloodHeroOverview;
  level: FloodLevel;
  map: {
    gauges: FloodMapMarker[];
    hasRenderableData: boolean;
    polygons: FloodPolygonOverlay[];
    userLocation: { latitude: number; longitude: number };
  } | null;
  measurement: FloodMeasurementOverview | null;
  nearbyPoints: FloodGaugeSummary[];
  primaryPoint: FloodGaugeSummary | null;
  state: "limited_data" | "no_coverage" | "ready";
  updatedAt: string;
};

export type FloodWeatherDay = {
  date: string;
  maxTemperatureC?: number;
  minTemperatureC?: number;
  precipitationProbabilityMax?: number;
  precipitationSumMm?: number;
  rainSumMm?: number;
  weatherCode?: number;
};

export type FloodWeatherHour = {
  precipitationMm?: number;
  precipitationProbability?: number;
  rainMm?: number;
  time: string;
};

export type FloodCurrentWeather = {
  feelsLikeC?: number;
  temperatureC?: number;
  time: string;
  weatherCode?: number;
};

export type FloodRiskOverview = {
  currentWeather: FloodCurrentWeather | null;
  flood: FloodOverview;
  location: {
    label?: string;
    latitude: number;
    localityLabel?: string;
    longitude: number;
  };
  weatherDaily: FloodWeatherDay[];
  weatherHourly: FloodWeatherHour[];
};

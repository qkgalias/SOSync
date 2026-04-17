/** Purpose: Return a personal flood-risk plus weather overview for the caller's current location. */
import axios from "axios";
import { logger } from "firebase-functions";
import { onRequest } from "firebase-functions/v2/https";

import { functionsRegion, googleFloodApiKey, openMeteoForecastUrl } from "./config.js";
import {
  buildDistanceLabel,
  buildFloodHeroCopy,
  buildForecastWindowLabel,
  buildMeasurementOverview,
  buildNearbyGaugeSummary,
  buildPrimaryGaugeSummary,
  buildSquareLoop,
  buildTimelineByGauge,
  distanceMetersBetween,
  mapSeverityToFloodLevel,
  normalizeGaugeOverviews,
  normalizePolygonOverlays,
  pickLatestForecast,
  pickPrimaryGauge,
  rankGaugeCandidates,
  TALISAY_CITY_CEBU_QA_COORDINATES,
  type FloodPolygonOverlay,
  type FloodRiskWindow,
} from "./floodHelpers.js";
import {
  ensurePostRequest,
  handleCorsPreflight,
  requireAuthenticatedRequest,
  sendJsonError,
  setCorsHeaders,
} from "./http.js";
import { coerceCoordinate } from "./httpValidation.js";

type MapCoordinate = {
  latitude: number;
  longitude: number;
};

type GoogleGauge = {
  countryCode?: string;
  gaugeId: string;
  hasModel?: boolean;
  location?: MapCoordinate;
  qualityVerified?: boolean;
  river?: string;
  siteName?: string;
  source?: string;
};

type GoogleFloodStatus = {
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

type GoogleGaugeModel = {
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

type GoogleGaugeForecast = {
  forecastRanges?: Array<{
    forecastEndTime?: string;
    forecastStartTime?: string;
    value?: number;
  }>;
  gaugeId: string;
  issuedTime?: string;
};

type GoogleSerializedPolygon = {
  kml?: string;
  polygonId?: string;
};

type WeatherDaily = {
  date: string;
  maxTemperatureC?: number;
  minTemperatureC?: number;
  precipitationProbabilityMax?: number;
  precipitationSumMm?: number;
  rainSumMm?: number;
  weatherCode?: number;
};

type WeatherHour = {
  precipitationMm?: number;
  precipitationProbability?: number;
  rainMm?: number;
  time: string;
};

type WeatherCurrent = {
  feelsLikeC?: number;
  temperatureC?: number;
  time: string;
  weatherCode?: number;
};

const FLOOD_API_BASE_URL = "https://floodforecasting.googleapis.com/v1";
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const AUTHENTICATED_FLOOD_OVERVIEW_LIMIT = 8;
const UNAUTHENTICATED_FLOOD_OVERVIEW_LIMIT = 16;
const SEARCH_RADII_KM = [10, 25, 50] as const;
const MAX_GAUGES = 5;
const TALISAY_QA_RADIUS_METERS = 25_000;
const GOOGLE_ARRAY_PARAMS_SERIALIZER = {
  indexes: null as null,
};

const buildGoogleParams = (params: Record<string, unknown> = {}) => ({
  ...params,
  key: googleFloodApiKey.value(),
});

const dedupeGauges = (gauges: GoogleGauge[]) => {
  const seen = new Map<string, GoogleGauge>();
  gauges.forEach((gauge) => {
    if (!seen.has(gauge.gaugeId)) {
      seen.set(gauge.gaugeId, gauge);
    }
  });
  return [...seen.values()];
};

const fetchNearbyModeledGauges = async (location: MapCoordinate) => {
  const verifiedGauges: GoogleGauge[] = [];
  const fallbackGauges: GoogleGauge[] = [];
  const diagnostics: Array<{
    fallbackCount: number;
    radiusKm: number;
    verifiedCount: number;
  }> = [];

  for (const radiusKm of SEARCH_RADII_KM) {
    const [verifiedResult, fallbackResult] = await Promise.allSettled([
      axios.post<{ gauges?: GoogleGauge[] }>(
        `${FLOOD_API_BASE_URL}/gauges:searchGaugesByArea`,
        {
          includeGaugesWithoutHydroModel: false,
          includeNonQualityVerified: false,
          loop: buildSquareLoop(location, radiusKm),
          pageSize: 100,
        },
        { params: buildGoogleParams() },
      ),
      axios.post<{ gauges?: GoogleGauge[] }>(
        `${FLOOD_API_BASE_URL}/gauges:searchGaugesByArea`,
        {
          includeGaugesWithoutHydroModel: false,
          includeNonQualityVerified: true,
          loop: buildSquareLoop(location, radiusKm),
          pageSize: 100,
        },
        { params: buildGoogleParams() },
      ),
    ]);

    if (verifiedResult.status === "rejected" && fallbackResult.status === "rejected") {
      logger.error("Google Flood Forecasting gauge search failed for all search variants.", {
        fallbackError:
          fallbackResult.reason instanceof Error ? fallbackResult.reason.message : String(fallbackResult.reason),
        location,
        radiusKm,
        verifiedError:
          verifiedResult.reason instanceof Error ? verifiedResult.reason.message : String(verifiedResult.reason),
      });
      throw verifiedResult.reason;
    }

    if (verifiedResult.status === "rejected") {
      logger.warn("Verified-only gauge search failed; falling back to non-quality-verified gauges.", {
        error:
          verifiedResult.reason instanceof Error ? verifiedResult.reason.message : String(verifiedResult.reason),
        location,
        radiusKm,
      });
    }

    if (fallbackResult.status === "rejected") {
      logger.warn("Fallback gauge search including non-quality-verified gauges failed.", {
        error:
          fallbackResult.reason instanceof Error ? fallbackResult.reason.message : String(fallbackResult.reason),
        location,
        radiusKm,
      });
    }

    const verifiedCount = verifiedResult.status === "fulfilled" ? (verifiedResult.value.data.gauges ?? []).length : 0;
    const fallbackCount = fallbackResult.status === "fulfilled" ? (fallbackResult.value.data.gauges ?? []).length : 0;
    diagnostics.push({ fallbackCount, radiusKm, verifiedCount });

    if (verifiedResult.status === "fulfilled") {
      verifiedGauges.push(...(verifiedResult.value.data.gauges ?? []));
    }
    if (fallbackResult.status === "fulfilled") {
      fallbackGauges.push(...(fallbackResult.value.data.gauges ?? []));
    }

    if (verifiedGauges.length || fallbackGauges.length) {
      break;
    }
  }

  const candidateGauges = dedupeGauges(verifiedGauges.length ? verifiedGauges : fallbackGauges)
    .filter((gauge) => gauge.gaugeId && gauge.hasModel)
    .sort((left, right) => {
      const leftDistance = left.location
        ? Math.hypot(left.location.latitude - location.latitude, left.location.longitude - location.longitude)
        : Number.POSITIVE_INFINITY;
      const rightDistance = right.location
        ? Math.hypot(right.location.latitude - location.latitude, right.location.longitude - location.longitude)
        : Number.POSITIVE_INFINITY;
      return leftDistance - rightDistance;
    })
    .slice(0, MAX_GAUGES);

  return {
    diagnostics,
    gauges: candidateGauges,
  };
};

const fetchGaugeModels = async (gaugeIds: string[]) => {
  if (!gaugeIds.length) {
    return {} as Record<string, GoogleGaugeModel>;
  }

  const response = await axios.get<{ gaugeModels?: GoogleGaugeModel[] }>(
    `${FLOOD_API_BASE_URL}/gaugeModels:batchGet`,
    {
      params: buildGoogleParams({
        names: gaugeIds.map((gaugeId) => `gaugeModels/${gaugeId}`),
      }),
      paramsSerializer: GOOGLE_ARRAY_PARAMS_SERIALIZER,
    },
  );

  return (response.data.gaugeModels ?? []).reduce<Record<string, GoogleGaugeModel>>((lookup, model) => {
    lookup[model.gaugeId] = model;
    return lookup;
  }, {});
};

const fetchLatestFloodStatuses = async (gaugeIds: string[]) => {
  if (!gaugeIds.length) {
    return {} as Record<string, GoogleFloodStatus>;
  }

  const response = await axios.get<{ floodStatuses?: GoogleFloodStatus[] }>(
    `${FLOOD_API_BASE_URL}/floodStatus:queryLatestFloodStatusByGaugeIds`,
    {
      params: buildGoogleParams({
        gaugeIds,
      }),
      paramsSerializer: GOOGLE_ARRAY_PARAMS_SERIALIZER,
    },
  );

  return (response.data.floodStatuses ?? []).reduce<Record<string, GoogleFloodStatus>>((lookup, status) => {
    lookup[status.gaugeId] = status;
    return lookup;
  }, {});
};

const fetchLatestForecasts = async (gaugeIds: string[], now: Date) => {
  if (!gaugeIds.length) {
    return {} as Record<string, GoogleGaugeForecast | undefined>;
  }

  const issuedTimeStart = new Date(now.getTime() - (48 * 60 * 60 * 1000)).toISOString();
  const response = await axios.get<{ forecasts?: Record<string, { forecasts?: GoogleGaugeForecast[] }> }>(
    `${FLOOD_API_BASE_URL}/gauges:queryGaugeForecasts`,
    {
      params: buildGoogleParams({
        gaugeIds,
        issuedTimeEnd: now.toISOString(),
        issuedTimeStart,
      }),
      paramsSerializer: GOOGLE_ARRAY_PARAMS_SERIALIZER,
    },
  );

  return Object.entries(response.data.forecasts ?? {}).reduce<Record<string, GoogleGaugeForecast | undefined>>(
    (lookup, [gaugeId, forecastSet]) => {
      lookup[gaugeId] = pickLatestForecast(forecastSet.forecasts ?? []) ?? undefined;
      return lookup;
    },
    {},
  );
};

const fetchSerializedPolygons = async (polygonIds: string[]) => {
  const uniquePolygonIds = [...new Set(polygonIds.filter(Boolean))];
  if (!uniquePolygonIds.length) {
    return {} as Record<string, string | undefined>;
  }

  const settledResults = await Promise.allSettled(
    uniquePolygonIds.map(async (polygonId) => {
      const response = await axios.get<GoogleSerializedPolygon>(
        `${FLOOD_API_BASE_URL}/serializedPolygons/${polygonId}`,
        { params: buildGoogleParams() },
      );

      return {
        kml: response.data.kml,
        polygonId,
      };
    }),
  );

  return settledResults.reduce<Record<string, string | undefined>>((lookup, result) => {
    if (result.status === "fulfilled") {
      lookup[result.value.polygonId] = result.value.kml;
      return lookup;
    }

    logger.warn("Google Flood Forecasting polygon lookup failed.", {
      error: result.reason instanceof Error ? result.reason.message : String(result.reason),
    });
    return lookup;
  }, {});
};

const fetchWeather = async (location: MapCoordinate) => {
  const response = await axios.get(openMeteoForecastUrl, {
    params: {
      current: "temperature_2m,apparent_temperature,weather_code",
      daily:
        "precipitation_probability_max,precipitation_sum,rain_sum,temperature_2m_max,temperature_2m_min,weathercode",
      forecast_days: 7,
      hourly: "precipitation_probability,precipitation,rain",
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: "Asia/Manila",
    },
  });

  const dailyTime = response.data.daily?.time ?? [];
  const weatherDaily = dailyTime.map((date: string, index: number) => ({
    date,
    maxTemperatureC: response.data.daily?.temperature_2m_max?.[index],
    minTemperatureC: response.data.daily?.temperature_2m_min?.[index],
    precipitationProbabilityMax: response.data.daily?.precipitation_probability_max?.[index],
    precipitationSumMm: response.data.daily?.precipitation_sum?.[index],
    rainSumMm: response.data.daily?.rain_sum?.[index],
    weatherCode: response.data.daily?.weathercode?.[index],
  })) as WeatherDaily[];

  const hourlyTime = response.data.hourly?.time ?? [];
  const weatherHourly = hourlyTime
    .slice(0, 24)
    .map((time: string, index: number) => ({
      precipitationMm: response.data.hourly?.precipitation?.[index],
      precipitationProbability: response.data.hourly?.precipitation_probability?.[index],
      rainMm: response.data.hourly?.rain?.[index],
      time,
    })) as WeatherHour[];

  const currentWeather = response.data.current?.time
    ? ({
        feelsLikeC: response.data.current?.apparent_temperature,
        temperatureC: response.data.current?.temperature_2m,
        time: response.data.current.time,
        weatherCode: response.data.current?.weather_code,
      } satisfies WeatherCurrent)
    : null;

  return {
    currentWeather,
    weatherDaily,
    weatherHourly,
  };
};

const buildEmptyFloodResponse = (input: {
  currentWeather: WeatherCurrent | null;
  now: Date;
  state: "limited_data" | "no_coverage";
  summary?: string;
  title?: string;
  weatherDaily: WeatherDaily[];
  weatherHourly: WeatherHour[];
  location: MapCoordinate;
}) => {
  const hero = input.state === "no_coverage"
    ? buildFloodHeroCopy({
        level: "LIMITED_DATA",
        locationReference: "your area",
        state: "no_coverage",
        trend: "unknown",
      })
    : {
        ...buildFloodHeroCopy({
          level: "LIMITED_DATA",
          locationReference: "your area",
          state: "limited_data",
          trend: "unknown",
        }),
        summary:
          input.summary ??
          "Flood information is not configured on the backend yet. Use official local warnings for decisions right now.",
        title: input.title ?? "Flood outlook unavailable",
      };

  return {
    currentWeather: input.currentWeather,
    flood: {
      hero,
      level: "LIMITED_DATA" as const,
      map: null,
      measurement: null,
      nearbyPoints: [],
      primaryPoint: null,
      state: input.state,
      updatedAt: input.now.toISOString(),
    },
    location: {
      latitude: input.location.latitude,
      longitude: input.location.longitude,
    },
    weatherDaily: input.weatherDaily,
    weatherHourly: input.weatherHourly,
  };
};

const buildNextRiskWindowForPrimaryGauge = (timelineByGaugeId: Record<string, FloodRiskWindow[]>, gaugeId?: string) => {
  if (!gaugeId) {
    return null;
  }

  return (
    (timelineByGaugeId[gaugeId] ?? []).find((entry) => entry.severity === "advisory" || entry.severity === "watch" || entry.severity === "warning" || entry.severity === "critical") ??
    null
  );
};

const buildFloodMap = (input: {
  currentLevel: ReturnType<typeof mapSeverityToFloodLevel>;
  nearbyPoints: Array<ReturnType<typeof buildNearbyGaugeSummary>>;
  polygonOverlays: FloodPolygonOverlay[];
  primaryPoint: ReturnType<typeof buildPrimaryGaugeSummary> | null;
  userLocation: MapCoordinate;
}) => {
  const gauges = [input.primaryPoint, ...input.nearbyPoints]
    .filter((point): point is NonNullable<typeof point> => Boolean(point))
    .filter(
      (point): point is NonNullable<typeof point> =>
        point.latitude !== undefined && point.longitude !== undefined,
    )
    .map((point) => ({
      gaugeId: point.gaugeId,
      isPrimary: point.gaugeId === input.primaryPoint?.gaugeId,
      label: point.label,
      latitude: point.latitude as number,
      level: point.level,
      longitude: point.longitude as number,
    }));

  const hasRenderableData = Boolean(gauges.length || input.polygonOverlays.length);
  if (!hasRenderableData) {
    return null;
  }

  return {
    gauges,
    hasRenderableData,
    polygons: input.polygonOverlays,
    userLocation: input.userLocation,
  };
};

export const getFloodRiskOverview = onRequest(
  { region: functionsRegion, secrets: [googleFloodApiKey] },
  async (request, response) => {
    setCorsHeaders(response);

    if (handleCorsPreflight(request, response)) {
      return;
    }

    if (!ensurePostRequest(request, response)) {
      return;
    }

    const authContext = await requireAuthenticatedRequest(request, response, {
      authenticatedLimit: AUTHENTICATED_FLOOD_OVERVIEW_LIMIT,
      routeKey: "getFloodRiskOverview",
      unauthenticatedLimit: UNAUTHENTICATED_FLOOD_OVERVIEW_LIMIT,
      windowMs: RATE_LIMIT_WINDOW_MS,
    });
    if (!authContext) {
      return;
    }

    const body = typeof request.body === "object" && request.body ? request.body : {};
    const latitude = coerceCoordinate((body as { latitude?: unknown }).latitude, -90, 90);
    const longitude = coerceCoordinate((body as { longitude?: unknown }).longitude, -180, 180);

    if (latitude === null || longitude === null) {
      sendJsonError(response, 400, "Valid latitude and longitude are required.");
      return;
    }

    const location = { latitude, longitude };
    const now = new Date();
    const distanceToTalisayMeters = distanceMetersBetween(location, TALISAY_CITY_CEBU_QA_COORDINATES);
    const isNearTalisayQaTarget = distanceToTalisayMeters <= TALISAY_QA_RADIUS_METERS;
    let currentWeather: WeatherCurrent | null = null;
    let weatherDaily: WeatherDaily[] = [];
    let weatherHourly: WeatherHour[] = [];

    try {
      const weather = await fetchWeather(location);
      currentWeather = weather.currentWeather;
      weatherDaily = weather.weatherDaily;
      weatherHourly = weather.weatherHourly;
    } catch (error) {
      logger.warn("Weather forecast fetch failed for flood overview.", {
        error: error instanceof Error ? error.message : String(error),
        userId: authContext.userId,
      });
    }

    if (!googleFloodApiKey.value()) {
      response.json(
        buildEmptyFloodResponse({
          currentWeather,
          location,
          now,
          state: "limited_data",
          summary:
            "Google Flood Forecasting is not configured on the backend yet. Use official local warnings for decisions right now.",
          title: "Flood outlook unavailable",
          weatherDaily,
          weatherHourly,
        }),
      );
      return;
    }

    try {
      const { diagnostics, gauges } = await fetchNearbyModeledGauges(location);
      logger.info("Flood overview gauge search completed.", {
        gaugeIds: gauges.map((gauge) => gauge.gaugeId),
        isNearTalisayQaTarget,
        location,
        searchDiagnostics: diagnostics,
        userId: authContext.userId,
      });

      if (!gauges.length) {
        response.json(
          buildEmptyFloodResponse({
            currentWeather,
            location,
            now,
            state: "no_coverage",
            weatherDaily,
            weatherHourly,
          }),
        );
        return;
      }

      const gaugeIds = gauges.map((gauge) => gauge.gaugeId);
      const [modelsResult, statusesResult, forecastsResult] = await Promise.allSettled([
        fetchGaugeModels(gaugeIds),
        fetchLatestFloodStatuses(gaugeIds),
        fetchLatestForecasts(gaugeIds, now),
      ]);

      if (modelsResult.status === "rejected") {
        logger.warn("Google Flood Forecasting gauge model lookup failed.", {
          error: modelsResult.reason instanceof Error ? modelsResult.reason.message : String(modelsResult.reason),
          gaugeIds,
          userId: authContext.userId,
        });
      }
      if (statusesResult.status === "rejected") {
        logger.warn("Google Flood Forecasting status lookup failed.", {
          error: statusesResult.reason instanceof Error ? statusesResult.reason.message : String(statusesResult.reason),
          gaugeIds,
          userId: authContext.userId,
        });
      }
      if (forecastsResult.status === "rejected") {
        logger.warn("Google Flood Forecasting forecast lookup failed.", {
          error:
            forecastsResult.reason instanceof Error ? forecastsResult.reason.message : String(forecastsResult.reason),
          gaugeIds,
          userId: authContext.userId,
        });
      }

      if (
        modelsResult.status === "rejected" &&
        statusesResult.status === "rejected" &&
        forecastsResult.status === "rejected"
      ) {
        throw forecastsResult.reason;
      }

      const modelsByGaugeId = modelsResult.status === "fulfilled" ? modelsResult.value : {};
      const statusesByGaugeId = statusesResult.status === "fulfilled" ? statusesResult.value : {};
      const latestForecastsByGaugeId = forecastsResult.status === "fulfilled" ? forecastsResult.value : {};

      const timelineByGaugeId = buildTimelineByGauge({
        forecastsByGaugeId: latestForecastsByGaugeId,
        modelsByGaugeId,
        now,
      });

      const gaugeOverviews = normalizeGaugeOverviews({
        gauges,
        latestForecastsByGaugeId,
        location,
        modelsByGaugeId,
        statusesByGaugeId,
        timelineByGaugeId,
      }).sort(rankGaugeCandidates);

      const primaryGauge = pickPrimaryGauge(gaugeOverviews);
      if (!primaryGauge) {
        response.json(
          buildEmptyFloodResponse({
            currentWeather,
            location,
            now,
            state: "limited_data",
            summary: "Nearby monitoring exists, but the app could not shape a reliable flood reference right now.",
            title: "Limited flood data",
            weatherDaily,
            weatherHourly,
          }),
        );
        return;
      }

      const nearbyGaugeOverviews = gaugeOverviews.filter((gauge) => gauge.gaugeId !== primaryGauge.gaugeId).slice(0, 4);
      const primaryPoint = buildPrimaryGaugeSummary({
        gauge: primaryGauge,
        now,
      });
      const nearbyPoints = nearbyGaugeOverviews.map((gauge) =>
        buildNearbyGaugeSummary({
          gauge,
          now,
        })
      );

      const level = mapSeverityToFloodLevel(primaryGauge.summarySeverity);
      const state = level === "LIMITED_DATA" ? "limited_data" : "ready";
      const nextRiskWindow = buildNextRiskWindowForPrimaryGauge(timelineByGaugeId, primaryGauge.gaugeId);
      const polygonKmlById = await fetchSerializedPolygons(
        [
          ...primaryGauge.polygonRefs.map((polygonRef) => polygonRef.polygonId),
          ...nearbyGaugeOverviews.flatMap((gauge) => gauge.polygonRefs.map((polygonRef) => polygonRef.polygonId)),
        ],
      );
      const polygonOverlays = normalizePolygonOverlays({
        currentLevel: level,
        polygonKmlById,
        polygonRefs: primaryGauge.polygonRefs,
      });
      const hero = buildFloodHeroCopy({
        forecastWindowLabel: buildForecastWindowLabel({
          nextRiskWindow,
          statusForecastWindow: primaryGauge.statusForecastWindow,
        }),
        level,
        locationReference: primaryGauge.siteName?.trim() || primaryGauge.river?.trim() || "your area",
        state,
        trend: primaryGauge.trend,
      });

      response.json({
        currentWeather,
        flood: {
          hero,
          level,
          map: buildFloodMap({
            currentLevel: level,
            nearbyPoints,
            polygonOverlays,
            primaryPoint,
            userLocation: location,
          }),
          measurement: buildMeasurementOverview({ gauge: primaryGauge }),
          nearbyPoints,
          primaryPoint,
          state,
          updatedAt:
            primaryGauge.latestForecastIssuedTime ??
            primaryGauge.latestStatusIssuedTime ??
            now.toISOString(),
        },
        location: {
          latitude,
          longitude,
        },
        weatherDaily,
        weatherHourly,
      });
    } catch (error) {
      logger.error("Flood overview lookup failed.", {
        error: error instanceof Error ? error.message : String(error),
        isNearTalisayQaTarget,
        location,
        userId: authContext.userId,
      });

      response.json(
        buildEmptyFloodResponse({
          currentWeather,
          location,
          now,
          state: "limited_data",
          summary: "We couldn't refresh nearby flood information right now. Try again in a moment.",
          title: "Flood outlook unavailable",
          weatherDaily,
          weatherHourly,
        }),
      );
    }
  },
);

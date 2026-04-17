/** Purpose: Keep flood overview normalization compatible with older backend responses. */
import { normalizeFloodRiskOverviewResponse } from "@/modules/map/floodOverviewAdapter";

describe("floodOverviewAdapter", () => {
  it("passes through the current nested flood payload unchanged", () => {
    const currentPayload = {
      currentWeather: null,
      flood: {
        hero: {
          badgeLabel: "SAFE",
          safetyMessage: "Stay aware.",
          summary: "No elevated flood signal right now.",
          title: "No elevated flood signal right now",
          trend: "stable" as const,
          trendLabel: "Stable",
        },
        level: "SAFE" as const,
        map: null,
        measurement: null,
        nearbyPoints: [],
        primaryPoint: null,
        state: "ready" as const,
        updatedAt: "2026-04-10T10:00:00.000Z",
      },
      location: {
        latitude: 14.6,
        longitude: 121,
      },
      weatherDaily: [],
      weatherHourly: [],
    };

    expect(normalizeFloodRiskOverviewResponse(currentPayload)).toEqual(currentPayload);
  });

  it("normalizes the older flat flood payload into the nested flood contract", () => {
    const legacyPayload = {
      currentWeather: null,
      location: {
        label: "Quezon City",
        latitude: 14.676,
        longitude: 121.0437,
      },
      nextRiskWindow: {
        endTime: "2026-04-10T14:00:00.000Z",
        gaugeId: "legacy-gauge",
        severity: "watch" as const,
        startTime: "2026-04-10T10:00:00.000Z",
        value: 3.6,
      },
      primaryGauge: {
        distanceMeters: 1800,
        gaugeId: "legacy-gauge",
        gaugeValueUnit: "METERS",
        hasModel: true,
        latestForecastIssuedTime: "2026-04-10T09:30:00.000Z",
        qualityVerified: true,
        river: "Marikina River",
        source: "Google Flood Forecasting",
        summarySeverity: "watch" as const,
        thresholds: {
          dangerLevel: 4.2,
          extremeDangerLevel: 5.1,
          warningLevel: 3.3,
        },
      },
      sevenDayFloodTimeline: [
        {
          endTime: "2026-04-10T11:00:00.000Z",
          severity: "advisory" as const,
          startTime: "2026-04-10T10:00:00.000Z",
          value: 3.2,
        },
        {
          endTime: "2026-04-10T13:00:00.000Z",
          severity: "watch" as const,
          startTime: "2026-04-10T12:00:00.000Z",
          value: 3.7,
        },
      ],
      severity: "watch" as const,
      state: "ok" as const,
      summary: "Conditions near your area could worsen. Stay alert and keep an eye on local updates.",
      supportingGauges: [
        {
          distanceMeters: 4200,
          gaugeId: "legacy-gauge-2",
          hasModel: true,
          qualityVerified: false,
          summarySeverity: "advisory" as const,
        },
      ],
      updatedAt: "2026-04-10T09:30:00.000Z",
      weatherDaily: [],
      weatherHourly: [],
    };

    const normalized = normalizeFloodRiskOverviewResponse(legacyPayload);

    expect(normalized.flood.level).toBe("WARNING");
    expect(normalized.flood.primaryPoint?.gaugeId).toBe("legacy-gauge");
    expect(normalized.flood.primaryPoint?.trend).toBe("rising");
    expect(normalized.flood.primaryPoint?.thresholds?.unit).toBe("m");
    expect(normalized.flood.hero.badgeLabel).toBe("WARNING");
    expect(normalized.flood.nearbyPoints).toHaveLength(1);
  });

  it("keeps legacy technical flow-rate units readable after normalization", () => {
    const legacyPayload = {
      currentWeather: null,
      location: {
        latitude: 14.676,
        longitude: 121.0437,
      },
      nextRiskWindow: null,
      primaryGauge: {
        distanceMeters: 1800,
        gaugeId: "legacy-gauge",
        gaugeValueUnit: "CUBIC_METERS_PER_SECOND",
        hasModel: true,
        qualityVerified: true,
        summarySeverity: "watch" as const,
        thresholds: {
          warningLevel: 611.4,
        },
      },
      sevenDayFloodTimeline: [],
      severity: "watch" as const,
      state: "ok" as const,
      summary: "Conditions near your area could worsen. Stay alert and keep an eye on local updates.",
      supportingGauges: [],
      updatedAt: "2026-04-10T09:30:00.000Z",
      weatherDaily: [],
      weatherHourly: [],
    };

    const normalized = normalizeFloodRiskOverviewResponse(legacyPayload);

    expect(normalized.flood.measurement?.unit).toBe("m³/s");
  });
});

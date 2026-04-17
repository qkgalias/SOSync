/** Purpose: Verify flood helper severity, ranking, trend, and polygon shaping logic. */
import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveFloodTrend,
  formatGaugeUnit,
  mapSeverityToFloodLevel,
  normalizePolygonOverlays,
  rankGaugeCandidates,
  type FloodGaugeOverview,
  type FloodRiskWindow,
} from "./floodHelpers.js";

const buildGauge = (input: Partial<FloodGaugeOverview> = {}): FloodGaugeOverview => ({
  distanceMeters: input.distanceMeters ?? 1_000,
  gaugeId: input.gaugeId ?? "gauge-1",
  hasModel: input.hasModel ?? true,
  latestForecastIssuedTime: input.latestForecastIssuedTime,
  latestStatusIssuedTime: input.latestStatusIssuedTime,
  location: input.location,
  polygonRefs: input.polygonRefs ?? [],
  qualityVerified: input.qualityVerified ?? true,
  statusSeverity: input.statusSeverity ?? "none",
  summarySeverity: input.summarySeverity ?? "none",
  thresholds: input.thresholds,
  trend: input.trend ?? "stable",
});

test("maps raw severities to the user-facing flood levels", () => {
  assert.equal(mapSeverityToFloodLevel("none"), "SAFE");
  assert.equal(mapSeverityToFloodLevel("advisory"), "CAUTION");
  assert.equal(mapSeverityToFloodLevel("watch"), "WARNING");
  assert.equal(mapSeverityToFloodLevel("warning"), "DANGER");
  assert.equal(mapSeverityToFloodLevel("critical"), "EXTREME_DANGER");
  assert.equal(mapSeverityToFloodLevel("unknown"), "LIMITED_DATA");
});

test("prefers verified gauges when candidates are similarly near", () => {
  const closerUnverified = buildGauge({
    distanceMeters: 1_000,
    gaugeId: "unverified",
    latestStatusIssuedTime: "2026-04-10T08:00:00.000Z",
    qualityVerified: false,
  });
  const slightlyFartherVerified = buildGauge({
    distanceMeters: 2_500,
    gaugeId: "verified",
    latestStatusIssuedTime: "2026-04-10T07:00:00.000Z",
    qualityVerified: true,
  });

  assert.equal(rankGaugeCandidates(closerUnverified, slightlyFartherVerified) > 0, true);
});

test("prefers nearer gauges when the distance gap is materially larger than 2km", () => {
  const nearGauge = buildGauge({
    distanceMeters: 1_000,
    gaugeId: "near",
    qualityVerified: false,
  });
  const farVerifiedGauge = buildGauge({
    distanceMeters: 4_500,
    gaugeId: "far",
    qualityVerified: true,
  });

  assert.equal(rankGaugeCandidates(nearGauge, farVerifiedGauge) < 0, true);
});

test("derives trend from the explicit flood status first", () => {
  assert.equal(
    deriveFloodTrend({
      forecastRanges: [],
      status: {
        forecastTrend: "RISE",
        gaugeId: "gauge-1",
      },
    }),
    "rising",
  );
});

test("falls back to forecast change and then forecast values to determine trend", () => {
  assert.equal(
    deriveFloodTrend({
      forecastRanges: [],
      status: {
        forecastChange: {
          valueChange: {
            lowerBound: -0.5,
            upperBound: -0.2,
          },
        },
        gaugeId: "gauge-1",
      },
    }),
    "falling",
  );

  const forecastRanges: FloodRiskWindow[] = [
    {
      endTime: "2026-04-10T10:00:00.000Z",
      gaugeId: "gauge-1",
      severity: "watch",
      startTime: "2026-04-10T09:00:00.000Z",
      value: 3.2,
    },
    {
      endTime: "2026-04-10T12:00:00.000Z",
      gaugeId: "gauge-1",
      severity: "warning",
      startTime: "2026-04-10T11:00:00.000Z",
      value: 4.1,
    },
  ];

  assert.equal(
    deriveFloodTrend({
      forecastRanges,
      status: {
        gaugeId: "gauge-1",
      },
    }),
    "rising",
  );
});

test("normalizes polygon overlays from serialized KML", () => {
  const overlays = normalizePolygonOverlays({
    currentLevel: "WARNING",
    polygonKmlById: {
      "polygon-1":
        "<Polygon><outerBoundaryIs><LinearRing><coordinates>121.0,14.6 121.1,14.6 121.1,14.7 121.0,14.7</coordinates></LinearRing></outerBoundaryIs></Polygon>",
    },
    polygonRefs: [
      {
        kind: "notification",
        polygonId: "polygon-1",
      },
    ],
  });

  assert.equal(overlays.length, 1);
  assert.equal(overlays[0]?.polygonId, "polygon-1");
  assert.equal(overlays[0]?.points.length, 4);
  assert.equal(overlays[0]?.level, "WARNING");
});

test("formats technical gauge units into readable labels", () => {
  assert.equal(formatGaugeUnit("METERS"), "m");
  assert.equal(formatGaugeUnit("CUBIC_METERS_PER_SECOND"), "m³/s");
  assert.equal(formatGaugeUnit("cubic_feet_per_second"), "ft³/s");
});

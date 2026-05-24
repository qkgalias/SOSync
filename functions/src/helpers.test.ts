/** Purpose: Verify alert helper behavior that prevents duplicate weather push fanout. */
import assert from "node:assert/strict";
import test from "node:test";

import { buildActiveAlertId, extractOpenMeteoAlertMetrics } from "./helpers.js";

test("uses the same active alert id for the same group, type, severity, and forecast day", () => {
  assert.equal(
    buildActiveAlertId("group-1", "storm", "advisory", "2026-05-24T08:00"),
    buildActiveAlertId("group-1", "storm", "advisory", "2026-05-24T18:00"),
  );
});

test("uses a new active alert id when severity or forecast day changes", () => {
  const advisory = buildActiveAlertId("group-1", "storm", "advisory", "2026-05-24T08:00");

  assert.notEqual(advisory, buildActiveAlertId("group-1", "storm", "watch", "2026-05-24T08:00"));
  assert.notEqual(advisory, buildActiveAlertId("group-1", "storm", "advisory", "2026-05-25T08:00"));
});

test("sanitizes active alert ids for Firestore document paths", () => {
  assert.equal(
    buildActiveAlertId("group:one", "storm", "advisory", "2026-05-24T08:00"),
    "group-one_storm_advisory_2026-05-24",
  );
});

test("extracts alert weather metrics from Open-Meteo forecast data", () => {
  assert.deepEqual(
    extractOpenMeteoAlertMetrics({
      current: {
        temperature_2m: 27.4,
        wind_gusts_10m: 41.2,
        wind_speed_10m: 26.1,
      },
      hourly: {
        precipitation: [1, 14.2, 6],
        precipitation_probability: [30, 75, 40],
        time: ["2026-05-24T13:00", "2026-05-24T14:00", "2026-05-24T15:00"],
        uv_index: [1, 2.4, 1.8],
        wind_gusts_10m: [30, 40.6, 34],
        wind_speed_10m: [20, 25.4, 22],
      },
    }),
    {
      peakRainfallIndex: 1,
      peakRiskEnd: "2026-05-24T15:00",
      peakRiskStart: "2026-05-24T14:00",
      rainChancePercent: 75,
      temperatureC: 27,
      uvIndex: 2.4,
      windGustKph: 41,
      windSpeedKph: 25,
    },
  );
});

test("omits optional alert weather metrics when Open-Meteo fields are missing", () => {
  assert.deepEqual(extractOpenMeteoAlertMetrics({ hourly: {} }), {
    peakRainfallIndex: -1,
    peakRiskEnd: undefined,
    peakRiskStart: undefined,
    rainChancePercent: undefined,
    temperatureC: undefined,
    uvIndex: undefined,
    windGustKph: undefined,
    windSpeedKph: undefined,
  });
});

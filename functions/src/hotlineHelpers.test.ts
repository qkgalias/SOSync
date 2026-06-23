/** Purpose: Verify hotline helpers keep the app-facing region fixed while preserving city/area data for admin usage. */
import assert from "node:assert/strict";
import test from "node:test";

import { normalizeHotlinePayload, resolveHotlineCityArea } from "./hotlineHelpers.js";

test("locks hotline region to PH while preserving the admin city/area", () => {
  assert.deepEqual(
    normalizeHotlinePayload(
      {
        cityArea: "  Talisay  ",
        disabled: false,
        name: "Barangay Hall",
        phone: "12345",
        region: "CEBU",
      },
      { hotlineId: "tabunok-hall", name: "Barangay Tabunok Hall", region: "PH" },
    ),
    {
      cityArea: "Talisay",
      description: "",
      disabled: false,
      name: "Barangay Hall",
      phone: "12345",
      region: "PH",
    },
  );
});

test("backfills the city/area from existing or legacy hotline data when the new field is missing", () => {
  assert.equal(
    resolveHotlineCityArea({
      hotlineId: "pnp-talisay",
      name: "Philippine National Police (PNP)",
      region: "PH",
    }),
    "Talisay",
  );

  assert.equal(
    resolveHotlineCityArea({
      cityArea: "Mandaue City",
      hotlineId: "new-hotline",
      name: "City Hotline",
      region: "PH",
    }),
    "Mandaue City",
  );
});

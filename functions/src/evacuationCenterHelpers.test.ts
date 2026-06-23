import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveEvacuationCenterGeography,
  isValidEvacuationCenterContact,
  mergeEvacuationCenterScopes,
  PHILIPPINE_REGIONS,
} from "./evacuationCenterHelpers.js";

test("bundles exactly 18 official PSGC regions", () => {
  assert.equal(PHILIPPINE_REGIONS.length, 18);
  assert.equal(new Set(PHILIPPINE_REGIONS.map((region) => region.code)).size, 18);
});

test("derives canonical geography from region code", () => {
  assert.deepEqual(deriveEvacuationCenterGeography("0700000000"), {
    countryCode: "PH",
    islandGroup: "Visayas",
    region: "Region VII (Central Visayas)",
    regionCode: "0700000000",
  });
  assert.equal(deriveEvacuationCenterGeography("PH"), null);
});

test("deduplicates legacy and country-scoped query results by document id", () => {
  assert.deepEqual(
    mergeEvacuationCenterScopes(
      [{ id: "a", data: { schema: "new" } }],
      [{ id: "a", data: { schema: "legacy" } }, { id: "b", data: { schema: "legacy" } }],
    ),
    [{ id: "a", data: { schema: "new" } }, { id: "b", data: { schema: "legacy" } }],
  );
});

test("validates formatted contacts by their 7 to 11 digit count", () => {
  assert.equal(isValidEvacuationCenterContact("(02) 714 7791"), true);
  assert.equal(isValidEvacuationCenterContact("462-1932"), true);
  assert.equal(isValidEvacuationCenterContact("09690634278"), true);
  assert.equal(isValidEvacuationCenterContact("Brgy. San Luis"), false);
  assert.equal(isValidEvacuationCenterContact("+63 912 345 6789"), false);
});

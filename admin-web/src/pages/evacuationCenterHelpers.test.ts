import {
  findPhilippineRegion,
  deriveGooglePlaceGeography,
  EVACUATION_CENTER_PAGE_SIZE,
  formatEvacuationCenterArea,
  isValidEvacuationCenterContact,
  limitEvacuationCenterContactInput,
  PHILIPPINE_REGIONS,
  sanitizeEvacuationCenterDraft,
} from "./evacuationCenterHelpers";

describe("evacuationCenterHelpers", () => {
  it("bundles exactly 18 official Philippine regions", () => {
    expect(PHILIPPINE_REGIONS).toHaveLength(18);
    expect(new Set(PHILIPPINE_REGIONS.map((region) => region.code)).size).toBe(18);
  });

  it("shows up to nine evacuation centers per page", () => {
    expect(EVACUATION_CENTER_PAGE_SIZE).toBe(9);
  });

  it.each([
    ["Metro Manila", "1300000000"],
    ["CALABARZON", "0400000000"],
    ["Central Visayas", "0700000000"],
  ])("maps Google area %s to PSGC region %s", (value, code) => {
    expect(findPhilippineRegion(value)?.code).toBe(code);
  });

  it("normalizes location text and derives region and island group", () => {
    expect(sanitizeEvacuationCenterDraft({
      address: "  146   JP Rizal St  ",
      capacity: 20,
      city: " Antipolo ",
      contact: " 0912 345 6789 ",
      countryCode: "XX",
      disabled: false,
      islandGroup: "Mindanao",
      latitude: 14.58,
      longitude: 121.17,
      name: " Antipolo   Shelter ",
      region: "Wrong",
      regionCode: "0400000000",
      serviceRadiusKm: 2,
    })).toMatchObject({
      address: "146 JP Rizal St",
      city: "Antipolo",
      countryCode: "PH",
      islandGroup: "Luzon",
      name: "Antipolo Shelter",
      region: "Region IV-A (CALABARZON)",
      regionCode: "0400000000",
    });
  });

  it("formats the city and official region without province", () => {
    expect(formatEvacuationCenterArea({
      address: "Fallback",
      city: "Quezon City",
      region: "National Capital Region (NCR)",
    })).toBe("Quezon City, National Capital Region (NCR)");
  });

  it("maps Google Places geography and derives island group immediately", () => {
    const component = (type: string, value: string) => ({ long_name: value, short_name: value, types: [type] });
    expect(deriveGooglePlaceGeography([
      component("locality", "Quezon City"),
      component("administrative_area_level_2", "Kalakhang Maynila"),
      component("administrative_area_level_1", "Metro Manila"),
    ])).toEqual({
      city: "Quezon City",
      islandGroup: "Luzon",
      region: "National Capital Region (NCR)",
      regionCode: "1300000000",
    });
    expect(deriveGooglePlaceGeography([
      component("locality", "Antipolo"),
      component("administrative_area_level_2", "Rizal"),
      component("administrative_area_level_1", "CALABARZON"),
    ])).toMatchObject({ city: "Antipolo", islandGroup: "Luzon", regionCode: "0400000000" });
  });

  it("accepts formatted contacts with 7 to 11 digits", () => {
    expect(isValidEvacuationCenterContact("(02) 714 7791")).toBe(true);
    expect(isValidEvacuationCenterContact("462-1932")).toBe(true);
    expect(isValidEvacuationCenterContact("09690634278")).toBe(true);
    expect(isValidEvacuationCenterContact("Brgy. San Luis")).toBe(false);
    expect(isValidEvacuationCenterContact("+63 912 345 6789")).toBe(false);
  });

  it("prevents contact input from exceeding 11 digits", () => {
    expect(limitEvacuationCenterContactInput("+63 (912) 345-67890")).toBe("+63 (912) 345-678");
    expect(limitEvacuationCenterContactInput("0969abc0634278")).toBe("09690634278");
  });
});

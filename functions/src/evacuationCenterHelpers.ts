export const PHILIPPINE_COUNTRY_CODE = "PH";

export const PHILIPPINE_REGIONS = [
  { code: "1300000000", islandGroup: "Luzon", name: "National Capital Region (NCR)" },
  { code: "1400000000", islandGroup: "Luzon", name: "Cordillera Administrative Region (CAR)" },
  { code: "0100000000", islandGroup: "Luzon", name: "Region I (Ilocos Region)" },
  { code: "0200000000", islandGroup: "Luzon", name: "Region II (Cagayan Valley)" },
  { code: "0300000000", islandGroup: "Luzon", name: "Region III (Central Luzon)" },
  { code: "0400000000", islandGroup: "Luzon", name: "Region IV-A (CALABARZON)" },
  { code: "1700000000", islandGroup: "Luzon", name: "MIMAROPA Region" },
  { code: "0500000000", islandGroup: "Luzon", name: "Region V (Bicol Region)" },
  { code: "0600000000", islandGroup: "Visayas", name: "Region VI (Western Visayas)" },
  { code: "1800000000", islandGroup: "Visayas", name: "Negros Island Region (NIR)" },
  { code: "0700000000", islandGroup: "Visayas", name: "Region VII (Central Visayas)" },
  { code: "0800000000", islandGroup: "Visayas", name: "Region VIII (Eastern Visayas)" },
  { code: "0900000000", islandGroup: "Mindanao", name: "Region IX (Zamboanga Peninsula)" },
  { code: "1000000000", islandGroup: "Mindanao", name: "Region X (Northern Mindanao)" },
  { code: "1100000000", islandGroup: "Mindanao", name: "Region XI (Davao Region)" },
  { code: "1200000000", islandGroup: "Mindanao", name: "Region XII (SOCCSKSARGEN)" },
  { code: "1600000000", islandGroup: "Mindanao", name: "Region XIII (Caraga)" },
  { code: "1900000000", islandGroup: "Mindanao", name: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)" },
] as const;

export const normalizeLocationText = (value: unknown) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

export const isValidEvacuationCenterContact = (value: unknown) => {
  const contact = normalizeLocationText(value);
  const digitCount = contact.replace(/\D/g, "").length;
  return /^[+()\d\s.-]+$/.test(contact) && digitCount >= 7 && digitCount <= 11;
};

export const getPhilippineRegionByCode = (value: unknown) =>
  PHILIPPINE_REGIONS.find((region) => region.code === normalizeLocationText(value)) ?? null;

export const deriveEvacuationCenterGeography = (regionCode: unknown) => {
  const region = getPhilippineRegionByCode(regionCode);
  return region
    ? {
        countryCode: PHILIPPINE_COUNTRY_CODE,
        islandGroup: region.islandGroup,
        region: region.name,
        regionCode: region.code,
      }
    : null;
};

export type ScopedEvacuationCenterDoc<T = Record<string, unknown>> = {
  id: string;
  data: T;
};

export const mergeEvacuationCenterScopes = <T>(
  countryScoped: ScopedEvacuationCenterDoc<T>[],
  legacyScoped: ScopedEvacuationCenterDoc<T>[],
) => Array.from(
  new Map([...legacyScoped, ...countryScoped].map((entry) => [entry.id, entry])).values(),
);

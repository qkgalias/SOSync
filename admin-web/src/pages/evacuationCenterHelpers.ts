import type { EvacuationCenterDraft } from "../types";

export const PHILIPPINE_COUNTRY_CODE = "PH";
export const EVACUATION_CENTER_PAGE_SIZE = 9;

export const PHILIPPINE_REGIONS = [
  { code: "1300000000", islandGroup: "Luzon", name: "National Capital Region (NCR)", aliases: ["NCR", "Metro Manila", "Kalakhang Maynila", "National Capital Region"] },
  { code: "1400000000", islandGroup: "Luzon", name: "Cordillera Administrative Region (CAR)", aliases: ["CAR", "Cordillera Administrative Region"] },
  { code: "0100000000", islandGroup: "Luzon", name: "Region I (Ilocos Region)", aliases: ["Ilocos Region", "Region I"] },
  { code: "0200000000", islandGroup: "Luzon", name: "Region II (Cagayan Valley)", aliases: ["Cagayan Valley", "Region II"] },
  { code: "0300000000", islandGroup: "Luzon", name: "Region III (Central Luzon)", aliases: ["Central Luzon", "Region III"] },
  { code: "0400000000", islandGroup: "Luzon", name: "Region IV-A (CALABARZON)", aliases: ["CALABARZON", "Calabarzon", "Region IV-A"] },
  { code: "1700000000", islandGroup: "Luzon", name: "MIMAROPA Region", aliases: ["MIMAROPA", "MIMAROPA Region", "Region IV-B"] },
  { code: "0500000000", islandGroup: "Luzon", name: "Region V (Bicol Region)", aliases: ["Bicol Region", "Region V"] },
  { code: "0600000000", islandGroup: "Visayas", name: "Region VI (Western Visayas)", aliases: ["Western Visayas", "Region VI"] },
  { code: "1800000000", islandGroup: "Visayas", name: "Negros Island Region (NIR)", aliases: ["NIR", "Negros Island Region"] },
  { code: "0700000000", islandGroup: "Visayas", name: "Region VII (Central Visayas)", aliases: ["Central Visayas", "Region VII"] },
  { code: "0800000000", islandGroup: "Visayas", name: "Region VIII (Eastern Visayas)", aliases: ["Eastern Visayas", "Region VIII"] },
  { code: "0900000000", islandGroup: "Mindanao", name: "Region IX (Zamboanga Peninsula)", aliases: ["Zamboanga Peninsula", "Region IX"] },
  { code: "1000000000", islandGroup: "Mindanao", name: "Region X (Northern Mindanao)", aliases: ["Northern Mindanao", "Region X"] },
  { code: "1100000000", islandGroup: "Mindanao", name: "Region XI (Davao Region)", aliases: ["Davao Region", "Region XI"] },
  { code: "1200000000", islandGroup: "Mindanao", name: "Region XII (SOCCSKSARGEN)", aliases: ["SOCCSKSARGEN", "Region XII"] },
  { code: "1600000000", islandGroup: "Mindanao", name: "Region XIII (Caraga)", aliases: ["Caraga", "Region XIII"] },
  { code: "1900000000", islandGroup: "Mindanao", name: "Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)", aliases: ["BARMM", "Bangsamoro Autonomous Region in Muslim Mindanao"] },
] as const;

export type PhilippineRegion = (typeof PHILIPPINE_REGIONS)[number];

const normalizeComparable = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();

export const normalizeLocationText = (value: unknown) =>
  String(value ?? "").trim().replace(/\s+/g, " ");

export const getContactDigitCount = (value: unknown) =>
  String(value ?? "").replace(/\D/g, "").length;

export const isValidEvacuationCenterContact = (value: unknown) => {
  const contact = String(value ?? "").trim();
  const digitCount = getContactDigitCount(contact);
  return /^[+()\d\s.-]+$/.test(contact) && digitCount >= 7 && digitCount <= 11;
};

export const limitEvacuationCenterContactInput = (value: string) => {
  let digits = 0;
  return Array.from(value).filter((character) => {
    if (/\d/.test(character)) {
      digits += 1;
      return digits <= 11;
    }
    return /[+()\s.-]/.test(character);
  }).join("");
};

export const getPhilippineRegionByCode = (code: unknown) =>
  PHILIPPINE_REGIONS.find((region) => region.code === String(code ?? "").trim()) ?? null;

export const findPhilippineRegion = (value: unknown) => {
  const normalized = normalizeComparable(value);
  if (!normalized) return null;
  return PHILIPPINE_REGIONS.find((region) =>
    region.code === String(value).trim() ||
    normalizeComparable(region.name) === normalized ||
    region.aliases.some((alias) => normalizeComparable(alias) === normalized)
  ) ?? null;
};

export const sanitizeEvacuationCenterDraft = (
  draft: EvacuationCenterDraft,
): EvacuationCenterDraft => {
  const region = getPhilippineRegionByCode(draft.regionCode);
  const { province: _province, ...draftWithoutProvince } = draft;
  return {
    ...draftWithoutProvince,
    address: normalizeLocationText(draft.address),
    city: normalizeLocationText(draft.city),
    contact: normalizeLocationText(draft.contact),
    countryCode: PHILIPPINE_COUNTRY_CODE,
    islandGroup: region?.islandGroup ?? "",
    name: normalizeLocationText(draft.name),
    region: region?.name ?? "",
    regionCode: region?.code ?? "",
  };
};

export const formatEvacuationCenterArea = (center: Pick<EvacuationCenterDraft, "address" | "city" | "region">) =>
  [center.city, center.region].filter(Boolean).join(", ") || center.address;

type GoogleAddressComponent = { long_name: string; short_name: string; types: string[] };

const getGoogleAddressComponent = (components: GoogleAddressComponent[] | undefined, type: string) =>
  components?.find((component) => component.types.includes(type))?.long_name ?? "";

export const deriveGooglePlaceGeography = (components: GoogleAddressComponent[] | undefined) => {
  const region = findPhilippineRegion(getGoogleAddressComponent(components, "administrative_area_level_1"));
  return {
    city: normalizeLocationText(
      getGoogleAddressComponent(components, "locality") ||
      getGoogleAddressComponent(components, "administrative_area_level_3"),
    ),
    ...(region ? {
      islandGroup: region.islandGroup,
      region: region.name,
      regionCode: region.code,
    } : {}),
  };
};

import type { QueryDocumentSnapshot } from "firebase-admin/firestore";

export type HotlineInput = {
  cityArea?: unknown;
  description?: unknown;
  disabled?: unknown;
  hotlineId?: unknown;
  name?: unknown;
  phone?: unknown;
  region?: unknown;
};

type HotlineRecord = {
  cityArea?: unknown;
  hotlineId?: string;
  name?: unknown;
  region?: unknown;
};

const HOTLINE_REGION = "PH";

const toOptionalString = (value: unknown, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeLegacyHotlineCityArea = (hotline: HotlineRecord) => {
  const region = toOptionalString(hotline.region, 120);
  if (region && region.toLowerCase() !== "ph") {
    return region;
  }

  const id = toOptionalString(hotline.hotlineId, 120).toLowerCase();
  const name = toOptionalString(hotline.name, 160).toLowerCase();
  if (
    id.includes("tabunok") ||
    id.includes("bfp-talisay") ||
    id.includes("pnp-talisay") ||
    id.includes("talisay-drrmo") ||
    name.includes("tabunok") ||
    name.includes("bureau of fire") ||
    name.includes("philippine national police") ||
    name.includes("drrmo")
  ) {
    return "Talisay";
  }
  if (id.includes("ndrrmc") || id === "911" || name.includes("ndrrmc") || name.includes("national emergency")) {
    return "Quezon City";
  }
  if (id.includes("red-cross") || name.includes("red cross")) {
    return "Pasig City";
  }
  return region || "";
};

export const resolveHotlineCityArea = (hotline: HotlineRecord) =>
  toOptionalString(hotline.cityArea, 120) || normalizeLegacyHotlineCityArea(hotline);

export const normalizeHotlinePayload = (data: HotlineInput, existingHotline?: HotlineRecord) => ({
  cityArea: toOptionalString(data.cityArea, 120) || resolveHotlineCityArea(existingHotline ?? {}),
  description: toOptionalString(data.description, 500),
  disabled: data.disabled === true || String(data.disabled).toLowerCase() === "true",
  name: toOptionalString(data.name, 120),
  phone: toOptionalString(data.phone, 80),
  region: HOTLINE_REGION,
});

export const serializeHotlineDoc = (snapshot: QueryDocumentSnapshot) => {
  const data = snapshot.data() as Record<string, unknown>;
  return {
    hotlineId: snapshot.id,
    ...data,
    cityArea: resolveHotlineCityArea({
      cityArea: data.cityArea,
      hotlineId: snapshot.id,
      name: data.name,
      region: data.region,
    }),
  };
};

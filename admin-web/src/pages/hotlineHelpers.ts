import type { Hotline } from "../types";

type HotlineLike = Pick<Hotline, "cityArea" | "name" | "region"> & { hotlineId?: string };

const normalize = (value?: string) => (value ?? "").trim().toLowerCase();

const getLegacyHotlineCityArea = (hotline: HotlineLike) => {
  const id = normalize(hotline.hotlineId);
  const name = normalize(hotline.name);
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
  return "";
};

export function formatCityArea(value: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length <= 3) {
    return trimmed;
  }
  const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
  if (!lettersOnly || (lettersOnly.length <= 3 && trimmed === trimmed.toUpperCase())) {
    return trimmed;
  }
  if (trimmed === trimmed.toUpperCase() || trimmed === trimmed.toLowerCase()) {
    return trimmed.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  }
  return trimmed;
}

export function resolveHotlineCityArea(hotline: HotlineLike) {
  const cityArea = hotline.cityArea?.trim();
  if (cityArea) {
    return cityArea;
  }

  const region = hotline.region?.trim();
  if (region && normalize(region) !== "ph") {
    return region;
  }

  return getLegacyHotlineCityArea(hotline);
}

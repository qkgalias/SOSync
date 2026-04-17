/** Purpose: Keep flood-risk caching, severity tokens, and refresh rules deterministic. */
import axios from "axios";

import type { FloodLevel, MapCoordinate } from "@/types";
import { locationService } from "@/services/locationService";

export const FLOOD_RISK_CACHE_TTL_MS = 30 * 60 * 1000;
export const FLOOD_RISK_DISTANCE_REFRESH_METERS = 2_000;

export const buildFloodRiskCacheKey = (coordinate: MapCoordinate) =>
  `${coordinate.latitude.toFixed(3)},${coordinate.longitude.toFixed(3)}`;

export const shouldRefreshFloodRisk = (input: {
  currentLocation: MapCoordinate;
  fetchedAt: number;
  lastLocation: MapCoordinate;
}) => {
  if (Date.now() - input.fetchedAt > FLOOD_RISK_CACHE_TTL_MS) {
    return true;
  }

  return (
    locationService.distanceBetween(input.currentLocation, input.lastLocation) >=
    FLOOD_RISK_DISTANCE_REFRESH_METERS
  );
};

export const getFloodLevelLabel = (level: FloodLevel) => {
  switch (level) {
    case "EXTREME_DANGER":
      return "EXTREME DANGER";
    case "DANGER":
      return "DANGER";
    case "WARNING":
      return "WARNING";
    case "CAUTION":
      return "CAUTION";
    case "LIMITED_DATA":
      return "LIMITED DATA";
    default:
      return "SAFE";
  }
};

export const getFloodLevelColors = (level: FloodLevel) => {
  switch (level) {
    case "EXTREME_DANGER":
      return {
        accent: "#5C1515",
        badgeBackground: "#7B1E1B",
        badgeText: "#FFFFFF",
        heroBackground: "#8B231E",
        heroBorder: "#6A1B1A",
        surfaceTint: "#F6E1DE",
      };
    case "DANGER":
      return {
        accent: "#B13A32",
        badgeBackground: "#FCE2DF",
        badgeText: "#A1322A",
        heroBackground: "#F9E7E4",
        heroBorder: "#E8BDB6",
        surfaceTint: "#FFF1EF",
      };
    case "WARNING":
      return {
        accent: "#C16512",
        badgeBackground: "#FFEBD6",
        badgeText: "#A25512",
        heroBackground: "#FFF5E9",
        heroBorder: "#F2D6AF",
        surfaceTint: "#FFF8F0",
      };
    case "CAUTION":
      return {
        accent: "#AF7A0C",
        badgeBackground: "#FFF3D9",
        badgeText: "#99660E",
        heroBackground: "#FFF8E9",
        heroBorder: "#ECD9A9",
        surfaceTint: "#FFFBF2",
      };
    case "LIMITED_DATA":
      return {
        accent: "#6A6767",
        badgeBackground: "#EEEAE8",
        badgeText: "#5F5A58",
        heroBackground: "#F6F3F1",
        heroBorder: "#E3DBD7",
        surfaceTint: "#FAF7F5",
      };
    default:
      return {
        accent: "#267C47",
        badgeBackground: "#E8F6EB",
        badgeText: "#267C47",
        heroBackground: "#F3FBF4",
        heroBorder: "#CFE8D5",
        surfaceTint: "#F8FCF8",
      };
  }
};

export const getFloodRiskErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return "Sign in again to check local conditions near you.";
    }
    if (status === 429) {
      return "You've refreshed flood outlook too often. Please wait a bit before trying again.";
    }
    if (status === 404) {
      return "We couldn't load local conditions right now. Try again in a moment.";
    }
    if (typeof status === "number" && status >= 500) {
      return "We couldn't load local conditions right now. Try again in a moment.";
    }
    if (error.code === "ECONNABORTED") {
      return "Checking local conditions took too long. Try again in a moment.";
    }
  }

  return error instanceof Error ? error.message : "We couldn't load local conditions right now. Try again in a moment.";
};

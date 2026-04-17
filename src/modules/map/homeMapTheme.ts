/** Purpose: Keep Home map palette and presentation tokens consistent across the Home experience. */
import type { ViewStyle } from "react-native";
import type { Group, HomeMapAppearance } from "@/types";
import { getThemeTokens } from "@/theme/appTheme";

export type HomeMapPalette = {
  chip: string;
  chipText: string;
  danger: string;
  divider: string;
  floatingBorder: string;
  floatingSurface: string;
  iconTint: string;
  page: string;
  share: string;
  sheet: string;
  sheetHandle: string;
  sheetText: string;
  sheetTextMuted: string;
  statusDot: string;
  topPill: string;
};

export type HomeContactItem = {
  activeSos: boolean;
  member: {
    displayName: string;
    phoneNumber?: string;
    photoURL?: string;
    role?: string;
    userId: string;
  };
  marker: {
    markerId: string;
  } | null;
  subtitle: string;
};

type HomeShadowKind = "chip" | "floatingSurface" | "primaryButton" | "secondaryButton" | "sheet";

export const getHomeMapPalette = (appearance: HomeMapAppearance): HomeMapPalette =>
  (() => {
    const tokens = getThemeTokens(appearance);

    return appearance === "dark"
      ? {
          chip: tokens.surfaceElevated,
          chipText: tokens.textPrimary,
          danger: tokens.accentPrimary,
          divider: tokens.borderSubtle,
          floatingBorder: tokens.borderStrong,
          floatingSurface: "rgba(37, 41, 50, 0.96)",
          iconTint: tokens.textPrimary,
          page: tokens.bgApp,
          share: tokens.accentPrimary,
          sheet: tokens.bgSecondary,
          sheetHandle: tokens.borderStrong,
          sheetText: tokens.textPrimary,
          sheetTextMuted: tokens.textSecondary,
          statusDot: tokens.success,
          topPill: "rgba(37, 41, 50, 0.96)",
        }
      : {
          chip: "#FFFFFF",
          chipText: tokens.textPrimary,
          danger: tokens.accentOutline,
          divider: "#EEE7E2",
          floatingBorder: "#E8DDD8",
          floatingSurface: "rgba(255, 255, 255, 0.96)",
          iconTint: tokens.accentPrimary,
          page: tokens.bgApp,
          share: tokens.accentOutline,
          sheet: "#FCFAF8",
          sheetHandle: "#B8AAA4",
          sheetText: tokens.textPrimary,
          sheetTextMuted: tokens.textMuted,
          statusDot: tokens.success,
          topPill: "rgba(255, 255, 255, 0.97)",
        };
  })();

export const getHomeShadowStyle = (
  appearance: HomeMapAppearance,
  kind: HomeShadowKind,
): ViewStyle => {
  const isDark = appearance === "dark";
  const tokens = getThemeTokens(appearance);

  switch (kind) {
    case "chip":
      return {
        elevation: isDark ? 2 : 1,
        shadowColor: isDark ? "#000000" : "#2F1918",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.14 : 0.06,
        shadowRadius: isDark ? 6 : 7,
      };
    case "sheet":
      return {
        elevation: isDark ? 18 : 16,
        shadowColor: isDark ? "#000000" : "#2F1918",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: isDark ? 0.26 : 0.12,
        shadowRadius: isDark ? 22 : 24,
      };
    case "primaryButton":
      return {
        elevation: isDark ? 10 : 8,
        shadowColor: isDark ? "#000000" : tokens.accentPrimary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.3 : 0.18,
        shadowRadius: isDark ? 16 : 18,
      };
    case "secondaryButton":
      return {
        elevation: isDark ? 6 : 5,
        shadowColor: isDark ? "#000000" : "#2F1918",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.22 : 0.11,
        shadowRadius: isDark ? 14 : 16,
      };
    case "floatingSurface":
    default:
      return {
        elevation: isDark ? 7 : 6,
        shadowColor: isDark ? "#000000" : "#2F1918",
        shadowOffset: { width: 0, height: 7 },
        shadowOpacity: isDark ? 0.24 : 0.12,
        shadowRadius: isDark ? 16 : 18,
      };
  }
};

export const getHomeSafetyHubHeading = (
  activeHubCenterId: string | null | undefined,
  nearestCenterId: string | null | undefined,
) =>
  activeHubCenterId && activeHubCenterId !== nearestCenterId ? "Selected Safety Hub" : "Nearest Safety Hub";

export const resolveActiveGroup = (groups: Group[], selectedGroupId: string | null) =>
  groups.find((group) => group.groupId === selectedGroupId) ?? groups[0] ?? null;

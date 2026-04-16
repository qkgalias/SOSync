/** Purpose: Centralize SOSync light/dark theme tokens and runtime preference resolution. */
import type { ThemePreference } from "@/types";

export type ResolvedTheme = "light" | "dark";

export type AppThemeTokens = {
  accentOutline: string;
  accentPressed: string;
  accentPrimary: string;
  accentSoft: string;
  bgApp: string;
  bgSecondary: string;
  borderStrong: string;
  borderSubtle: string;
  danger: string;
  dangerBorder: string;
  dangerSurface: string;
  dangerText: string;
  info: string;
  infoBorder: string;
  infoSurface: string;
  infoText: string;
  surface: string;
  surfaceElevated: string;
  surfaceInput: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
  warning: string;
  warningBorder: string;
  warningSurface: string;
  warningText: string;
  success: string;
  successBorder: string;
  successSurface: string;
  successText: string;
};

export const LIGHT_THEME_TOKENS: AppThemeTokens = {
  bgApp: "#FFFFFF",
  bgSecondary: "#F6F2EF",
  surface: "#F1F1F1",
  surfaceElevated: "#E0E0E0",
  surfaceInput: "#FFFFFF",
  textPrimary: "#2E2C2C",
  textSecondary: "#595556",
  textMuted: "#6A6767",
  accentPrimary: "#5C1515",
  accentPressed: "#7A3131",
  accentSoft: "#F3ECE9",
  accentOutline: "#A9443D",
  borderSubtle: "#E4D8D8",
  borderStrong: "#D2C2BE",
  success: "#22C55E",
  successSurface: "#E8F7EE",
  successBorder: "#B7E7C9",
  successText: "#15803D",
  warning: "#D19A1A",
  warningSurface: "#FFF7E2",
  warningBorder: "#E8CF8B",
  warningText: "#8B650D",
  danger: "#D93A3A",
  dangerSurface: "#FCEBEB",
  dangerBorder: "#EDB7B7",
  dangerText: "#A62C2C",
  info: "#4DA3FF",
  infoSurface: "#EAF4FF",
  infoBorder: "#C3DCF8",
  infoText: "#2B6BAA",
};

export const DARK_THEME_TOKENS: AppThemeTokens = {
  bgApp: "#121315",
  bgSecondary: "#181A1F",
  surface: "#1E2127",
  surfaceElevated: "#252932",
  surfaceInput: "#2B303A",
  textPrimary: "#F5F7FA",
  textSecondary: "#B7BDC8",
  textMuted: "#8B93A1",
  accentPrimary: "#761619",
  accentPressed: "#631214",
  accentSoft: "#3B1418",
  accentOutline: "#C94752",
  borderSubtle: "#343944",
  borderStrong: "#454B57",
  success: "#22C55E",
  successSurface: "#14281D",
  successBorder: "#2F6E46",
  successText: "#7EE2A8",
  warning: "#D19A1A",
  warningSurface: "#2E2410",
  warningBorder: "#6F5717",
  warningText: "#F3C969",
  danger: "#D93A3A",
  dangerSurface: "#3A1414",
  dangerBorder: "#8A2A2A",
  dangerText: "#FFB3B3",
  info: "#4DA3FF",
  infoSurface: "#142131",
  infoBorder: "#2E5E8F",
  infoText: "#A9D1FF",
};

const hexToRgbChannels = (value: string) => {
  const sanitized = value.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `${red} ${green} ${blue}`;
};

export const getThemeTokens = (theme: ResolvedTheme) =>
  theme === "dark" ? DARK_THEME_TOKENS : LIGHT_THEME_TOKENS;

export const resolveThemePreference = (
  preference: ThemePreference | null | undefined,
  systemColorScheme: ResolvedTheme | null | undefined,
): ResolvedTheme => {
  if (preference === "dark" || preference === "light") {
    return preference;
  }

  return systemColorScheme === "dark" ? "dark" : "light";
};

export const buildThemeCssVariables = (theme: ResolvedTheme) => {
  const tokens = getThemeTokens(theme);

  return {
    "--accent-outline": hexToRgbChannels(tokens.accentOutline),
    "--accent-pressed": hexToRgbChannels(tokens.accentPressed),
    "--accent-primary": hexToRgbChannels(tokens.accentPrimary),
    "--accent-soft": hexToRgbChannels(tokens.accentSoft),
    "--bg-app": hexToRgbChannels(tokens.bgApp),
    "--bg-secondary": hexToRgbChannels(tokens.bgSecondary),
    "--border-strong": hexToRgbChannels(tokens.borderStrong),
    "--border-subtle": hexToRgbChannels(tokens.borderSubtle),
    "--danger": hexToRgbChannels(tokens.danger),
    "--danger-border": hexToRgbChannels(tokens.dangerBorder),
    "--danger-surface": hexToRgbChannels(tokens.dangerSurface),
    "--danger-text": hexToRgbChannels(tokens.dangerText),
    "--info": hexToRgbChannels(tokens.info),
    "--info-border": hexToRgbChannels(tokens.infoBorder),
    "--info-surface": hexToRgbChannels(tokens.infoSurface),
    "--info-text": hexToRgbChannels(tokens.infoText),
    "--success": hexToRgbChannels(tokens.success),
    "--success-border": hexToRgbChannels(tokens.successBorder),
    "--success-surface": hexToRgbChannels(tokens.successSurface),
    "--success-text": hexToRgbChannels(tokens.successText),
    "--surface": hexToRgbChannels(tokens.surface),
    "--surface-elevated": hexToRgbChannels(tokens.surfaceElevated),
    "--surface-input": hexToRgbChannels(tokens.surfaceInput),
    "--text-muted": hexToRgbChannels(tokens.textMuted),
    "--text-primary": hexToRgbChannels(tokens.textPrimary),
    "--text-secondary": hexToRgbChannels(tokens.textSecondary),
    "--warning": hexToRgbChannels(tokens.warning),
    "--warning-border": hexToRgbChannels(tokens.warningBorder),
    "--warning-surface": hexToRgbChannels(tokens.warningSurface),
    "--warning-text": hexToRgbChannels(tokens.warningText),
  } as const;
};

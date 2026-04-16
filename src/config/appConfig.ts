/** Purpose: Centralize product-level design, region, and map defaults for SOSync. */
import { LIGHT_THEME_TOKENS } from "@/theme/appTheme";

export const appConfig = {
  appName: "SOSync",
  launchRegion: "PH",
  map: {
    initialRegion: {
      latitude: 14.5995,
      longitude: 120.9842,
      latitudeDelta: 0.28,
      longitudeDelta: 0.28,
    },
  },
  theme: {
    colors: {
      canvas: LIGHT_THEME_TOKENS.bgApp,
      surface: LIGHT_THEME_TOKENS.surface,
      ink: LIGHT_THEME_TOKENS.textPrimary,
      muted: LIGHT_THEME_TOKENS.textMuted,
      line: LIGHT_THEME_TOKENS.borderSubtle,
      primary: LIGHT_THEME_TOKENS.accentPrimary,
      accent: LIGHT_THEME_TOKENS.accentPrimary,
      soft: LIGHT_THEME_TOKENS.accentSoft,
      softText: LIGHT_THEME_TOKENS.textPrimary,
      caution: LIGHT_THEME_TOKENS.warning,
      danger: LIGHT_THEME_TOKENS.danger,
      focus: LIGHT_THEME_TOKENS.accentPressed,
    },
  },
};

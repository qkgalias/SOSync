/** Purpose: Resolve the app-wide theme from profile preference or system scheme and expose runtime tokens. */
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, AppState, View } from "react-native";
import type { ColorSchemeName } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { vars } from "nativewind";

import { useAuthSession } from "@/hooks/useAuthSession";
import { USER_SEED } from "@/utils/constants";
import {
  buildThemeCssVariables,
  getThemeTokens,
  resolveThemePreference,
  type AppThemeTokens,
  type ResolvedTheme,
} from "@/theme/appTheme";
import type { ThemePreference } from "@/types";

type AppThemeContextValue = {
  resolvedTheme: ResolvedTheme;
  themePreference: ThemePreference;
  themeTokens: AppThemeTokens;
};

type AppThemeScopeProps = PropsWithChildren<{
  resolvedTheme: ResolvedTheme;
  themePreference?: ThemePreference;
}>;

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

const normalizeSystemColorScheme = (colorScheme: ColorSchemeName | null | undefined): ResolvedTheme | undefined =>
  colorScheme === "light" || colorScheme === "dark" ? colorScheme : undefined;

const getCurrentSystemColorScheme = () => normalizeSystemColorScheme(Appearance.getColorScheme());

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const { profile, status } = useAuthSession();
  const [systemColorScheme, setSystemColorScheme] = useState<ResolvedTheme>(
    () => getCurrentSystemColorScheme() ?? "light",
  );
  const themePreference: ThemePreference =
    status === "signedIn"
      ? (profile?.preferences?.theme ?? USER_SEED.preferences.theme)
      : "system";
  const resolvedTheme = resolveThemePreference(themePreference, systemColorScheme);
  const themeTokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);
  const themeVariables = useMemo(() => vars(buildThemeCssVariables(resolvedTheme)), [resolvedTheme]);

  useEffect(() => {
    const syncSystemColorScheme = (colorScheme: ColorSchemeName | null | undefined) => {
      const normalizedColorScheme = normalizeSystemColorScheme(colorScheme);

      if (normalizedColorScheme) {
        setSystemColorScheme(normalizedColorScheme);
      }
    };

    syncSystemColorScheme(Appearance.getColorScheme());

    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      syncSystemColorScheme(colorScheme);
    });
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncSystemColorScheme(Appearance.getColorScheme());
      }
    });

    return () => {
      appearanceSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(themeTokens.bgApp).catch(() => undefined);
  }, [themeTokens.bgApp]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      resolvedTheme,
      themePreference,
      themeTokens,
    }),
    [resolvedTheme, themePreference, themeTokens],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <View className="flex-1 bg-page" style={themeVariables}>
        <StatusBar
          animated
          backgroundColor={themeTokens.bgApp}
          style={resolvedTheme === "dark" ? "light" : "dark"}
          translucent={false}
        />
        {children}
      </View>
    </AppThemeContext.Provider>
  );
};

export const AppThemeScope = ({
  children,
  resolvedTheme,
  themePreference = resolvedTheme,
}: AppThemeScopeProps) => {
  const themeTokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);
  const themeVariables = useMemo(() => vars(buildThemeCssVariables(resolvedTheme)), [resolvedTheme]);
  const value = useMemo<AppThemeContextValue>(
    () => ({
      resolvedTheme,
      themePreference,
      themeTokens,
    }),
    [resolvedTheme, themePreference, themeTokens],
  );

  return (
    <AppThemeContext.Provider value={value}>
      <View className="flex-1 bg-page" style={themeVariables}>
        {children}
      </View>
    </AppThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
};

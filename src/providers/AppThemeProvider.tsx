/** Purpose: Resolve the app-wide theme from profile preference or system scheme and expose runtime tokens. */
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { View, useColorScheme as useSystemColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useColorScheme as useNativeWindColorScheme, vars } from "nativewind";

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

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export const AppThemeProvider = ({ children }: PropsWithChildren) => {
  const { profile, status } = useAuthSession();
  const systemColorScheme = useSystemColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const normalizedSystemColorScheme =
    systemColorScheme === "light" || systemColorScheme === "dark" ? systemColorScheme : undefined;
  const themePreference: ThemePreference =
    status === "signedIn"
      ? (profile?.preferences?.theme ?? USER_SEED.preferences.theme)
      : "system";
  const resolvedTheme = resolveThemePreference(themePreference, normalizedSystemColorScheme);
  const themeTokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);
  const themeVariables = useMemo(() => vars(buildThemeCssVariables(resolvedTheme)), [resolvedTheme]);

  useEffect(() => {
    setColorScheme(themePreference);
  }, [setColorScheme, themePreference]);

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

export const useAppTheme = () => {
  const context = useContext(AppThemeContext);

  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }

  return context;
};

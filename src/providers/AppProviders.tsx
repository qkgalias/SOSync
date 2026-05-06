/** Purpose: Compose the root providers needed by the Expo Router tree. */
import type { PropsWithChildren } from "react";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppThemeProvider } from "@/providers/AppThemeProvider";
import { NavigationSdkProvider } from "@/providers/NavigationSdkProvider";
import { SessionProvider } from "@/providers/SessionProvider";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SessionProvider>
      <AppThemeProvider>
        <SafeAreaProvider>
          <NavigationSdkProvider>
            <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
          </NavigationSdkProvider>
        </SafeAreaProvider>
      </AppThemeProvider>
    </SessionProvider>
  </GestureHandlerRootView>
);

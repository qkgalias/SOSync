/** Purpose: Compose the root providers needed by the Expo Router tree. */
import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { SessionProvider } from "@/providers/SessionProvider";

export const AppProviders = ({ children }: PropsWithChildren) => (
  <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
    <SafeAreaProvider>
      <SessionProvider>{children}</SessionProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

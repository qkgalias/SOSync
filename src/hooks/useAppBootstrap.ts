/** Purpose: Prepare splash handling, explicit emulator opt-in wiring, and root app readiness. */
import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { connectFirebaseEmulators } from "@/services/firebase";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useAppBootstrap = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    connectFirebaseEmulators();
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("sosync-alerts", {
        name: "SOSync Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      }).catch(() => undefined);
    }
    const timeout = setTimeout(() => setReady(true), 250);
    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  return ready;
};

/** Purpose: Boot the Expo Router tree with the shared providers and splash lifecycle. */
import "../global.css";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { AppProviders } from "@/providers/AppProviders";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { useNotificationLifecycle } from "@/hooks/useNotificationLifecycle";

const RootNavigator = () => {
  const ready = useAppBootstrap();
  useNotificationLifecycle(ready);

  if (!ready) {
    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
};

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
      <RootNavigator />
    </AppProviders>
  );
}

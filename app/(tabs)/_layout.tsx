/** Purpose: Render the main app tabs after onboarding is complete. */
import { Redirect, Tabs } from "expo-router";

import { PrototypeTabBar } from "@/components/PrototypeTabBar";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function TabsLayout() {
  const { isOnboardingComplete, status } = useAuthSession();

  if (status !== "signedIn" || !isOnboardingComplete) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      detachInactiveScreens={false}
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <PrototypeTabBar {...props} />}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
        }}
      />
      <Tabs.Screen
        name="hotlines"
        options={{
          title: "Hotlines",
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}

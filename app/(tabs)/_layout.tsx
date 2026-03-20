/** Purpose: Render the main app tabs after onboarding is complete. */
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";

import { useAuthSession } from "@/hooks/useAuthSession";

export default function TabsLayout() {
  const { isOnboardingComplete, status } = useAuthSession();

  if (status !== "signedIn" || !isOnboardingComplete) {
    return <Redirect href="/" />;
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1E5EFF",
        tabBarInactiveTintColor: "#7C8DA5",
        tabBarStyle: {
          height: 84,
          paddingBottom: 14,
          paddingTop: 10,
        },
      }}
    >
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="alarm-light" size={size} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="map-marker-radius" size={size} />,
        }}
      />
      <Tabs.Screen
        name="hotlines"
        options={{
          title: "Hotlines",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="phone-in-talk" size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="bell-badge" size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons color={color} name="account-circle" size={size} />,
        }}
      />
    </Tabs>
  );
}

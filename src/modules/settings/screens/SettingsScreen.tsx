/** Purpose: Let users tune app preferences without exposing raw OS permission state. */
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";

export default function SettingsScreen() {
  const { profile, saveProfile } = useAuthSession();

  const togglePreference = async (key: "disasterAlerts" | "sosAlerts" | "evacuationAlerts") => {
    await saveProfile({
      preferences: {
        theme: profile?.preferences.theme ?? "light",
        disasterAlerts: key === "disasterAlerts" ? !profile?.preferences.disasterAlerts : Boolean(profile?.preferences.disasterAlerts),
        sosAlerts: key === "sosAlerts" ? !profile?.preferences.sosAlerts : Boolean(profile?.preferences.sosAlerts),
        evacuationAlerts:
          key === "evacuationAlerts" ? !profile?.preferences.evacuationAlerts : Boolean(profile?.preferences.evacuationAlerts),
      },
    });
  };

  const toggleLocationSharing = async () => {
    await saveProfile({
      privacy: {
        locationSharingEnabled: !profile?.privacy.locationSharingEnabled,
        shareWhileUsingOnly: true,
        emergencyBroadcastEnabled: profile?.privacy.emergencyBroadcastEnabled ?? true,
      },
    });
  };

  return (
    <Screen title="Settings" subtitle="Control in-app privacy and emergency preferences without leaving the app.">
      <InfoCard title="Safety preferences" eyebrow="Notifications">
        <View className="gap-3">
          <Button
            label={`Disaster alerts: ${profile?.preferences.disasterAlerts ? "On" : "Off"}`}
            onPress={() => togglePreference("disasterAlerts")}
            variant="secondary"
          />
          <Button
            label={`SOS alerts: ${profile?.preferences.sosAlerts ? "On" : "Off"}`}
            onPress={() => togglePreference("sosAlerts")}
            variant="secondary"
          />
          <Button
            label={`Evacuation alerts: ${profile?.preferences.evacuationAlerts ? "On" : "Off"}`}
            onPress={() => togglePreference("evacuationAlerts")}
            variant="secondary"
          />
        </View>
      </InfoCard>
      <InfoCard title="Privacy controls" eyebrow="Location">
        <Text className="mb-4 text-sm leading-6 text-muted">
          OS permission state is handled natively. This toggle controls whether SOSync writes live location updates.
        </Text>
        <Button
          label={`Location sharing: ${profile?.privacy.locationSharingEnabled ? "On" : "Off"}`}
          onPress={toggleLocationSharing}
        />
      </InfoCard>
    </Screen>
  );
}

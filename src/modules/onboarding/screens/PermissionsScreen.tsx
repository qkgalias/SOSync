/** Purpose: Confirm privacy choices and native permissions before entering the app. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { notificationService } from "@/services/notificationService";
import { requestLocationPermission, requestNotificationPermission } from "@/utils/permissions";

export default function PermissionsScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);

    try {
      await saveProfile({
        privacy: {
          locationSharingEnabled: locationGranted,
          shareWhileUsingOnly: true,
          emergencyBroadcastEnabled: true,
        },
        onboarding: {
          currentStep: "complete",
          profileComplete: true,
          circleComplete: true,
          permissionsComplete: true,
        },
        preferences: {
          theme: profile?.preferences.theme ?? "light",
          disasterAlerts: notificationsGranted,
          sosAlerts: notificationsGranted,
          evacuationAlerts: notificationsGranted,
        },
      });
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Confirm permissions" subtitle="You stay in control of both location sharing and emergency alerts.">
      <InfoCard title="Location access" eyebrow={locationGranted ? "Granted" : "Pending"}>
        <Text className="mb-4 text-sm leading-6 text-muted">
          Location stays inside your trusted circles and is only shared while the app is in use during this first
          foundation release.
        </Text>
        <Button
          label={locationGranted ? "Location enabled" : "Allow location"}
          onPress={async () => {
            const status = await requestLocationPermission();
            setLocationGranted(status === "granted");
          }}
          variant={locationGranted ? "secondary" : "primary"}
        />
      </InfoCard>
      <InfoCard title="Push notifications" eyebrow={notificationsGranted ? "Granted" : "Pending"}>
        <Text className="mb-4 text-sm leading-6 text-muted">
          {Platform.OS === "ios"
            ? "SOSync will keep your iPhone notification permissions ready, while full background remote delivery is finalized when APNs is configured for release."
            : "Disaster alerts, SOS notifications, and evacuation warnings will only be routed to the circles you belong to."}
        </Text>
        <Button
          label={notificationsGranted ? "Notifications enabled" : "Allow notifications"}
          onPress={async () => {
            const status = await requestNotificationPermission();
            const granted = Boolean(status);
            setNotificationsGranted(granted);
            if (granted && authUser?.uid) {
              await notificationService.registerDevice(authUser.uid).catch(() => undefined);
            }
          }}
          variant={notificationsGranted ? "secondary" : "primary"}
        />
      </InfoCard>
      <View className="mt-2">
        <Button label="Finish onboarding" loading={loading} onPress={handleFinish} />
      </View>
    </Screen>
  );
}

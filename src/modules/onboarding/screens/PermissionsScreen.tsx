/** Purpose: Confirm native permissions and first-run safety defaults before entering the app. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Platform, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { notificationService } from "@/services/notificationService";
import { USER_SEED } from "@/utils/constants";
import { requestLocationPermission, requestNotificationPermission } from "@/utils/permissions";

export default function PermissionsScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const profilePreferences = profile?.preferences ?? USER_SEED.preferences;
  const profilePrivacy = profile?.privacy ?? USER_SEED.privacy;
  const profileSafety = profile?.safety ?? USER_SEED.safety;
  const [locationGranted, setLocationGranted] = useState(Boolean(profilePrivacy.locationSharingEnabled));
  const [notificationsGranted, setNotificationsGranted] = useState(Boolean(profilePreferences.disasterAlerts));
  const [shareStatusEnabled, setShareStatusEnabled] = useState(Boolean(profileSafety.shareStatusEnabled));
  const [autoShareLocationOnSos, setAutoShareLocationOnSos] = useState(Boolean(profileSafety.autoShareLocationOnSos));
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
          theme: profilePreferences.theme,
          disasterAlerts: notificationsGranted,
          sosAlerts: notificationsGranted,
          evacuationAlerts: notificationsGranted,
        },
        safety: {
          shareStatusEnabled,
          autoShareLocationOnSos,
          autoCallHotlineOnSos: profileSafety.autoCallHotlineOnSos,
        },
      });
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Permission & Privacy" centerTitle contentClassName="pb-10">
      <Text className="pt-6 text-center text-[15px] leading-6 text-muted">
        You stay in control. SOSync only shares with your trusted circle, and every permission can be changed later.
      </Text>
      <View className="mt-8">
        <SettingsRow
          title="Location Access"
          subtitle="Needed for live map positioning and SOS coordinates."
          icon={<MaterialCommunityIcons color="#7B2C28" name="map-marker-radius-outline" size={22} />}
          trailingText={locationGranted ? "Allowed" : "Pending"}
          onPress={async () => {
            const status = await requestLocationPermission();
            setLocationGranted(status === "granted");
          }}
        />
        <SettingsRow
          title="Notifications"
          subtitle={
            Platform.OS === "ios"
              ? "Prepare device alerts while iOS remote push remains APNs-dependent."
              : "Receive disaster alerts and SOS activity from your circle."
          }
          icon={<MaterialCommunityIcons color="#7B2C28" name="bell-outline" size={22} />}
          trailingText={notificationsGranted ? "Allowed" : "Pending"}
          onPress={async () => {
            const status = await requestNotificationPermission();
            const granted = Boolean(status);
            setNotificationsGranted(granted);
            if (granted && authUser?.uid) {
              await notificationService.registerDevice(authUser.uid).catch(() => undefined);
            }
          }}
        />
      </View>
      <Text className="mb-3 mt-8 text-[12px] uppercase tracking-[0.18em] text-muted">Safety Defaults</Text>
      <SettingsRow
        title="Share preset status"
        subtitle="Let your circle see if you are safe, need help, or need evacuation."
        toggleValue={shareStatusEnabled}
        onToggleChange={setShareStatusEnabled}
      />
      <SettingsRow
        title="Auto-share location on SOS"
        subtitle="Attach your latest coordinates when you trigger an emergency."
        toggleValue={autoShareLocationOnSos}
        onToggleChange={setAutoShareLocationOnSos}
      />
      <Button label="Finish" loading={loading} onPress={handleFinish} className="mt-6" />
    </Screen>
  );
}

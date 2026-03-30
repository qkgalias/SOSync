/** Purpose: Let signed-in users manage device permissions and core sharing defaults after onboarding. */
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { notificationService } from "@/services/notificationService";
import { USER_SEED } from "@/utils/constants";
import { goBackOrReplace } from "@/utils/helpers";
import { requestLocationPermission, requestNotificationPermission } from "@/utils/permissions";

export default function PermissionsSettingsScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const profilePreferences = profile?.preferences ?? USER_SEED.preferences;
  const profilePrivacy = profile?.privacy ?? USER_SEED.privacy;
  const profileSafety = profile?.safety ?? USER_SEED.safety;
  const [locationGranted, setLocationGranted] = useState(Boolean(profilePrivacy.locationSharingEnabled));
  const [notificationsGranted, setNotificationsGranted] = useState(Boolean(profilePreferences.disasterAlerts));
  const [shareStatusEnabled, setShareStatusEnabled] = useState(Boolean(profileSafety.shareStatusEnabled));
  const [autoShareLocationOnSos, setAutoShareLocationOnSos] = useState(Boolean(profileSafety.autoShareLocationOnSos));
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLocationToggle = async (nextValue: boolean) => {
    if (!nextValue) {
      setLocationGranted(false);
      return;
    }

    const status = await requestLocationPermission();
    setLocationGranted(status === "granted");
  };

  const handleNotificationsToggle = async (nextValue: boolean) => {
    if (!nextValue) {
      setNotificationsGranted(false);
      return;
    }

    const status = await requestNotificationPermission();
    const granted = Boolean(status);
    setNotificationsGranted(granted);
    if (granted && authUser?.uid) {
      await notificationService.registerDevice(authUser.uid).catch(() => undefined);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage("");

    try {
      await saveProfile({
        preferences: {
          theme: profilePreferences.theme,
          disasterAlerts: notificationsGranted,
          sosAlerts: notificationsGranted,
          evacuationAlerts: notificationsGranted,
        },
        privacy: {
          emergencyBroadcastEnabled: true,
          locationSharingEnabled: locationGranted,
          shareWhileUsingOnly: true,
        },
        safety: {
          autoCallHotlineOnSos: profileSafety.autoCallHotlineOnSos,
          autoShareLocationOnSos,
          shareStatusEnabled,
        },
      });
      setMessage("Permissions and sharing preferences updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update permissions right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Permissions"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <Text className="mb-3 mt-7 text-[12px] uppercase tracking-[0.18em] text-muted">Device access</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="map-marker-radius-outline" size={22} />}
          onToggleChange={(value) => void handleLocationToggle(value)}
          subtitle="Needed for live map positioning and the coordinates attached to SOS."
          title="Location access"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={locationGranted}
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="bell-outline" size={22} />}
          onToggleChange={(value) => void handleNotificationsToggle(value)}
          subtitle={
            Platform.OS === "ios"
              ? "Prepare device alerts while iOS remote push remains APNs-dependent."
              : "Receive disaster alerts and SOS activity from your trusted circle."
          }
          title="Notifications"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={notificationsGranted}
        />
      </View>

      <Text className="mb-3 mt-8 text-[12px] uppercase tracking-[0.18em] text-muted">Emergency defaults</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="account-heart-outline" size={22} />}
          onToggleChange={setShareStatusEnabled}
          subtitle="Let your circle see if you are safe, need help, or need evacuation."
          title="Share preset status"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={shareStatusEnabled}
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="crosshairs-gps" size={22} />}
          onToggleChange={setAutoShareLocationOnSos}
          subtitle="Attach your latest coordinates whenever you trigger an SOS."
          title="Auto-share location on SOS"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={autoShareLocationOnSos}
        />
      </View>

      <Button
        className="mt-4 rounded-full bg-profileAccent"
        label="Save preferences"
        loading={loading}
        onPress={handleSave}
        textClassName="text-white"
      />
      {message ? <Text className="mt-3 text-sm text-profileAccent">{message}</Text> : null}
    </Screen>
  );
}

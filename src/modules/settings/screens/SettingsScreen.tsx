/** Purpose: Let users manage privacy, data guidance, and trusted-circle sharing controls without legacy visibility tools. */
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { USER_SEED } from "@/utils/constants";
import { goBackOrReplace } from "@/utils/helpers";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useAuthSession();
  const [message, setMessage] = useState("");

  const profilePrivacy = profile?.privacy ?? USER_SEED.privacy;
  const profileSafety = profile?.safety ?? USER_SEED.safety;

  return (
    <Screen
      title="Privacy & Safety"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <Text className="mb-3 mt-7 text-[12px] uppercase tracking-[0.18em] text-muted">Sharing controls</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="map-marker-radius-outline" size={22} />}
          onToggleChange={(value) =>
            saveProfile({
              privacy: {
                emergencyBroadcastEnabled: profilePrivacy.emergencyBroadcastEnabled,
                locationSharingEnabled: value,
                shareWhileUsingOnly: true,
              },
            })
              .then(() => setMessage("Location sharing preference updated."))
              .catch((error) => {
                setMessage(error instanceof Error ? error.message : "Unable to update location sharing.");
              })
          }
          subtitle="Control whether your live map updates are shared with your trusted circle."
          title="Live location sharing"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={Boolean(profilePrivacy.locationSharingEnabled)}
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="crosshairs-gps" size={22} />}
          onToggleChange={(value) =>
            saveProfile({
              safety: {
                autoCallHotlineOnSos: profileSafety.autoCallHotlineOnSos,
                autoShareLocationOnSos: value,
                shareStatusEnabled: profileSafety.shareStatusEnabled,
              },
            })
              .then(() => setMessage("SOS location sharing updated."))
              .catch((error) => {
                setMessage(error instanceof Error ? error.message : "Unable to update SOS location sharing.");
              })
          }
          subtitle="Attach your latest coordinates whenever SOS is triggered."
          title="Auto-share location on SOS"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={Boolean(profileSafety.autoShareLocationOnSos)}
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="account-heart-outline" size={22} />}
          onToggleChange={(value) =>
            saveProfile({
              safety: {
                autoCallHotlineOnSos: profileSafety.autoCallHotlineOnSos,
                autoShareLocationOnSos: profileSafety.autoShareLocationOnSos,
                shareStatusEnabled: value,
              },
            })
              .then(() => setMessage("Status sharing preference updated."))
              .catch((error) => {
                setMessage(error instanceof Error ? error.message : "Unable to update status sharing.");
              })
          }
          subtitle="Let your circle see whether you are safe, need help, or need evacuation."
          title="Shared safety status"
          toggleActiveColor={PROFILE_ACCENT}
          toggleValue={Boolean(profileSafety.shareStatusEnabled)}
        />
      </View>

      <Text className="mb-3 mt-8 text-[12px] uppercase tracking-[0.18em] text-muted">Privacy & security</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="shield-check-outline" size={22} />}
          subtitle="SOSync keeps profile, circle, alert, and location data scoped to authenticated sessions and trusted-circle access rules."
          title="Data security"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="shield-lock-outline" size={22} />}
          subtitle="Your trusted circle is your support model. Separate trusted-contact and auto-call hotline flows are no longer surfaced."
          title="Privacy management"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="file-document-outline" size={22} />}
          subtitle="This build stores the profile, circle, and emergency details required for SOSync to coordinate alerts and SOS activity."
          title="Privacy policy"
        />
      </View>

      {message ? <Text className="mt-3 text-sm text-profileAccent">{message}</Text> : null}
    </Screen>
  );
}

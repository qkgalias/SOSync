/** Purpose: Let users manage privacy, data guidance, and trusted-circle sharing controls without legacy visibility tools. */
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { USER_SEED } from "@/utils/constants";
import { goBackOrReplace } from "@/utils/helpers";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, saveProfile } = useAuthSession();
  const { themeTokens } = useAppTheme();
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
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="map-marker-radius-outline" size={22} />}
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
          toggleActiveColor={themeTokens.accentPrimary}
          toggleValue={Boolean(profilePrivacy.locationSharingEnabled)}
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="crosshairs-gps" size={22} />}
          onToggleChange={(value) =>
            saveProfile({
              safety: {
                autoCallHotlineOnSos: profileSafety.autoCallHotlineOnSos,
                autoShareLocationOnSos: value,
              },
            })
              .then(() => setMessage("SOS location sharing updated."))
              .catch((error) => {
                setMessage(error instanceof Error ? error.message : "Unable to update SOS location sharing.");
              })
          }
          subtitle="Attach your latest coordinates whenever SOS is triggered."
          title="Auto-share location on SOS"
          toggleActiveColor={themeTokens.accentPrimary}
          toggleValue={Boolean(profileSafety.autoShareLocationOnSos)}
        />
      </View>

      <Text className="mb-3 mt-8 text-[12px] uppercase tracking-[0.18em] text-muted">Privacy & security</Text>
      <View>
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="shield-check-outline" size={22} />}
          subtitle="SOSync keeps profile, circle, alert, and location data scoped to authenticated sessions and trusted-circle access rules."
          title="Data security"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="shield-lock-outline" size={22} />}
          subtitle="Your trusted circle is your support model. Separate trusted-contact and auto-call hotline flows are no longer surfaced."
          title="Privacy management"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name="file-document-outline" size={22} />}
          subtitle="This build stores the profile, circle, and emergency details required for SOSync to coordinate alerts and SOS activity."
          title="Privacy policy"
        />
      </View>

      {message ? <Text className="mt-3 text-sm text-accent">{message}</Text> : null}
    </Screen>
  );
}

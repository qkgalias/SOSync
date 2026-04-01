/** Purpose: Provide a single signed-in hub for the four core profile settings destinations. */
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { goBackOrReplace } from "@/utils/helpers";

export default function GeneralScreen() {
  const router = useRouter();

  return (
    <Screen
      title="Settings"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/(tabs)/profile")} />}
      contentClassName="pb-10"
    >
      <View className="mt-7">
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="shield-check-outline" size={23} />}
          onPress={() => router.push("/permissions" as never)}
          subtitle="Control how the app accesses your information"
          subtitleClassName="text-[13px] leading-5 text-muted"
          titleClassName="text-[18px] font-medium text-ink"
          title="Permissions"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="account-circle-outline" size={23} />}
          onPress={() => router.push("/account" as never)}
          subtitle="Manage your profile, circles, and security settings"
          subtitleClassName="text-[13px] leading-5 text-muted"
          titleClassName="text-[18px] font-medium text-ink"
          title="Account"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="shield-lock-outline" size={23} />}
          onPress={() => router.push("/settings" as never)}
          subtitle="Control how your information is shared"
          subtitleClassName="text-[13px] leading-5 text-muted"
          titleClassName="text-[18px] font-medium text-ink"
          title="Privacy & Safety"
        />
        <SettingsRow
          className="rounded-[22px]"
          icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="help-circle-outline" size={23} />}
          onPress={() => router.push("/help" as never)}
          subtitle="Learn more about the app and get support"
          subtitleClassName="text-[13px] leading-5 text-muted"
          titleClassName="text-[18px] font-medium text-ink"
          title="Help & About"
        />
      </View>
    </Screen>
  );
}

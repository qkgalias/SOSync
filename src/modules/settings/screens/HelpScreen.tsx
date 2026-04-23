/** Purpose: Provide the signed-in help and about overview with dedicated support, FAQ, and app-info routes. */
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { HelpActionTile } from "@/modules/settings/components/HelpActionTile";
import { HELP_OVERVIEW_CONTENT } from "@/modules/settings/helpAboutContent";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const version = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

  return (
    <Screen
      title="Help and About"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <Text className="mb-3 pt-4 text-[12px] uppercase tracking-[0.08em] text-muted">Support &amp; Resources</Text>
      <View>
        <SettingsRow
          className="rounded-[18px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name={HELP_OVERVIEW_CONTENT.emergencyUsage.iconName} size={22} />}
          onPress={() => router.push("/help/emergency-usage" as never)}
          subtitle={HELP_OVERVIEW_CONTENT.emergencyUsage.subtitle}
          title={HELP_OVERVIEW_CONTENT.emergencyUsage.title}
        />
        <SettingsRow
          className="rounded-[18px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name={HELP_OVERVIEW_CONTENT.faqs.iconName} size={22} />}
          onPress={() => router.push("/help/faqs" as never)}
          subtitle={HELP_OVERVIEW_CONTENT.faqs.subtitle}
          title={HELP_OVERVIEW_CONTENT.faqs.title}
        />
      </View>

      <View className="mb-6 mt-1 flex-row gap-3">
        <HelpActionTile
          iconName={HELP_OVERVIEW_CONTENT.contactSupport.iconName}
          onPress={() => router.push("/help/contact-support" as never)}
          subtitle={HELP_OVERVIEW_CONTENT.contactSupport.subtitle}
          title={HELP_OVERVIEW_CONTENT.contactSupport.title}
        />
        <HelpActionTile
          iconName={HELP_OVERVIEW_CONTENT.reportProblem.iconName}
          onPress={() => router.push("/help/report-problem" as never)}
          subtitle={HELP_OVERVIEW_CONTENT.reportProblem.subtitle}
          title={HELP_OVERVIEW_CONTENT.reportProblem.title}
        />
      </View>

      <Text className="mb-3 text-[12px] uppercase tracking-[0.08em] text-muted">About Application</Text>
      <View>
        <SettingsRow
          className="rounded-[18px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name={HELP_OVERVIEW_CONTENT.about.iconName} size={22} />}
          onPress={() => router.push("/help/about" as never)}
          subtitle={HELP_OVERVIEW_CONTENT.about.subtitle}
          title={HELP_OVERVIEW_CONTENT.about.title}
        />
        <SettingsRow
          className="rounded-[18px]"
          icon={<MaterialCommunityIcons color={themeTokens.accentPrimary} name={HELP_OVERVIEW_CONTENT.appVersion.iconName} size={22} />}
          showChevron={false}
          title={HELP_OVERVIEW_CONTENT.appVersion.title}
          trailingText={version}
        />
      </View>
    </Screen>
  );
}

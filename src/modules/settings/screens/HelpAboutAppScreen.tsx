import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { HelpInfoCard } from "@/modules/settings/components/HelpInfoCard";
import { ABOUT_APP_CONTENT } from "@/modules/settings/helpAboutContent";
import { getResolvedAppVersion, getResolvedBuildLabel } from "@/modules/settings/helpAboutUtils";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpAboutAppScreen() {
  const router = useRouter();
  const runtimeLabel =
    typeof Constants.executionEnvironment === "string" ? Constants.executionEnvironment : "Standalone";

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/help")} />}
      subtitle={ABOUT_APP_CONTENT.subtitle}
      title={ABOUT_APP_CONTENT.title}
    >
      <View className="mt-4">
        {ABOUT_APP_CONTENT.cards.map((card) => (
          <HelpInfoCard key={card.title} {...card} />
        ))}

        <View className="rounded-[18px] bg-panel px-4 py-4">
          <Text className="text-[18px] font-medium leading-[22px] text-ink">Version &amp; Build Information</Text>
          <View className="mt-3">
            <Text className="text-[14px] font-medium text-ink">App Information</Text>
            <View className="mt-3">
              <Text className="text-[12px] uppercase tracking-[0.08em] text-muted">Version:</Text>
              <Text className="mt-1 text-[14px] text-ink">{getResolvedAppVersion()}</Text>
            </View>
            <View className="mt-3">
              <Text className="text-[12px] uppercase tracking-[0.08em] text-muted">Build:</Text>
              <Text className="mt-1 text-[14px] text-ink">{getResolvedBuildLabel()}</Text>
            </View>
            <View className="mt-3">
              <Text className="text-[12px] uppercase tracking-[0.08em] text-muted">Runtime:</Text>
              <Text className="mt-1 text-[14px] text-ink">{runtimeLabel}</Text>
            </View>
          </View>
        </View>
      </View>
    </Screen>
  );
}

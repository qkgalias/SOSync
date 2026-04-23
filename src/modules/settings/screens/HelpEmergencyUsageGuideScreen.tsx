import { useRouter } from "expo-router";
import { View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { HelpInfoCard } from "@/modules/settings/components/HelpInfoCard";
import { EMERGENCY_USAGE_GUIDE_CONTENT } from "@/modules/settings/helpAboutContent";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpEmergencyUsageGuideScreen() {
  const router = useRouter();

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/help")} />}
      subtitle={EMERGENCY_USAGE_GUIDE_CONTENT.subtitle}
      title={EMERGENCY_USAGE_GUIDE_CONTENT.title}
    >
      <View className="mt-4">
        {EMERGENCY_USAGE_GUIDE_CONTENT.cards.map((card) => (
          <HelpInfoCard key={card.title} {...card} />
        ))}
      </View>
    </Screen>
  );
}

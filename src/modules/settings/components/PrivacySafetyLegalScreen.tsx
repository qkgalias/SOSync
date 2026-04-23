import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { PrivacySafetyInfoCard } from "@/modules/settings/components/PrivacySafetyInfoCard";
import {
  PRIVACY_POLICY_CONTENT,
  TERMS_AND_CONDITIONS_CONTENT,
} from "@/modules/settings/privacySafetyContent";
import { goBackOrReplace } from "@/utils/helpers";

type LegalTab = "privacy" | "terms";

const LEGAL_TABS: Array<{ key: LegalTab; label: string; route: string }> = [
  { key: "privacy", label: "Privacy Policy", route: "/settings/privacy-policy" },
  { key: "terms", label: "Terms of Use", route: "/settings/terms" },
];

export const PrivacySafetyLegalScreen = ({ activeTab }: { activeTab: LegalTab }) => {
  const router = useRouter();
  const content = activeTab === "privacy" ? PRIVACY_POLICY_CONTENT : TERMS_AND_CONDITIONS_CONTENT;

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/settings")} />}
      subtitle={content.subtitle}
      title={content.title}
    >
      <View className="mt-3 self-start rounded-full bg-panel p-1">
        <View className="flex-row items-center">
          {LEGAL_TABS.map((tab) => {
            const isActive = tab.key === activeTab;

            return (
              <Pressable
                key={tab.key}
                className={isActive ? "rounded-full bg-primary px-4 py-2" : "rounded-full px-4 py-2"}
                disabled={isActive}
                onPress={() => router.replace(tab.route as never)}
              >
                <Text className={isActive ? "text-[12px] font-semibold text-white" : "text-[12px] font-medium text-muted"}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="mt-6">
        {content.cards.map((card) => (
          <PrivacySafetyInfoCard key={card.title} {...card} />
        ))}
      </View>
    </Screen>
  );
};

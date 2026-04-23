import { View } from "react-native";
import { useRouter } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { PrivacySafetyInfoCard } from "@/modules/settings/components/PrivacySafetyInfoCard";
import type { PrivacySafetyCardContent } from "@/modules/settings/privacySafetyContent";
import { goBackOrReplace } from "@/utils/helpers";

type PrivacySafetyInfoListScreenProps = {
  title: string;
  subtitle: string;
  cards: PrivacySafetyCardContent[];
};

export const PrivacySafetyInfoListScreen = ({
  cards,
  subtitle,
  title,
}: PrivacySafetyInfoListScreenProps) => {
  const router = useRouter();

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/settings")} />}
      subtitle={subtitle}
      title={title}
    >
      <View className="mt-2">
        {cards.map((card) => (
          <PrivacySafetyInfoCard key={card.title} {...card} />
        ))}
      </View>
    </Screen>
  );
};

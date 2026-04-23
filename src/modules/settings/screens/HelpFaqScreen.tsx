import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Screen } from "@/components/Screen";
import { HelpAccordionItem } from "@/modules/settings/components/HelpAccordionItem";
import { HELP_FAQ_ITEMS } from "@/modules/settings/helpAboutContent";
import { goBackOrReplace } from "@/utils/helpers";

export default function HelpFaqScreen() {
  const router = useRouter();
  const [expandedQuestion, setExpandedQuestion] = useState(HELP_FAQ_ITEMS[0]?.question ?? "");

  return (
    <Screen
      contentClassName="pb-10"
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/help")} />}
      subtitle="Find quick answers to common questions about SOSync"
      title="Frequently Asked Questions"
    >
      <View className="mt-4">
        {HELP_FAQ_ITEMS.map((item) => {
          const expanded = item.question === expandedQuestion;

          return (
            <HelpAccordionItem
              key={item.question}
              answer={item.answer}
              expanded={expanded}
              question={item.question}
              onPress={() => setExpandedQuestion(expanded ? "" : item.question)}
            />
          );
        })}
        {!HELP_FAQ_ITEMS.length ? <Text className="text-base text-muted">No FAQs are available yet.</Text> : null}
      </View>
    </Screen>
  );
}

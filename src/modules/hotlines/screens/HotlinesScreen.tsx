/** Purpose: List regional emergency hotlines with one-tap calling actions. */
import { Linking, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { useHotlines } from "@/hooks/useHotlines";
import { toCallHref } from "@/utils/helpers";

export default function HotlinesScreen() {
  const hotlines = useHotlines();

  return (
    <Screen title="Emergency hotlines" subtitle="Keep national response numbers ready even when the map is busy.">
      {hotlines.map((hotline) => (
        <InfoCard key={hotline.hotlineId} title={hotline.name} eyebrow={hotline.region}>
          <View className="flex-row items-center justify-between">
            <Text className="text-base text-muted">{hotline.phone}</Text>
            <View className="w-28">
              <Button label="Call now" onPress={() => Linking.openURL(toCallHref(hotline.phone))} />
            </View>
          </View>
        </InfoCard>
      ))}
    </Screen>
  );
}

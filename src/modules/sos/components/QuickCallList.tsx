/** Purpose: Present emergency hotline shortcuts near the SOS action. */
import { Linking, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { toCallHref } from "@/utils/helpers";

type Hotline = {
  hotlineId: string;
  name: string;
  phone: string;
  region: string;
};

export const QuickCallList = ({ hotlines }: { hotlines: Hotline[] }) => (
  <InfoCard title="Quick call" eyebrow="Hotlines">
    {hotlines.map((hotline) => (
      <View key={hotline.hotlineId} className="mb-3 flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-base font-semibold text-ink">{hotline.name}</Text>
          <Text className="mt-1 text-sm text-muted">{hotline.phone}</Text>
        </View>
        <View className="w-28">
          <Button label="Call" onPress={() => Linking.openURL(toCallHref(hotline.phone))} variant="secondary" />
        </View>
      </View>
    ))}
  </InfoCard>
);

/** Purpose: List regional emergency hotlines and open the system dialer after a confirmation step. */
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Screen } from "@/components/Screen";
import { useHotlines } from "@/hooks/useHotlines";
import { toCallHref } from "@/utils/helpers";

export default function HotlinesScreen() {
  const hotlines = useHotlines();

  const handleHotlinePress = (hotlineName: string, hotlinePhone: string) => {
    Alert.alert(hotlineName, `${hotlinePhone}\n\nCall this hotline now?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Call",
        onPress: () => {
          void Linking.openURL(toCallHref(hotlinePhone));
        },
      },
    ]);
  };

  return (
    <Screen contentClassName="pb-8">
      <View className="items-center px-2 pt-5">
        <Text className="text-[20px] font-normal text-ink">Emergency Hotlines</Text>
        <Text className="mt-2 max-w-[240px] text-center text-[12px] leading-5 text-muted">
          Call for help when you need immediate assistance.
        </Text>
      </View>

      <View className="mt-6 border-t border-[#A8A29E] pt-6">
        {hotlines.map((hotline) => (
          <Pressable
            key={hotline.hotlineId}
            accessibilityRole="button"
            className="mb-4 flex-row items-center rounded-[24px] bg-[#E7E5E4] px-5 py-4"
            onPress={() => handleHotlinePress(hotline.name, hotline.phone)}
          >
            <View className="mr-4 h-12 w-12 items-center justify-center rounded-full bg-ink">
              <MaterialCommunityIcons color="#FFFFFF" name="information-outline" size={26} />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-medium leading-6 text-ink">{hotline.name}</Text>
              <Text className="mt-1 text-[16px] leading-6 text-ink">{hotline.phone}</Text>
            </View>
            <MaterialCommunityIcons color="#111111" name="chevron-right" size={30} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

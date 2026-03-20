/** Purpose: Catch unmatched routes and direct users back into the main SOSync flow. */
import { Link } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";

export default function NotFoundScreen() {
  return (
    <Screen title="Route not found" subtitle="This screen is outside the SOSync navigation tree.">
      <View className="rounded-card border border-line bg-surface p-5">
        <Text className="mb-4 text-base leading-7 text-muted">
          Use the button below to head back to the live disaster map.
        </Text>
        <Link asChild href="/">
          <View>
            <Button label="Return home" onPress={() => undefined} />
          </View>
        </Link>
      </View>
    </Screen>
  );
}

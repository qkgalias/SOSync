/** Purpose: Render the Home sheet empty state when no trusted-circle contacts are available. */
import { Text, View } from "react-native";

import type { HomeMapPalette } from "@/modules/map/homeMapTheme";

type HomeContactsEmptyStateProps = {
  palette: HomeMapPalette;
};

export const HomeContactsEmptyState = ({ palette }: HomeContactsEmptyStateProps) => (
  <View className="px-5 py-4">
    <Text className="text-sm leading-6" style={{ color: palette.sheetTextMuted }}>
      Join or create a trusted circle to see live contact markers and quick focusing.
    </Text>
  </View>
);

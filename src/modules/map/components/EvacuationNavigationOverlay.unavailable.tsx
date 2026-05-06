/** Purpose: Explain when the installed native dev client lacks Google Navigation SDK support. */
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type { EvacuationCenter, EvacuationTravelMode, HomeMapAppearance, MapCoordinate } from "@/types";

type EvacuationNavigationOverlayProps = {
  appearance: HomeMapAppearance;
  center: EvacuationCenter | null;
  currentLocation: MapCoordinate | null;
  onClose: () => void;
  onTravelModeChange: (travelMode: EvacuationTravelMode) => void;
  selectedTravelMode: EvacuationTravelMode;
};

export const EvacuationNavigationOverlay = ({
  center,
  onClose,
}: EvacuationNavigationOverlayProps) => {
  if (!center) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Pressable
          accessibilityRole="button"
          style={styles.closeButton}
          onPress={onClose}
        >
          <MaterialCommunityIcons color="#5C1515" name="chevron-left" size={26} />
        </Pressable>
        <Text style={styles.title}>Rebuild Android dev build</Text>
        <Text style={styles.body}>
          This installed app does not include Google Navigation SDK yet. Run{" "}
          <Text style={styles.code}>npm run android</Text>
          {" "}once on this phone, then keep using{" "}
          <Text style={styles.code}>npm run start:clear</Text>
          {" "}for JS updates.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: "#6A6767",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    marginHorizontal: 20,
    padding: 20,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#F8F2EC",
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    marginBottom: 14,
    width: 44,
  },
  code: {
    fontFamily: "monospace",
    fontWeight: "700",
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    justifyContent: "center",
  },
  title: {
    color: "#2E2C2C",
    fontSize: 20,
    fontWeight: "700",
  },
});

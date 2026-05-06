/** Purpose: Resolve the correct map implementation without importing native map modules on web. */
import { Platform } from "react-native";

export type { MapOverviewHandle } from "./MapOverview.native";

const resolveMapOverview = () => {
  if (Platform.OS === "web") {
    return require("./MapOverview.web").MapOverview;
  }

  try {
    return require("./MapOverview.native").MapOverview;
  } catch (error) {
    console.warn(
      "Rebuild Android dev build: Google Navigation SDK native module is missing.",
      error,
    );
    return require("./MapOverview.web").MapOverview;
  }
};

export const MapOverview = resolveMapOverview();

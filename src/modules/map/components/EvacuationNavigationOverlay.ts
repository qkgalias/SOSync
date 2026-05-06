/** Purpose: Resolve the native Google Navigation overlay without loading native modules on web. */
import { Platform } from "react-native";

const resolveEvacuationNavigationOverlay = () => {
  if (Platform.OS === "web") {
    return require("./EvacuationNavigationOverlay.web").EvacuationNavigationOverlay;
  }

  try {
    return require("./EvacuationNavigationOverlay.native").EvacuationNavigationOverlay;
  } catch (error) {
    console.warn(
      "Rebuild Android dev build: Google Navigation SDK native module is missing.",
      error,
    );
    return require("./EvacuationNavigationOverlay.unavailable").EvacuationNavigationOverlay;
  }
};

export const EvacuationNavigationOverlay = resolveEvacuationNavigationOverlay();

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
      "App build is missing Google Navigation SDK native module support.",
      error,
    );
    return require("./EvacuationNavigationOverlay.unavailable").EvacuationNavigationOverlay;
  }
};

export const EvacuationNavigationOverlay = resolveEvacuationNavigationOverlay();

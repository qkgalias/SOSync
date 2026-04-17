/** Purpose: Provide a stable import path for the platform-specific flood mini-map implementation. */
import { Platform } from "react-native";

const implementation =
  Platform.OS === "web"
    ? require("@/modules/map/components/FloodMiniMap.web")
    : require("@/modules/map/components/FloodMiniMap.native");

export const FloodMiniMap = implementation.FloodMiniMap as typeof import("@/modules/map/components/FloodMiniMap.web").FloodMiniMap;

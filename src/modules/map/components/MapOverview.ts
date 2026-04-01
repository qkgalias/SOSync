/** Purpose: Resolve the correct map implementation without importing native map modules on web. */
import { Platform } from "react-native";

export type { MapOverviewHandle } from "./MapOverview.native";

export const MapOverview =
  Platform.OS === "web"
    ? require("./MapOverview.web").MapOverview
    : require("./MapOverview.native").MapOverview;

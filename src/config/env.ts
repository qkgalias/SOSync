/** Purpose: Expose runtime-safe Expo extras to the app shell and services. */
import Constants from "expo-constants";

type RuntimeEnv = {
  appEnv: string;
  defaultRegion: string;
  functionsRegion: string;
  firebaseProjectId: string;
  googleMapsAndroidApiKey: string;
  googleMapsIosApiKey: string;
  easProjectId: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

export const env: RuntimeEnv = {
  appEnv: String(extra.appEnv ?? "development"),
  defaultRegion: String(extra.defaultRegion ?? "PH"),
  functionsRegion: String(extra.functionsRegion ?? "asia-southeast1"),
  firebaseProjectId: String(extra.firebaseProjectId ?? "demo-sosync"),
  googleMapsAndroidApiKey: String(extra.googleMapsAndroidApiKey ?? ""),
  googleMapsIosApiKey: String(extra.googleMapsIosApiKey ?? ""),
  easProjectId: String(
    (extra.eas as { projectId?: string } | undefined)?.projectId ?? "",
  ),
};

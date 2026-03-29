/** Purpose: Resolve one consistent backend mode for Firebase SDK traffic, HTTP API traffic, and demo fallback policy. */
import * as Device from "expo-device";
import { NativeModules, Platform } from "react-native";

import { env } from "@/config/env";

export type BackendMode = "live" | "emulator" | "demo";
export type FirebaseClientMode = "firebase" | "demo";

type EmulatorHostInput = {
  overrideHost?: string;
  platform: string;
  isPhysicalDevice: boolean;
  scriptURL?: string | null;
};

type BackendModeInput = {
  appEnv: string;
  firebaseProjectId: string;
  useFirebaseEmulators: boolean;
};

export const parseDevelopmentHost = (scriptURL?: string | null) => {
  if (!scriptURL) {
    return null;
  }

  const match = scriptURL.match(/^[a-z]+:\/\/([^/:?#]+)(?::\d+)?/i);
  return match?.[1] ?? null;
};

export const resolveFirebaseEmulatorHost = ({
  overrideHost,
  platform,
  isPhysicalDevice,
  scriptURL,
}: EmulatorHostInput) => {
  const sanitizedOverride = overrideHost?.trim();
  if (sanitizedOverride) {
    return sanitizedOverride;
  }

  if (!isPhysicalDevice && platform === "android") {
    return "10.0.2.2";
  }

  if (!isPhysicalDevice && platform === "ios") {
    return "127.0.0.1";
  }

  return parseDevelopmentHost(scriptURL);
};

export const resolveBackendMode = ({
  appEnv,
  firebaseProjectId,
  useFirebaseEmulators,
}: BackendModeInput): BackendMode => {
  const normalizedAppEnv = appEnv.trim().toLowerCase();
  if (normalizedAppEnv === "demo" || firebaseProjectId === "demo-sosync") {
    return "demo";
  }

  return useFirebaseEmulators ? "emulator" : "live";
};

export const buildMissingNativeFirebaseMessage = (mode: BackendMode) =>
  mode === "emulator"
    ? "SOSync is running in Firebase emulator mode, but the native Firebase app is not configured. Add the Firebase platform config files and rebuild the development app."
    : "SOSync is running against the live Firebase project, but the native Firebase app is not configured. Add the Firebase platform config files and rebuild the development app.";

export const resolveFirebaseClientMode = ({
  backendMode,
  hasNativeFirebaseApp,
}: {
  backendMode: BackendMode;
  hasNativeFirebaseApp: boolean;
}): FirebaseClientMode => {
  if (hasNativeFirebaseApp) {
    return "firebase";
  }

  if (backendMode === "demo") {
    return "demo";
  }

  throw new Error(buildMissingNativeFirebaseMessage(backendMode));
};

const mode = resolveBackendMode({
  appEnv: env.appEnv,
  firebaseProjectId: env.firebaseProjectId,
  useFirebaseEmulators: env.useFirebaseEmulators,
});

const emulatorHost = mode === "emulator"
  ? resolveFirebaseEmulatorHost({
      overrideHost: env.firebaseEmulatorHost,
      platform: Platform.OS,
      isPhysicalDevice: Device.isDevice,
      scriptURL: (NativeModules.SourceCode?.scriptURL as string | undefined) ?? null,
    })
  : null;

const liveFunctionsBaseUrl = `https://${env.functionsRegion}-${env.firebaseProjectId}.cloudfunctions.net`;
const emulatorFunctionsBaseUrl = emulatorHost
  ? `http://${emulatorHost}:5001/${env.firebaseProjectId}/${env.functionsRegion}`
  : null;

export const backendRuntime = {
  mode,
  useFirebaseEmulators: mode === "emulator",
  allowDemoFallback: mode === "demo",
  requiresNativeFirebaseApp: mode !== "demo",
  emulatorHost,
  functionsBaseUrl: mode === "emulator" ? emulatorFunctionsBaseUrl : liveFunctionsBaseUrl,
};

export const resolveActiveFirebaseClientMode = (hasNativeFirebaseApp: boolean) =>
  resolveFirebaseClientMode({
    backendMode: backendRuntime.mode,
    hasNativeFirebaseApp,
  });

export const requireFunctionsBaseUrl = () => {
  if (backendRuntime.functionsBaseUrl) {
    return backendRuntime.functionsBaseUrl;
  }

  throw new Error(
    "Firebase emulators are enabled, but no emulator host could be resolved. Set EXPO_PUBLIC_FIREBASE_EMULATOR_HOST when using a physical device.",
  );
};

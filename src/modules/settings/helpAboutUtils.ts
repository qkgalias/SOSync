import Constants from "expo-constants";

import { env } from "@/config/env";

export const SUPPORT_EMAIL = "support@sosync.app";

export const getResolvedAppVersion = () =>
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

const getAppEnv = () => env.appEnv.toLowerCase();

export const getResolvedBuildLabel = () => {
  if (Constants.nativeBuildVersion) {
    return Constants.nativeBuildVersion;
  }

  const configuredBuildVersion = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode;
  if (configuredBuildVersion) {
    return String(configuredBuildVersion);
  }

  switch (getAppEnv()) {
    case "preview":
      return "EAS Preview Build";
    case "production":
      return "EAS Production Build";
    default:
      return "Development Build";
  }
};

export const getResolvedRuntimeLabel = () => {
  switch (getAppEnv()) {
    case "preview":
      return "EAS preview runtime";
    case "production":
      return "EAS production runtime";
    default:
      return "Development runtime";
  }
};

export const getSelectedMediaLabel = (uri: string, fileName?: string | null) => {
  if (fileName?.trim()) {
    return fileName;
  }

  const lastSegment = uri.split("/").pop();
  return lastSegment && lastSegment.length > 0 ? lastSegment : "Selected media";
};

export const buildMailtoUrl = ({ body, subject, to }: { to: string; subject: string; body: string }) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

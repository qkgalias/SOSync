import Constants from "expo-constants";

export const SUPPORT_EMAIL = "support@sosync.app";

export const getResolvedAppVersion = () =>
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

export const getResolvedBuildLabel = () =>
  Constants.nativeBuildVersion ??
  String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? "Dev Client");

export const getSelectedMediaLabel = (uri: string, fileName?: string | null) => {
  if (fileName?.trim()) {
    return fileName;
  }

  const lastSegment = uri.split("/").pop();
  return lastSegment && lastSegment.length > 0 ? lastSegment : "Selected media";
};

export const buildMailtoUrl = ({ body, subject, to }: { to: string; subject: string; body: string }) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

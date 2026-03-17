/** Purpose: Configure the Expo app, native modules, and runtime extras for SOSync. */
import type { ConfigContext, ExpoConfig } from "expo/config";

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "development";
const defaultRegion = process.env.EXPO_PUBLIC_DEFAULT_REGION ?? "PH";
const functionsRegion = process.env.EXPO_PUBLIC_FUNCTIONS_REGION ?? "asia-southeast1";
const firebaseProjectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-sosync";
const googleMapsAndroidApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ?? "";
const googleMapsIosApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_IOS_API_KEY ?? "";
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "";
const androidGoogleServicesFile = process.env.ANDROID_GOOGLE_SERVICES_FILE;
const iosGoogleServicesFile = process.env.IOS_GOOGLE_SERVICES_FILE;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "SOSync",
  slug: "sosync",
  scheme: "sosync",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  icon: "./assets/icon.png",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#F4F9FF",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sosync.mobile",
    googleServicesFile: iosGoogleServicesFile,
    config: googleMapsIosApiKey ? { googleMapsApiKey: googleMapsIosApiKey } : undefined,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "SOSync uses your location to share your position with trusted circles and show evacuation routes.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "SOSync can share your location during emergencies only when you explicitly enable safety sharing.",
      UIBackgroundModes: ["remote-notification"],
    },
  },
  android: {
    package: "com.sosync.mobile",
    googleServicesFile: androidGoogleServicesFile,
    adaptiveIcon: {
      backgroundColor: "#DDEBFF",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION", "POST_NOTIFICATIONS"],
    config: googleMapsAndroidApiKey ? { googleMaps: { apiKey: googleMapsAndroidApiKey } } : undefined,
  },
  web: {
    bundler: "metro",
    favicon: "./assets/favicon.png",
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
        android: {
          compileSdkVersion: 36,
          targetSdkVersion: 36,
          minSdkVersion: 24,
        },
      },
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow SOSync to update your live safety status for trusted circles when you choose to share it.",
        locationWhenInUsePermission:
          "Allow SOSync to show your position, trusted circle members, and evacuation routes.",
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/icon.png",
        color: "#D6524E",
        defaultChannel: "sosync-alerts",
      },
    ],
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-firebase/messaging",
  ],
  extra: {
    appEnv,
    defaultRegion,
    functionsRegion,
    firebaseProjectId,
    googleMapsAndroidApiKey,
    googleMapsIosApiKey,
    eas: {
      projectId: easProjectId,
    },
  },
});

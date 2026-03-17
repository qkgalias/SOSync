/** Purpose: Wrap native permission requests for location and notification access. */
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

export const requestLocationPermission = async () => {
  const response = await Location.requestForegroundPermissionsAsync();
  return response.status;
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === "ios") {
    return messaging().requestPermission();
  }

  const settings = await Notifications.getPermissionsAsync();
  if (!settings.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      return messaging.AuthorizationStatus.DENIED;
    }
  }

  await messaging().registerDeviceForRemoteMessages().catch(() => undefined);
  return messaging.AuthorizationStatus.AUTHORIZED;
};

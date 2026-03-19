/** Purpose: Register device tokens, surface push messages, and route notification interactions. */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { NotificationFeedItem, PushToken } from "@/types";
import { buildNotificationFeedItem, buildNotificationResponseData, resolveNotificationResponseRoute } from "@/services/notificationPayload";
import { firestoreService } from "@/services/firestoreService";
import { firebaseMessaging, hasFirebaseApp } from "@/services/firebase";

const hasGrantedPermission = async () => {
  const settings = await Notifications.getPermissionsAsync();
  return settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

const buildPushToken = (token: string): PushToken => ({
  tokenId: token,
  token,
  platform: Platform.OS === "ios" ? "ios" : "android",
  appVersion: Constants.expoConfig?.version ?? "1.0.0",
  deviceName: Device.deviceName ?? Device.modelName ?? undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const getCurrentToken = async () => {
  try {
    return await firebaseMessaging().getToken();
  } catch {
    return null;
  }
};

export const notificationService = {
  async registerDevice(userId: string) {
    if (!hasFirebaseApp() || !(await hasGrantedPermission())) {
      return null;
    }

    try {
      await firebaseMessaging().registerDeviceForRemoteMessages();
    } catch {
      // iOS without APNs or incomplete native setup should not break onboarding flows.
    }

    const token = await getCurrentToken();
    if (!token) {
      return null;
    }

    const pushToken = buildPushToken(token);
    await firestoreService.savePushToken(userId, pushToken);
    return pushToken;
  },

  listenToTokenRefresh(userId: string) {
    if (!hasFirebaseApp()) {
      return () => undefined;
    }

    return firebaseMessaging().onTokenRefresh(async (token) => {
      await firestoreService.savePushToken(userId, buildPushToken(token));
    });
  },

  listenToForegroundMessages(callback: (item: NotificationFeedItem) => void) {
    if (!hasFirebaseApp()) {
      return () => undefined;
    }

    return firebaseMessaging().onMessage((message) => callback(buildNotificationFeedItem(message)));
  },

  async presentForegroundNotification(item: NotificationFeedItem) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.body,
        data: buildNotificationResponseData(item),
      },
      trigger: null,
    });
  },

  listenToNotificationOpens(callback: (route: string) => void) {
    const localSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = resolveNotificationResponseRoute(response.notification.request.content.data);
      if (route) {
        callback(route);
      }
    });

    if (!hasFirebaseApp()) {
      return () => localSubscription.remove();
    }

    const unsubscribeRemote = firebaseMessaging().onNotificationOpenedApp((message) => {
      const route = message ? buildNotificationFeedItem(message).targetRoute : null;
      if (route) {
        callback(route);
      }
    });

    return () => {
      localSubscription.remove();
      unsubscribeRemote();
    };
  },

  async getInitialNotificationRoute() {
    const response = await Notifications.getLastNotificationResponseAsync();
    const localRoute = resolveNotificationResponseRoute(response?.notification.request.content.data);
    if (localRoute) {
      await Notifications.clearLastNotificationResponseAsync();
      return localRoute;
    }

    if (!hasFirebaseApp()) {
      return null;
    }

    const message = await firebaseMessaging().getInitialNotification();
    return message ? buildNotificationFeedItem(message).targetRoute ?? null : null;
  },

  async deleteCurrentToken(userId: string, tokenId?: string) {
    if (!hasFirebaseApp()) {
      return;
    }

    const currentToken = tokenId ?? (await getCurrentToken());
    if (!currentToken) {
      return;
    }

    await firestoreService.removePushToken(userId, currentToken).catch(() => undefined);
    await firebaseMessaging().deleteToken().catch(() => undefined);
  },
};

/** Purpose: Register device tokens, surface push messages, and route notification interactions. */
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import {
  deleteToken as deleteMessagingToken,
  getInitialNotification as getInitialRemoteNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
} from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import type { NotificationFeedItem, PushToken } from "@/types";
import { buildNotificationFeedItem, buildNotificationResponseData, resolveNotificationResponseRoute } from "@/services/notificationPayload";
import { hasFirebaseApp } from "@/services/firebase";
import { firestoreService } from "@/services/firestoreService";

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

const messagingInstance = () => getMessaging();
const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());

const getCurrentToken = async () => {
  try {
    return await getToken(messagingInstance());
  } catch {
    return null;
  }
};

export const notificationService = {
  async registerDevice(userId: string) {
    if (getClientMode() === "demo" || !(await hasGrantedPermission())) {
      return null;
    }

    try {
      await registerDeviceForRemoteMessages(messagingInstance());
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
    if (getClientMode() === "demo") {
      return () => undefined;
    }

    return onTokenRefresh(messagingInstance(), async (token) => {
      try {
        await firestoreService.savePushToken(userId, buildPushToken(token));
      } catch (error) {
        console.warn("Push token refresh sync failed.", error);
      }
    });
  },

  listenToForegroundMessages(callback: (item: NotificationFeedItem) => void) {
    if (getClientMode() === "demo") {
      return () => undefined;
    }

    return onMessage(messagingInstance(), (message) => callback(buildNotificationFeedItem(message)));
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
    const clientMode = getClientMode();
    const localSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = resolveNotificationResponseRoute(response.notification.request.content.data);
      if (route) {
        callback(route);
      }
    });

    if (clientMode === "demo") {
      return () => localSubscription.remove();
    }

    const unsubscribeRemote = onNotificationOpenedApp(messagingInstance(), (message) => {
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
    const clientMode = getClientMode();
    const response = await Notifications.getLastNotificationResponseAsync();
    const localRoute = resolveNotificationResponseRoute(response?.notification.request.content.data);
    if (localRoute) {
      await Notifications.clearLastNotificationResponseAsync();
      return localRoute;
    }

    if (clientMode === "demo") {
      return null;
    }

    const message = await getInitialRemoteNotification(messagingInstance());
    return message ? buildNotificationFeedItem(message).targetRoute ?? null : null;
  },

  async deleteCurrentToken(userId: string, tokenId?: string) {
    if (getClientMode() === "demo") {
      return;
    }

    const currentToken = tokenId ?? (await getCurrentToken());
    if (!currentToken) {
      return;
    }

    await firestoreService.removePushToken(userId, currentToken).catch(() => undefined);
    await deleteMessagingToken(messagingInstance()).catch(() => undefined);
  },
};

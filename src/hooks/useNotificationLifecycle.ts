/** Purpose: Bind push delivery and notification tap routing once the app shell is ready. */
import { useEffect } from "react";
import type { Href } from "expo-router";
import { useRouter } from "expo-router";

import { notificationService } from "@/services/notificationService";

export const useNotificationLifecycle = (enabled: boolean) => {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;

    notificationService
      .getInitialNotificationRoute()
      .then((route) => {
        if (active && route) {
          router.replace(route as Href);
        }
      })
      .catch((error) => {
        console.warn("Notification bootstrap failed.", error);
      });

    const unsubscribeForeground = notificationService.listenToForegroundMessages((item) => {
      notificationService.presentForegroundNotification(item).catch(() => undefined);
    });

    const unsubscribeInteractions = notificationService.listenToNotificationOpens((route) => {
      router.push(route as Href);
    });

    return () => {
      active = false;
      unsubscribeForeground();
      unsubscribeInteractions();
    };
  }, [enabled, router]);
};

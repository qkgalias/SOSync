/** Purpose: Merge alerts and SOS events into a single notification feed for the active group. */
import { useEffect, useMemo, useState } from "react";

import type { NotificationFeedItem } from "@/types";
import { toSosNotificationItems, toVisibleNotificationFeed } from "@/hooks/useNotifications.helpers";
import { firestoreService } from "@/services/firestoreService";
import { buildNotificationFeedId } from "@/utils/helpers";

export const useNotifications = (
  groupId: string | null,
  userId: string | undefined,
  blockedUserIds: string[] = [],
) => {
  const [items, setItems] = useState<NotificationFeedItem[]>([]);

  useEffect(() => {
    if (!groupId || !userId) {
      setItems([]);
      return;
    }

    let alerts: NotificationFeedItem[] = [];
    let sos: NotificationFeedItem[] = [];
    let readLookup: Record<string, string> = {};

    const sync = () => {
      const { allItems } = toVisibleNotificationFeed(
        [...alerts, ...sos].map((item) => ({
          ...item,
          readAt: readLookup[item.id] ?? null,
        })),
      );

      setItems(allItems);
    };

    const unsubscribeAlerts = firestoreService.listenToAlerts(groupId, (nextAlerts) => {
      alerts = nextAlerts.map((alert) => ({
        id: buildNotificationFeedId("alert", alert.alertId),
        groupId: alert.groupId,
        kind: "disaster",
        title: alert.title,
        body: alert.message,
        createdAt: alert.createdAt,
        targetRoute: `/alerts/${alert.alertId}`,
      }));
      sync();
    });

    const unsubscribeSos = firestoreService.listenToSosEvents(groupId, (events) => {
      sos = toSosNotificationItems(events, blockedUserIds, userId);
      sync();
    });

    const unsubscribeReads = firestoreService.listenToNotificationReads(userId, (reads) => {
      readLookup = reads.reduce<Record<string, string>>((lookup, entry) => {
        lookup[entry.feedItemId] = entry.readAt;
        return lookup;
      }, {});
      sync();
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeSos();
      unsubscribeReads();
    };
  }, [blockedUserIds, groupId, userId]);

  return useMemo(
    () => ({
      items,
      unreadItems: toVisibleNotificationFeed(items).unreadItems,
      unreadCount: toVisibleNotificationFeed(items).unreadItems.length,
      markAsRead: async (feedItemId: string) => {
        if (!userId) {
          return;
        }

        await firestoreService.markNotificationRead(userId, feedItemId);
      },
    }),
    [items, userId],
  );
};

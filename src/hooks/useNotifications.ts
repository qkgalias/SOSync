/** Purpose: Merge alerts and SOS events into a single notification feed for the active group. */
import { useEffect, useMemo, useState } from "react";

import type { NotificationFeedItem } from "@/types";
import {
  filterFeedItemsByJoinedAt,
  toSosNotificationItems,
  toVisibleNotificationFeed,
} from "@/hooks/useNotifications.helpers";
import { firestoreService } from "@/services/firestoreService";
import { buildNotificationFeedId } from "@/utils/helpers";

const DEFAULT_BLOCKED_USER_IDS: string[] = [];

export const useNotifications = (
  groupId: string | null,
  userId: string | undefined,
  blockedUserIds: string[] = DEFAULT_BLOCKED_USER_IDS,
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
    let membershipJoinedAt: string | null | undefined;

    const sync = () => {
      if (membershipJoinedAt === undefined || membershipJoinedAt === null) {
        setItems([]);
        return;
      }

      const { allItems } = toVisibleNotificationFeed(
        filterFeedItemsByJoinedAt(
          [...alerts, ...sos].map((item) => ({
            ...item,
            readAt: readLookup[item.id] ?? null,
          })),
          membershipJoinedAt,
        ),
      );

      setItems(allItems);
    };

    const unsubscribeMembership = firestoreService.listenToGroupMember(groupId, userId, (member) => {
      membershipJoinedAt = member ? member.joinedAt ?? "" : null;
      sync();
    });

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
      unsubscribeMembership();
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

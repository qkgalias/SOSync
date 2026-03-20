/** Purpose: Merge alerts and SOS events into a single notification feed for the active group. */
import { useEffect, useMemo, useState } from "react";

import type { NotificationFeedItem } from "@/types";
import { firestoreService } from "@/services/firestoreService";

export const useNotifications = (groupId: string | null) => {
  const [items, setItems] = useState<NotificationFeedItem[]>([]);

  useEffect(() => {
    if (!groupId) {
      setItems([]);
      return;
    }

    let alerts: NotificationFeedItem[] = [];
    let sos: NotificationFeedItem[] = [];

    const sync = () =>
      setItems(
        [...alerts, ...sos].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
      );

    const unsubscribeAlerts = firestoreService.listenToAlerts(groupId, (nextAlerts) => {
      alerts = nextAlerts.map((alert) => ({
        id: alert.alertId,
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
      sos = events.map((event) => ({
        id: event.eventId,
        groupId: event.groupId,
        kind: "sos",
        title: "Trusted circle SOS",
        body: event.message,
        createdAt: event.createdAt,
      }));
      sync();
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeSos();
    };
  }, [groupId]);

  return useMemo(() => items, [items]);
};

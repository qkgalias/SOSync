/** Purpose: Show persisted all/unread activity for disasters and trusted-circle SOS events. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { ListEmptyState } from "@/components/ListEmptyState";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useNotifications } from "@/hooks/useNotifications";
import { buildSosNotificationDetail, getSosEventIdFromFeedItemId } from "@/modules/notifications/notificationDetails";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { SosEvent } from "@/types";
import { locationService } from "@/services/locationService";
import { firestoreService } from "@/services/firestoreService";
import { formatTimestampLabel } from "@/utils/helpers";

const iconByKind = {
  disaster: "alert-circle",
  evacuation: "map-marker-path",
  message: "message-text",
  sos: "alarm-light",
} as const;

export default function NotificationsScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const detailRequestId = useRef(0);
  const { authUser, selectedGroupId } = useAuthSession();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const members = useGroupMembers(selectedGroupId);
  const { items, markAsRead, unreadItems } = useNotifications(selectedGroupId, authUser?.uid, blockedUserIds);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("unread");
  const [refreshing, setRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [sosEvents, setSosEvents] = useState<SosEvent[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<ReturnType<typeof buildSosNotificationDetail> | null>(null);

  useEffect(() => {
    if (!selectedGroupId) {
      setSosEvents([]);
      return;
    }

    return firestoreService.listenToSosEvents(selectedGroupId, (events) => {
      setSosEvents(events);
    });
  }, [selectedGroupId]);

  const visibleItems = useMemo(
    () => (activeTab === "unread" ? unreadItems : items),
    [activeTab, items, unreadItems],
  );
  const emptyMessage =
    activeTab === "unread"
      ? "No unread notifications in the last 30 days."
      : "No alerts have arrived for the active circle in the last 30 days.";
  const memberLookup = useMemo(
    () =>
      members.reduce<Record<string, (typeof members)[number]>>((lookup, member) => {
        lookup[member.userId] = member;
        return lookup;
      }, {}),
    [members],
  );
  const eventLookup = useMemo(
    () =>
      sosEvents.reduce<Record<string, SosEvent>>((lookup, event) => {
        lookup[event.eventId] = event;
        return lookup;
      }, {}),
    [sosEvents],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 250));
    setRefreshing(false);
  };

  const closeDetail = () => {
    detailRequestId.current += 1;
    setDetailLoading(false);
    setDetailVisible(false);
    setSelectedDetail(null);
  };

  const openSosDetail = async (item: (typeof items)[number]) => {
    try {
      await markAsRead(item.id);
    } catch (error) {
      console.warn("Failed to mark SOS notification as read.", error);
    }

    const requestId = detailRequestId.current + 1;
    detailRequestId.current = requestId;

    const eventId = getSosEventIdFromFeedItemId(item.id);
    const event = eventId ? eventLookup[eventId] ?? null : null;
    const member = item.actorUserId ? memberLookup[item.actorUserId] ?? null : null;

    setSelectedDetail(buildSosNotificationDetail({ event, item, member }));
    setDetailVisible(true);

    if (!event) {
      setDetailLoading(false);
      return;
    }

    setDetailLoading(true);

    try {
      const readableLocation = await locationService.reverseGeocode({
        latitude: event.latitude,
        longitude: event.longitude,
      });
      if (detailRequestId.current !== requestId) {
        return;
      }

      setSelectedDetail(buildSosNotificationDetail({ event, item, member, locationLabel: readableLocation }));
    } catch (error) {
      console.warn("SOS location reverse geocode failed.", error);
    } finally {
      if (detailRequestId.current === requestId) {
        setDetailLoading(false);
      }
    }
  };

  const handleItemPress = async (item: (typeof items)[number]) => {
    if (item.kind === "sos") {
      await openSosDetail(item);
      return;
    }

    try {
      await markAsRead(item.id);
    } catch (error) {
      console.warn("Failed to mark notification as read.", error);
    }

    if (item.targetRoute) {
      router.push(item.targetRoute as never);
    }
  };

  return (
    <>
      <Screen title="Notification" centerTitle scroll={false} contentClassName="flex-1 px-0 pb-0">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={themeTokens.accentPrimary} />}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-6 mt-6 flex-row gap-8 border-b border-line pb-3">
            {(["unread", "all"] as const).map((tab) => (
              <Pressable key={tab} className="pb-1" onPress={() => setActiveTab(tab)}>
                <Text className={tab === activeTab ? "text-[20px] text-ink" : "text-[20px] text-muted"}>
                  {tab === "unread" ? "Unread" : "All"}
                </Text>
                <View className={tab === activeTab ? "mt-2 h-0.5 w-full bg-primary" : "mt-2 h-0.5 w-full bg-transparent"} />
              </Pressable>
            ))}
          </View>
          {!visibleItems.length ? <ListEmptyState message={emptyMessage} /> : null}
          {visibleItems.map((item) => (
            <Pressable
              key={item.id}
              className="mb-3 flex-row rounded-[18px] bg-panel px-4 py-4"
              onPress={() => {
                void handleItemPress(item);
              }}
            >
              <View className="mr-3 h-14 w-14 items-center justify-center rounded-full bg-surface">
                <MaterialCommunityIcons color={themeTokens.accentPrimary} name={iconByKind[item.kind]} size={26} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="flex-1 text-[16px] font-semibold text-ink">{item.title}</Text>
                  <Text className="text-xs text-muted">{formatTimestampLabel(item.createdAt)}</Text>
                </View>
                <Text className="mt-2 text-sm leading-5 text-muted">{item.body}</Text>
              </View>
              {!item.readAt ? <View className="ml-3 mt-2 h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </Pressable>
          ))}
        </ScrollView>
      </Screen>
      <Modal animationType="fade" transparent visible={detailVisible} onRequestClose={closeDetail}>
        <View className="flex-1 justify-center bg-black/35 px-5">
          <View className="rounded-[28px] bg-panel px-5 py-6">
            <View className="flex-row items-start justify-between gap-4">
              <View>
                <Text className="text-[24px] font-semibold text-ink">SOS Details</Text>
                {selectedDetail ? <Text className="mt-1 text-sm text-muted">{selectedDetail.createdAtLabel}</Text> : null}
              </View>
              <Pressable className="h-10 w-10 items-center justify-center" onPress={closeDetail}>
                <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
              </Pressable>
            </View>
            {selectedDetail ? (
              <>
                <View className="mt-5 flex-row items-center">
                  <View className="h-14 w-14 items-center justify-center rounded-full bg-panel">
                    {selectedDetail.callerPhotoURL ? (
                      <Image
                        className="h-14 w-14 rounded-full"
                        resizeMode="cover"
                        source={{ uri: selectedDetail.callerPhotoURL }}
                      />
                    ) : (
                      <Text className="text-lg font-semibold text-profileAccent">{selectedDetail.callerInitials}</Text>
                    )}
                  </View>
                  <View className="ml-4 flex-1">
                    <Text className="text-xs uppercase tracking-[1px] text-muted">Caller</Text>
                    <Text className="mt-1 text-lg font-semibold text-ink">{selectedDetail.callerName}</Text>
                  </View>
                </View>
                <View className="mt-5 rounded-[20px] bg-panel px-4 py-4">
                  <Text className="text-xs uppercase tracking-[1px] text-muted">Location</Text>
                  <Text className="mt-2 text-base leading-6 text-ink">{selectedDetail.locationLabel}</Text>
                  {detailLoading ? (
                    <View className="mt-3 flex-row items-center">
                      <ActivityIndicator color={themeTokens.accentPrimary} size="small" />
                      <Text className="ml-2 text-sm text-muted">Looking up a readable place...</Text>
                    </View>
                  ) : null}
                </View>
                <View className="mt-3 rounded-[20px] bg-panel px-4 py-4">
                  <Text className="text-xs uppercase tracking-[1px] text-muted">Message</Text>
                  <Text className="mt-2 text-base leading-6 text-ink">{selectedDetail.message}</Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

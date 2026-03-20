/** Purpose: Merge realtime alerts and SOS events into a concise operational feed. */
import { Platform, Text } from "react-native";

import { InfoCard } from "@/components/InfoCard";
import { ListEmptyState } from "@/components/ListEmptyState";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useNotifications } from "@/hooks/useNotifications";
import { formatTimestampLabel } from "@/utils/helpers";

export default function NotificationsScreen() {
  const { selectedGroupId } = useAuthSession();
  const notifications = useNotifications(selectedGroupId);
  const subtitle =
    Platform.OS === "ios"
      ? "Your circle’s disaster warnings and SOS activity stay in this feed while iPhone background push is deferred."
      : "Your circle’s disaster warnings and SOS activity live here.";

  return (
    <Screen title="Notification center" subtitle={subtitle}>
      {!notifications.length ? <ListEmptyState message="No alerts have arrived for the active circle yet." /> : null}
      {notifications.map((item) => (
        <InfoCard
          key={item.id}
          title={item.title}
          eyebrow={formatTimestampLabel(item.createdAt)}
          rightSlot={<StatusBadge label={item.kind} />}
        >
          <Text className="text-sm leading-6 text-muted">{item.body}</Text>
        </InfoCard>
      ))}
    </Screen>
  );
}

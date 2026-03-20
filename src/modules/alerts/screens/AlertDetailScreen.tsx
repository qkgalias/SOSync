/** Purpose: Show deeper operational context for a selected disaster alert. */
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";

import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuthSession } from "@/hooks/useAuthSession";
import { formatTimestampLabel } from "@/utils/helpers";

export default function AlertDetailScreen() {
  const params = useLocalSearchParams<{ alertId: string }>();
  const { selectedGroupId } = useAuthSession();
  const alerts = useAlerts(selectedGroupId);
  const alert = alerts.find((entry) => entry.alertId === params.alertId);

  return (
    <Screen title={alert?.title ?? "Alert detail"} subtitle="Review severity, timing, and next-action context.">
      {alert ? (
        <InfoCard
          title={`${alert.type.toUpperCase()} alert`}
          eyebrow={formatTimestampLabel(alert.createdAt)}
          rightSlot={<StatusBadge label={alert.severity} />}
        >
          <Text className="text-base leading-7 text-muted">{alert.message}</Text>
          <Text className="mt-4 text-sm text-muted">
            Source: {alert.source} • Coordinates: {alert.latitude.toFixed(4)}, {alert.longitude.toFixed(4)}
          </Text>
        </InfoCard>
      ) : (
        <InfoCard title="Alert unavailable" eyebrow="Missing data">
          <Text className="text-sm leading-6 text-muted">
            The requested alert could not be found in the currently selected group feed.
          </Text>
        </InfoCard>
      )}
    </Screen>
  );
}

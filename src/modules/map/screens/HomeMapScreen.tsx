/** Purpose: Combine live location, disaster alerts, and evacuation guidance on one map screen. */
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroups } from "@/hooks/useGroups";
import { useLocation } from "@/hooks/useLocation";
import { GroupPicker } from "@/modules/groups/components/GroupPicker";
import { MapOverview } from "@/modules/map/components/MapOverview";
import { formatTimestampLabel, toDistanceLabel, toDurationLabel } from "@/utils/helpers";

export default function HomeMapScreen() {
  const router = useRouter();
  const { authUser, profile } = useAuthSession();
  const { groups, selectedGroupId, setSelectedGroupId } = useGroups();
  const alerts = useAlerts(selectedGroupId);
  const { centers, currentLocation, groupLocations, nearestCenter, permissionStatus, requestRoute, route } =
    useLocation(authUser?.uid, selectedGroupId, Boolean(profile?.privacy.locationSharingEnabled));

  return (
    <Screen title="Live awareness" subtitle="Track your circle, nearby threats, and the closest evacuation options.">
      <GroupPicker groups={groups} selectedGroupId={selectedGroupId} onSelect={setSelectedGroupId} />
      <MapOverview alerts={alerts} centers={centers} currentLocation={currentLocation} groupLocations={groupLocations} />
      <InfoCard title="Evacuation snapshot" eyebrow={permissionStatus === "granted" ? "Location ready" : "Permission required"}>
        <Text className="text-sm leading-6 text-muted">
          {nearestCenter
            ? `${nearestCenter.name} is the closest known evacuation center to your current position.`
            : "Grant location access to calculate the nearest evacuation center and route preview."}
        </Text>
        {nearestCenter ? (
          <View className="mt-4">
            <Text className="text-base font-semibold text-ink">{nearestCenter.address}</Text>
            {route ? (
              <Text className="mt-2 text-sm text-muted">
                {toDistanceLabel(route.distanceMeters)} away, roughly {toDurationLabel(route.durationSeconds)}.
              </Text>
            ) : null}
            <View className="mt-4">
              <Button label="Preview route" onPress={requestRoute} />
            </View>
          </View>
        ) : null}
      </InfoCard>
      <SectionHeader title="Latest alerts" subtitle="Tap into the detail view for response context and timing." />
      {alerts.map((alert) => (
        <InfoCard
          key={alert.alertId}
          title={alert.title}
          eyebrow={`${alert.type.toUpperCase()} • ${formatTimestampLabel(alert.createdAt)}`}
          rightSlot={<StatusBadge label={alert.severity} />}
        >
          <Text className="mb-4 text-sm leading-6 text-muted">{alert.message}</Text>
          <Button label="Open alert" onPress={() => router.push(`/alerts/${alert.alertId}`)} variant="secondary" />
        </InfoCard>
      ))}
    </Screen>
  );
}

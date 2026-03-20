/** Purpose: Render the current live map state with user, group, center, and alert overlays. */
import { Platform, Text, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

import { appConfig } from "@/config/appConfig";
import { InfoCard } from "@/components/InfoCard";
import type { DisasterAlert, EvacuationCenter, GroupLocation } from "@/types";

type MapOverviewProps = {
  alerts: DisasterAlert[];
  centers: EvacuationCenter[];
  currentLocation: { latitude: number; longitude: number } | null;
  groupLocations: GroupLocation[];
};

const alertRadius: Record<string, number> = {
  advisory: 800,
  watch: 1400,
  warning: 1800,
  critical: 2400,
};

export const MapOverview = ({ alerts, centers, currentLocation, groupLocations }: MapOverviewProps) => {
  if (Platform.OS === "web") {
    return (
      <InfoCard title="Map preview unavailable" eyebrow="Mobile build">
        <Text className="text-sm leading-6 text-muted">
          The live map uses native map components, so it is available in iOS and Android development builds rather
          than the web preview.
        </Text>
      </InfoCard>
    );
  }

  return (
    <View className="mb-4 overflow-hidden rounded-card border border-line bg-surface">
      <MapView
        className="h-96 w-full"
        initialRegion={appConfig.map.initialRegion}
        region={
          currentLocation
            ? { ...currentLocation, latitudeDelta: 0.12, longitudeDelta: 0.12 }
            : undefined
        }
        showsCompass
        showsMyLocationButton
      >
        {currentLocation ? (
          <Marker coordinate={currentLocation} description="You are here" title="Your location" pinColor="#1E5EFF" />
        ) : null}
        {groupLocations.map((member) => (
          <Marker
            key={member.locationId}
            coordinate={{ latitude: member.latitude, longitude: member.longitude }}
            description={`Last updated ${member.updatedAt}`}
            title={member.userId === "demo-user" ? "You" : "Circle member"}
            pinColor="#2BB8A5"
          />
        ))}
        {centers.map((center) => (
          <Marker
            key={center.centerId}
            coordinate={{ latitude: center.latitude, longitude: center.longitude }}
            description={center.address}
            title={center.name}
            pinColor="#F2A93B"
          />
        ))}
        {alerts.map((alert) => (
          <Circle
            key={alert.alertId}
            center={{ latitude: alert.latitude, longitude: alert.longitude }}
            fillColor="rgba(214, 82, 78, 0.16)"
            radius={alertRadius[alert.severity] ?? 1400}
            strokeColor="rgba(214, 82, 78, 0.65)"
            strokeWidth={2}
          />
        ))}
      </MapView>
    </View>
  );
};

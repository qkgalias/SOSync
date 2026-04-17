/** Purpose: Render a compact, non-interactive flood preview map inside the Home flood sheet. */
import { memo, useMemo } from "react";
import { View } from "react-native";
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE } from "react-native-maps";

import { getFloodLevelColors } from "@/hooks/useFloodRisk.helpers";
import type { FloodLevel, FloodOverview } from "@/types";

type FloodMiniMapProps = {
  level: FloodLevel;
  map: FloodOverview["map"];
};

const polygonFillByLevel: Record<FloodLevel, string> = {
  CAUTION: "rgba(175, 122, 12, 0.16)",
  DANGER: "rgba(177, 58, 50, 0.18)",
  EXTREME_DANGER: "rgba(92, 21, 21, 0.22)",
  LIMITED_DATA: "rgba(106, 103, 103, 0.14)",
  SAFE: "rgba(38, 124, 71, 0.12)",
  WARNING: "rgba(193, 101, 18, 0.16)",
};

const toRegionFromCoordinates = (coordinates: Array<{ latitude: number; longitude: number }>) => {
  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.6, 0.02);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.6, 0.02);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    latitudeDelta,
    longitude: (minLongitude + maxLongitude) / 2,
    longitudeDelta,
  };
};

export const FloodMiniMap = memo(function FloodMiniMap({ level, map }: FloodMiniMapProps) {
  const colors = getFloodLevelColors(level);
  const initialRegion = useMemo(() => {
    if (!map) {
      return null;
    }

    const coordinates = [
      map.userLocation,
      ...map.gauges.map((gauge) => ({ latitude: gauge.latitude, longitude: gauge.longitude })),
      ...map.polygons.flatMap((polygon) => polygon.points),
    ];

    if (!coordinates.length) {
      return null;
    }

    return toRegionFromCoordinates(coordinates);
  }, [map]);

  if (!map || !map.hasRenderableData || !initialRegion) {
    return null;
  }

  return (
    <View
      style={{
        borderColor: "#E5D9D4",
        borderRadius: 22,
        borderWidth: 1,
        height: 196,
        overflow: "hidden",
      }}
    >
      <MapView
        initialRegion={initialRegion}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        rotateEnabled={false}
        scrollEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        showsScale={false}
        showsTraffic={false}
        style={{ flex: 1 }}
        toolbarEnabled={false}
        zoomEnabled={false}
      >
        <Circle
          center={map.userLocation}
          fillColor="rgba(123, 44, 40, 0.12)"
          radius={180}
          strokeColor="rgba(123, 44, 40, 0.36)"
          strokeWidth={1}
        />

        {map.polygons.map((polygon) => (
          <Polygon
            key={polygon.polygonId}
            coordinates={polygon.points}
            fillColor={polygonFillByLevel[polygon.level ?? level]}
            strokeColor={colors.accent}
            strokeWidth={1.5}
          />
        ))}

        {map.gauges.map((gauge) => (
          <Marker
            key={gauge.gaugeId}
            coordinate={{ latitude: gauge.latitude, longitude: gauge.longitude }}
            pinColor={gauge.isPrimary ? colors.accent : "#8D827E"}
            title={gauge.label}
          />
        ))}
      </MapView>
    </View>
  );
});

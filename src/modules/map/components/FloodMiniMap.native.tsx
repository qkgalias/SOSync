/** Purpose: Render a read-only flood area preview using the Google Navigation SDK map view. */
import { memo, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import { StyleSheet, Text, View, processColor, type ColorValue } from "react-native";
import {
  MapColorScheme,
  MapType,
  MapView,
  type MapViewController,
} from "@googlemaps/react-native-navigation-sdk";

import { getHomeMapStyleJson } from "@/modules/map/homeMapStyle";
import type { FloodLevel, FloodOverview } from "@/types";
import type { HomeMapAppearance } from "@/types";

type FloodMiniMapProps = {
  level: FloodLevel;
  map: FloodOverview["map"];
  mapTheme: HomeMapAppearance;
};

type PreviewCoordinate = { latitude: number; longitude: number };

const normalBaseMapType = MapType.NORMAL as unknown as ComponentProps<typeof MapView>["mapType"];

const toLatLng = (coordinate: PreviewCoordinate) => ({
  lat: coordinate.latitude,
  lng: coordinate.longitude,
});

const toSdkColor = (color: string) => {
  const processedColor = processColor(color);
  return (typeof processedColor === "number" ? processedColor : 0) as unknown as ColorValue;
};

const getLevelPalette = (level: FloodLevel) => {
  switch (level) {
    case "EXTREME_DANGER":
    case "DANGER":
      return {
        fill: "rgba(182, 55, 49, 0.18)",
        stroke: "rgba(182, 55, 49, 0.68)",
      };
    case "WARNING":
      return {
        fill: "rgba(221, 129, 28, 0.18)",
        stroke: "rgba(187, 101, 0, 0.68)",
      };
    case "CAUTION":
      return {
        fill: "rgba(232, 179, 68, 0.18)",
        stroke: "rgba(166, 115, 0, 0.62)",
      };
    case "SAFE":
      return {
        fill: "rgba(43, 156, 101, 0.16)",
        stroke: "rgba(27, 132, 82, 0.58)",
      };
    default:
      return {
        fill: "rgba(116, 107, 101, 0.14)",
        stroke: "rgba(116, 107, 101, 0.52)",
      };
  }
};

const getPreviewCoordinates = (map: NonNullable<FloodOverview["map"]>) => [
  map.userLocation,
  ...map.gauges,
  ...map.polygons.flatMap((polygon) => polygon.points),
];

const getCameraForCoordinates = (coordinates: PreviewCoordinate[]) => {
  if (!coordinates.length) {
    return {
      target: { lat: 14.5995, lng: 120.9842 },
      tilt: 0,
      zoom: 10,
    };
  }

  const bounds = coordinates.reduce(
    (currentBounds, coordinate) => ({
      maxLatitude: Math.max(currentBounds.maxLatitude, coordinate.latitude),
      maxLongitude: Math.max(currentBounds.maxLongitude, coordinate.longitude),
      minLatitude: Math.min(currentBounds.minLatitude, coordinate.latitude),
      minLongitude: Math.min(currentBounds.minLongitude, coordinate.longitude),
    }),
    {
      maxLatitude: coordinates[0]?.latitude ?? 0,
      maxLongitude: coordinates[0]?.longitude ?? 0,
      minLatitude: coordinates[0]?.latitude ?? 0,
      minLongitude: coordinates[0]?.longitude ?? 0,
    },
  );
  const latitudeDelta = Math.max(0.002, bounds.maxLatitude - bounds.minLatitude);
  const longitudeDelta = Math.max(0.002, bounds.maxLongitude - bounds.minLongitude);
  const maxDelta = Math.max(latitudeDelta, longitudeDelta);
  const zoom = Math.max(8.2, Math.min(15.5, Math.log2(360 / (maxDelta * 2.8))));

  return {
    target: {
      lat: (bounds.minLatitude + bounds.maxLatitude) / 2,
      lng: (bounds.minLongitude + bounds.maxLongitude) / 2,
    },
    tilt: 0,
    zoom,
  };
};

export const FloodMiniMap = memo(function FloodMiniMap({ level, map, mapTheme }: FloodMiniMapProps) {
  const mapControllerRef = useRef<MapViewController | null>(null);
  const hasLoadedMapRef = useRef(false);
  const [mapReadyToken, setMapReadyToken] = useState(0);
  const [hasMapError, setHasMapError] = useState(false);
  const [shouldApplyMapStyle, setShouldApplyMapStyle] = useState(false);
  const primaryGauge = useMemo(() => map?.gauges.find((gauge) => gauge.isPrimary) ?? map?.gauges[0] ?? null, [map]);
  const coordinates = useMemo(() => (map ? getPreviewCoordinates(map) : []), [map]);
  const camera = useMemo(() => getCameraForCoordinates(coordinates), [coordinates]);
  const mapStyle = useMemo(() => getHomeMapStyleJson(mapTheme), [mapTheme]);
  const palette = useMemo(() => getLevelPalette(level), [level]);

  useEffect(() => {
    if (!hasLoadedMapRef.current || !mapControllerRef.current) {
      return;
    }

    setShouldApplyMapStyle(false);
    const timer = setTimeout(() => {
      setShouldApplyMapStyle(true);
    }, 80);

    return () => {
      clearTimeout(timer);
    };
  }, [mapReadyToken, mapStyle]);

  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!map || !controller || !hasLoadedMapRef.current) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      const operations: Array<Promise<unknown>> = [
        Promise.resolve(controller.clearMapView()),
        Promise.resolve(
          controller.addMarker({
            id: "flood-preview:user",
            position: toLatLng(map.userLocation),
            title: "You",
          }),
        ),
        ...map.gauges.map((gauge) =>
          Promise.resolve(
            controller.addMarker({
              id: `flood-preview:gauge:${gauge.gaugeId}`,
              position: toLatLng(gauge),
              title: gauge.isPrimary ? "Closest monitoring point" : "Nearby monitoring point",
            }),
          ),
        ),
        ...(primaryGauge
          ? [
              Promise.resolve(
                controller.addPolyline({
                  color: toSdkColor("rgba(145, 43, 42, 0.72)"),
                  id: "flood-preview:closest-line",
                  points: [toLatLng(map.userLocation), toLatLng(primaryGauge)],
                  width: 4,
                }),
              ),
            ]
          : []),
        ...map.polygons.map((polygon) =>
          Promise.resolve(
            controller.addPolygon({
              fillColor: toSdkColor(palette.fill),
              id: `flood-preview:polygon:${polygon.polygonId}`,
              points: polygon.points.map(toLatLng),
              strokeColor: toSdkColor(palette.stroke),
              strokeWidth: 2,
            }),
          ),
        ),
      ];

      void Promise.all(operations)
        .then(() =>
          Promise.resolve(
            controller.moveCamera({
              target: camera.target,
              tilt: 0,
              zoom: camera.zoom,
            }),
          ),
        )
        .catch((error) => {
          if (!active) {
            return;
          }

          console.warn("Flood preview map failed to render.", error);
          setHasMapError(true);
        });
    }, 120);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [camera, map, mapReadyToken, palette.fill, palette.stroke, primaryGauge]);

  if (!map?.hasRenderableData) {
    return null;
  }

  if (hasMapError) {
    return (
      <View style={styles.fallbackCard} testID="flood-mini-map-fallback">
        <Text style={styles.fallbackTitle}>Map preview unavailable</Text>
        <Text style={styles.fallbackBody}>
          We could not load the map preview right now, but the closest monitoring point is still listed above.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card} testID="flood-mini-map">
      <MapView
        buildingsEnabled={false}
        compassEnabled={false}
        initialCameraPosition={camera}
        indoorEnabled={false}
        mapColorScheme={mapTheme === "dark" ? MapColorScheme.DARK : MapColorScheme.LIGHT}
        mapStyle={shouldApplyMapStyle ? mapStyle : undefined}
        mapToolbarEnabled={false}
        mapType={normalBaseMapType}
        myLocationButtonEnabled={false}
        myLocationEnabled={false}
        onMapReady={() => {
          hasLoadedMapRef.current = true;
          setMapReadyToken((currentValue) => currentValue + 1);
        }}
        onMapViewControllerCreated={(controller) => {
          mapControllerRef.current = controller;
          setMapReadyToken((currentValue) => currentValue + 1);
        }}
        rotateGesturesEnabled={false}
        scrollGesturesEnabled={false}
        style={styles.map}
        tiltGesturesEnabled={false}
        trafficEnabled={false}
        zoomControlsEnabled={false}
        zoomGesturesEnabled={false}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#F7F1EC",
    borderColor: "#E7DAD3",
    borderRadius: 24,
    borderWidth: 1,
    height: 190,
    overflow: "hidden",
  },
  fallbackBody: {
    color: "#6E6662",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  fallbackCard: {
    backgroundColor: "#F7F1EC",
    borderColor: "#E7DAD3",
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  fallbackTitle: {
    color: "#2F2C2C",
    fontSize: 16,
    fontWeight: "700",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

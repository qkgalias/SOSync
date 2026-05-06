/** Purpose: Render the Home map with Google Navigation SDK's map layer on native builds. */
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ForwardedRef,
} from "react";
import { Platform, StyleSheet, Text, View, processColor } from "react-native";
import type { ColorValue } from "react-native";
import {
  MapView,
  MapColorScheme,
  MapType,
  type MapViewController,
} from "@googlemaps/react-native-navigation-sdk";

import { appConfig } from "@/config/appConfig";
import { buildLocalMarkerIcon, hasNativeMarkerIconSupport } from "@/modules/map/markerIconService";
import { getThemeTokens } from "@/theme/appTheme";
import type {
  DisasterAlert,
  EvacuationCenter,
  HomeMapAppearance,
  HomeMapFocusTarget,
  HomeMapMarker,
  MapCoordinate,
} from "@/types";

type MapOverviewProps = {
  alerts: DisasterAlert[];
  centers: EvacuationCenter[];
  focusTarget?: HomeMapFocusTarget | null;
  highlightedCenterId?: string | null;
  mapTheme: HomeMapAppearance;
  markers: HomeMapMarker[];
  onCenterPress?: (centerId: string) => void;
  onCenterRoutePress?: (centerId: string) => void;
  onMapPress?: () => void;
  onMarkerPress?: (markerId: string) => void;
  onMemberBubbleDismiss?: () => void;
  prefetchedMarkerPhotos?: Record<string, true>;
  routeCoordinates?: MapCoordinate[];
  selectedCenterId?: string | null;
  selectedMarkerBubbleId?: string | null;
};

export type MapOverviewHandle = {
  takeSnapshot: () => Promise<string | null>;
};

const alertRadius: Record<string, number> = {
  advisory: 800,
  watch: 1400,
  warning: 1800,
  critical: 2400,
};

const lightMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#F8F2EC" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7C726D" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F8F2EC" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#D9CCC2" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#F5EFE9" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#E4EFE6" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#DCEAD8" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#F8E8E4" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#DFD7D0" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#F1E8E1" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7D736E" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#D9D2CA" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#EEE3D7" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#CFE4EA" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6A8695" }] },
];

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#26343E" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#B8C4CD" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#26343E" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#425461" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: "#30414C" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#314A46" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "geometry", stylers: [{ color: "#4F4B58" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#6B7A83" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#3E4C56" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#CFD6DB" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#7B8891" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#55626A" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#34566A" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#8FB2C4" }] },
];

const maxMapCommandRetries = 8;
const normalBaseMapType = MapType.NORMAL as unknown as ComponentProps<typeof MapView>["mapType"];

const isMapNotInitializedError = (error: unknown) =>
  String(error instanceof Error ? error.message : error)
    .toLowerCase()
    .includes("initialize the map view");

const toLatLng = (coordinate: { latitude: number; longitude: number }) => ({
  lat: coordinate.latitude,
  lng: coordinate.longitude,
});

const toSdkColor = (color: string) => {
  const processedColor = processColor(color);
  return (typeof processedColor === "number" ? processedColor : 0) as unknown as ColorValue;
};

const getInitialCameraCoordinate = (
  markers: HomeMapMarker[],
  centers: EvacuationCenter[],
) => {
  const currentUserMarker = markers.find((marker) => marker.isCurrentUser);
  const fallbackMarker = markers[0];
  const fallbackCenter = centers[0];
  const fallbackRegion = appConfig.map.initialRegion;

  return toLatLng(
    currentUserMarker ??
      fallbackMarker ??
      fallbackCenter ??
      { latitude: fallbackRegion.latitude, longitude: fallbackRegion.longitude },
  );
};

const getMapPalette = (mapTheme: HomeMapAppearance) => {
  const tokens = getThemeTokens(mapTheme);

  return mapTheme === "dark"
    ? {
        body: "rgba(232, 237, 242, 0.82)",
        surface: "rgba(24, 35, 48, 0.9)",
        title: "#FFFFFF",
        accent: tokens.accentPrimary,
      }
    : {
        body: "#6A6767",
        surface: "rgba(255, 255, 255, 0.94)",
        title: "#2E2C2C",
        accent: tokens.accentPrimary,
      };
};

const getMemberIconId = (marker: HomeMapMarker) => `member:${marker.markerId}`;

const getCenterIconId = (center: EvacuationCenter) => `center:${center.centerId}`;

const getMemberMarkerOptions = (marker: HomeMapMarker) => ({
  id: `member:${marker.markerId}`,
  position: toLatLng(marker),
  title: marker.displayName.trim() || "Circle member",
});

const MapOverviewComponent = (
  {
    alerts,
    centers,
    focusTarget,
    highlightedCenterId,
    mapTheme,
    markers,
    onCenterPress,
    onCenterRoutePress,
    onMapPress,
    onMarkerPress,
    onMemberBubbleDismiss,
    selectedCenterId = null,
  }: MapOverviewProps,
  ref: ForwardedRef<MapOverviewHandle>,
) => {
  const mapControllerRef = useRef<MapViewController | null>(null);
  const hasLoadedMapRef = useRef(false);
  const canRunMapCommandsRef = useRef(false);
  const hasAppliedInitialCameraRef = useRef(false);
  const mapCommandRetryCountRef = useRef(0);
  const pendingFocusTargetRef = useRef<HomeMapFocusTarget | null>(null);
  const [mapControllerReadyToken, setMapControllerReadyToken] = useState(0);
  const [mapCommandReadyToken, setMapCommandReadyToken] = useState(0);
  const [mapCommandRetryToken, setMapCommandRetryToken] = useState(0);
  const [showDiagnosticHint, setShowDiagnosticHint] = useState(false);
  const [showStaleNativeBuildHint, setShowStaleNativeBuildHint] = useState(false);
  const [shouldApplyMapStyle, setShouldApplyMapStyle] = useState(false);
  const [centerIconPaths, setCenterIconPaths] = useState<Record<string, string>>({});
  const [markerIconPaths, setMarkerIconPaths] = useState<Record<string, string>>({});
  const initialCameraTargetRef = useRef(getInitialCameraCoordinate(markers, centers));
  const palette = useMemo(() => getMapPalette(mapTheme), [mapTheme]);
  const mapStyle = useMemo(
    () => JSON.stringify(mapTheme === "dark" ? darkMapStyle : lightMapStyle),
    [mapTheme],
  );
  const currentUserMarker = useMemo(() => markers.find((marker) => marker.isCurrentUser) ?? null, [markers]);
  const markerLookup = useMemo(
    () =>
      markers.reduce<Record<string, HomeMapMarker>>((lookup, marker) => {
        lookup[marker.markerId] = marker;
        return lookup;
      }, {}),
    [markers],
  );
  const centerLookup = useMemo(
    () =>
      centers.reduce<Record<string, EvacuationCenter>>((lookup, center) => {
        lookup[center.centerId] = center;
        return lookup;
      }, {}),
    [centers],
  );

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const hasSupport = hasNativeMarkerIconSupport();
    setShowStaleNativeBuildHint(!hasSupport);

    if (!hasSupport) {
      console.warn("Rebuild Android dev build: SOSyncMarkerIcon native module is missing.");
    }
  }, []);

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
  }, [mapControllerReadyToken, mapStyle]);

  useEffect(() => {
    if (Platform.OS !== "android" || !hasNativeMarkerIconSupport()) {
      return;
    }

    let active = true;

    void Promise.all(
      markers.map(async (marker) => {
        const iconPath = await buildLocalMarkerIcon({
          displayName: marker.displayName,
          isCurrentUser: marker.isCurrentUser,
          mapTheme,
          markerId: marker.markerId,
        });

        return iconPath ? [getMemberIconId(marker), iconPath] as const : null;
      }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setMarkerIconPaths(
        entries.reduce<Record<string, string>>((nextValue, entry) => {
          if (entry) {
            nextValue[entry[0]] = entry[1];
          }
          return nextValue;
        }, {}),
      );
    });

    void Promise.all(
      markers
        .filter((marker) => Boolean(marker.photoURL))
        .map(async (marker) => {
          const iconPath = await buildLocalMarkerIcon({
            displayName: marker.displayName,
            isCurrentUser: marker.isCurrentUser,
            mapTheme,
            markerId: marker.markerId,
            photoURL: marker.photoURL,
          });

          return iconPath ? [getMemberIconId(marker), iconPath] as const : null;
        }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setMarkerIconPaths((currentValue) =>
        entries.reduce<Record<string, string>>((nextValue, entry) => {
          if (entry) {
            nextValue[entry[0]] = entry[1];
          }
          return nextValue;
        }, { ...currentValue }),
      );
    });

    return () => {
      active = false;
    };
  }, [mapTheme, markers]);

  useEffect(() => {
    if (Platform.OS !== "android" || !hasNativeMarkerIconSupport()) {
      return;
    }

    let active = true;

      void Promise.all(
        centers.map(async (center) => {
          const iconPath = await buildLocalMarkerIcon({
            isCenter: true,
            mapTheme,
            markerId: center.centerId,
          });

        return iconPath ? [getCenterIconId(center), iconPath] as const : null;
      }),
    ).then((entries) => {
      if (!active) {
        return;
      }

      setCenterIconPaths(
        entries.reduce<Record<string, string>>((nextValue, entry) => {
          if (entry) {
            nextValue[entry[0]] = entry[1];
          }
          return nextValue;
        }, {}),
      );
    });

    return () => {
      active = false;
    };
  }, [centers, mapTheme]);

  useImperativeHandle(
    ref,
    () => ({
      takeSnapshot: async () => null,
    }),
    [],
  );

  const moveCameraTo = useCallback((coordinate: { latitude: number; longitude: number }, zoom = 14) => {
    if (!mapControllerRef.current || !hasLoadedMapRef.current || !canRunMapCommandsRef.current) {
      return false;
    }

    void Promise.resolve(
      mapControllerRef.current.moveCamera({
        target: toLatLng(coordinate),
        tilt: 0,
        zoom,
      }),
    ).catch((error) => {
      if (isMapNotInitializedError(error)) {
        canRunMapCommandsRef.current = false;
        pendingFocusTargetRef.current = focusTarget ?? pendingFocusTargetRef.current;
        setMapCommandRetryToken((currentValue) => currentValue + 1);
      }
    });

    return true;
  }, [focusTarget]);

  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !hasLoadedMapRef.current || hasAppliedInitialCameraRef.current) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      void Promise.resolve(
        controller.moveCamera({
          target: initialCameraTargetRef.current,
          tilt: 0,
          zoom: 13,
        }),
      )
        .then(() => {
          if (active) {
            hasAppliedInitialCameraRef.current = true;
          }
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          if (isMapNotInitializedError(error)) {
            setMapCommandRetryToken((currentValue) => currentValue + 1);
          } else {
            console.warn("Home map initial camera move failed.", error);
          }
        });
    }, 280);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mapCommandRetryToken, mapControllerReadyToken]);

  useEffect(() => {
    const controller = mapControllerRef.current;
    if (!controller || !hasLoadedMapRef.current) {
      return;
    }

    let active = true;
    const retryDelayMs = Math.min(250 + mapCommandRetryCountRef.current * 180, 1200);

    const timer = setTimeout(() => {
      const operations: Array<Promise<unknown>> = [
        Promise.resolve(controller.clearMapView()),
        ...alerts.map((alert) =>
          Promise.resolve(
            controller.addCircle({
              center: toLatLng(alert),
              fillColor: toSdkColor(mapTheme === "dark" ? "rgba(255, 94, 94, 0.18)" : "rgba(214, 82, 78, 0.14)"),
              id: `alert:${alert.alertId}`,
              radius: alertRadius[alert.severity] ?? 1400,
              strokeColor: toSdkColor(mapTheme === "dark" ? "rgba(255, 124, 124, 0.52)" : "rgba(214, 82, 78, 0.54)"),
              strokeWidth: 2,
            }),
          ),
        ),
        ...centers.flatMap((center) => {
          const iconPath = centerIconPaths[getCenterIconId(center)];

          if (!iconPath) {
            return [];
          }

          return [
            Promise.resolve(
            controller.addMarker({
              id: `center:${center.centerId}`,
              imgPath: iconPath,
              position: toLatLng(center),
              title: center.name,
            }),
            ),
          ];
        }),
        ...markers.flatMap((marker) => {
          const iconPath = markerIconPaths[getMemberIconId(marker)];

          if (!iconPath) {
            return [];
          }

          return [
            Promise.resolve(
            controller.addMarker({
              imgPath: iconPath,
              ...getMemberMarkerOptions(marker),
            }),
            ),
          ];
        }),
      ];

      void Promise.allSettled(operations).then((results) => {
        if (!active) {
          return;
        }

        const hasInitializationRace = results.some(
          (result) => result.status === "rejected" && isMapNotInitializedError(result.reason),
        );

        if (hasInitializationRace && mapCommandRetryCountRef.current < maxMapCommandRetries) {
          canRunMapCommandsRef.current = false;
          mapCommandRetryCountRef.current += 1;
          setMapCommandRetryToken((currentValue) => currentValue + 1);
          return;
        }

        if (hasInitializationRace) {
          canRunMapCommandsRef.current = false;
          setShowDiagnosticHint(true);
          console.warn("Home map commands failed after Navigation SDK map initialization retries.");
          return;
        }

        mapCommandRetryCountRef.current = 0;
        canRunMapCommandsRef.current = true;
        setMapCommandReadyToken((currentValue) => currentValue + 1);
      });
    }, retryDelayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [alerts, centerIconPaths, centers, mapCommandRetryToken, mapControllerReadyToken, mapTheme, markerIconPaths, markers]);

  const applyFocusTarget = useCallback((target: HomeMapFocusTarget) => {
    if (target.kind === "currentUser") {
      return currentUserMarker ? moveCameraTo(currentUserMarker) : true;
    }

    if (target.kind === "marker") {
      const marker = markerLookup[target.markerId];
      return marker ? moveCameraTo(marker) : true;
    }

    const center = centerLookup[target.centerId];
    return center ? moveCameraTo(center, 13) : true;
  }, [centerLookup, currentUserMarker, markerLookup, moveCameraTo]);

  useEffect(() => {
    const target = focusTarget ?? pendingFocusTargetRef.current;
    if (!target) {
      return;
    }

    const didApplyFocus = applyFocusTarget(target);
    pendingFocusTargetRef.current = didApplyFocus ? null : target;
  }, [applyFocusTarget, focusTarget, mapCommandReadyToken, mapCommandRetryToken, mapControllerReadyToken]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (hasLoadedMapRef.current) {
      setShowDiagnosticHint(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowDiagnosticHint(true);
    }, 6000);

    return () => {
      clearTimeout(timer);
    };
  }, [mapControllerReadyToken]);

  return (
    <View style={styles.container}>
      <MapView
        compassEnabled={false}
        initialCameraPosition={{
          target: initialCameraTargetRef.current,
          tilt: 0,
          zoom: 13,
        }}
        indoorEnabled={false}
        mapColorScheme={mapTheme === "dark" ? MapColorScheme.DARK : MapColorScheme.LIGHT}
        mapStyle={shouldApplyMapStyle ? mapStyle : undefined}
        mapToolbarEnabled={false}
        mapType={normalBaseMapType}
        myLocationButtonEnabled={false}
        myLocationEnabled={false}
        onMapClick={onMapPress}
        onMapReady={() => {
          hasLoadedMapRef.current = true;
          setShowDiagnosticHint(false);
          setMapControllerReadyToken((currentValue) => currentValue + 1);
          setTimeout(() => {
            setShouldApplyMapStyle(true);
          }, 80);
        }}
        onMapViewControllerCreated={(controller) => {
          mapControllerRef.current = controller;
          setMapControllerReadyToken((currentValue) => currentValue + 1);
        }}
        onMarkerClick={(marker) => {
          const [kind, id] = marker.id.split(":");
          if (kind === "center" && id) {
            onCenterPress?.(id);
            return;
          }

          if (kind === "member" && id) {
            onMarkerPress?.(id);
          }
        }}
        onMarkerInfoWindowTapped={(marker) => {
          const [kind, id] = marker.id.split(":");
          if (kind === "member" && id) {
            onMarkerPress?.(id);
            return;
          }

          if (kind === "center" && id) {
            onCenterRoutePress?.(id);
          }
        }}
        rotateGesturesEnabled
        scrollGesturesEnabled
        style={styles.map}
        tiltGesturesEnabled={false}
        trafficEnabled={false}
        zoomControlsEnabled={false}
        zoomGesturesEnabled
      />
      {showDiagnosticHint ? (
        <View pointerEvents="none" style={styles.hintWrapper}>
          <View style={[styles.hintCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.hintTitle, { color: palette.title }]}>Map failed to load</Text>
            <Text style={[styles.hintBody, { color: palette.body }]}>
              Check that the Android API key is enabled for Maps SDK and Navigation SDK for package
              {" "}
              <Text style={styles.hintCode}>com.sosync.mobile</Text>
              .
            </Text>
          </View>
        </View>
      ) : null}
      {showStaleNativeBuildHint ? (
        <View pointerEvents="none" style={styles.nativeHintWrapper}>
          <View style={[styles.hintCard, { backgroundColor: palette.surface }]}>
            <Text style={[styles.hintTitle, { color: palette.title }]}>Rebuild Android dev build</Text>
            <Text style={[styles.hintBody, { color: palette.body }]}>
              SOSyncMarkerIcon is missing, so circular map avatars cannot render. Run{" "}
              <Text style={styles.hintCode}>npm run android</Text>
              {" "}once, then keep using the dev build.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const areMapOverviewPropsEqual = (prev: MapOverviewProps, next: MapOverviewProps) =>
  prev.alerts === next.alerts &&
  prev.centers === next.centers &&
  prev.focusTarget === next.focusTarget &&
  prev.highlightedCenterId === next.highlightedCenterId &&
  prev.mapTheme === next.mapTheme &&
  prev.markers === next.markers &&
  prev.onCenterPress === next.onCenterPress &&
  prev.onCenterRoutePress === next.onCenterRoutePress &&
  prev.onMapPress === next.onMapPress &&
  prev.onMarkerPress === next.onMarkerPress &&
  prev.onMemberBubbleDismiss === next.onMemberBubbleDismiss &&
  prev.selectedCenterId === next.selectedCenterId &&
  prev.selectedMarkerBubbleId === next.selectedMarkerBubbleId;

const ForwardedMapOverview = forwardRef<MapOverviewHandle, MapOverviewProps>(MapOverviewComponent);

ForwardedMapOverview.displayName = "MapOverview";

export const MapOverview = memo(ForwardedMapOverview, areMapOverviewPropsEqual);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  hintBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  hintCard: {
    borderRadius: 18,
    maxWidth: 290,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hintCode: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontWeight: "700",
  },
  hintTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  hintWrapper: {
    alignItems: "center",
    bottom: 120,
    left: 16,
    position: "absolute",
    right: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  nativeHintWrapper: {
    alignItems: "center",
    bottom: 210,
    left: 16,
    position: "absolute",
    right: 16,
  },
});

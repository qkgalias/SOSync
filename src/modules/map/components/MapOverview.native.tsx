/** Purpose: Render the Home map as a full-scene native surface with avatar markers and focus targeting. */
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { appConfig } from "@/config/appConfig";
import { getThemeTokens } from "@/theme/appTheme";
import type {
  DisasterAlert,
  EvacuationCenter,
  HomeMapAppearance,
  HomeMapFocusTarget,
  HomeMapMarker,
} from "@/types";
import { toInitials } from "@/utils/helpers";

type MapOverviewProps = {
  alerts: DisasterAlert[];
  centers: EvacuationCenter[];
  focusTarget?: HomeMapFocusTarget | null;
  highlightedCenterId?: string | null;
  mapTheme: HomeMapAppearance;
  markers: HomeMapMarker[];
  onCenterOpenMaps?: (centerId: string) => void;
  onCenterPress?: (centerId: string) => void;
  onMapPress?: () => void;
  onMarkerPress?: (markerId: string) => void;
  onMemberBubbleDismiss?: () => void;
  prefetchedMarkerPhotos?: Record<string, true>;
  selectedCenterId?: string | null;
  selectedMarkerBubbleId?: string | null;
};

export type MapOverviewHandle = {
  takeSnapshot: () => Promise<string | null>;
};

type AvatarMarkerProps = {
  marker: HomeMapMarker;
  markerPalette: ReturnType<typeof getMarkerPalette>;
  onMarkerPress?: (markerId: string) => void;
  prefetchedMarkerPhotos: Record<string, true>;
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

const getMarkerPalette = (mapTheme: HomeMapAppearance) => {
  const tokens = getThemeTokens(mapTheme);

  return mapTheme === "dark"
    ? {
        bubbleFill: tokens.surfaceElevated,
        bubbleText: tokens.textPrimary,
        markerShadow: "rgba(0, 0, 0, 0.28)",
        ring: tokens.surface,
      }
    : {
        bubbleFill: "#FFFFFF",
        bubbleText: "#472523",
        markerShadow: "rgba(0, 0, 0, 0.16)",
        ring: "#FFFFFF",
      };
};

const getCenterMarkerPalette = (mapTheme: HomeMapAppearance) => {
  const tokens = getThemeTokens(mapTheme);

  return mapTheme === "dark"
    ? {
        border: tokens.borderStrong,
        fill: tokens.surfaceElevated,
        highlightFill: tokens.accentSoft,
        icon: tokens.accentPrimary,
      }
    : {
        border: "#D8C9C4",
        fill: "#FFFFFF",
        highlightFill: "#FFF7F4",
        icon: tokens.accentPrimary,
      };
};

const getMemberBubblePalette = (mapTheme: HomeMapAppearance) => {
  const tokens = getThemeTokens(mapTheme);

  return mapTheme === "dark"
    ? {
        background: tokens.surfaceElevated,
        shadow: "rgba(0, 0, 0, 0.28)",
        text: tokens.textPrimary,
      }
    : {
        background: "#FFFFFF",
        shadow: "rgba(22, 24, 29, 0.18)",
        text: "#2E2C2C",
      };
};

const getCenterBubblePalette = (mapTheme: HomeMapAppearance) => {
  const tokens = getThemeTokens(mapTheme);

  return mapTheme === "dark"
    ? {
        actionBackground: tokens.accentSoft,
        background: tokens.surfaceElevated,
        border: tokens.borderSubtle,
        icon: tokens.accentPrimary,
        shadow: "rgba(0, 0, 0, 0.3)",
        text: tokens.textPrimary,
        textMuted: tokens.textSecondary,
      }
    : {
        actionBackground: "#FFF4F1",
        background: "#FFFFFF",
        border: "rgba(123, 44, 40, 0.12)",
        icon: tokens.accentPrimary,
        shadow: "rgba(22, 24, 29, 0.18)",
        text: "#2E2C2C",
        textMuted: "#6A6767",
      };
};

const markerTrackAfterMountMs = 260;

const toRegion = (latitude: number, longitude: number, latitudeDelta = 0.04, longitudeDelta = 0.04) => ({
  latitude,
  longitude,
  latitudeDelta,
  longitudeDelta,
});

const AvatarMarker = ({
  marker,
  markerPalette,
  onMarkerPress,
  prefetchedMarkerPhotos,
}: AvatarMarkerProps) => {
  const hasPhoto = Boolean(marker.photoURL);
  const isPhotoReady = Boolean(marker.photoURL && prefetchedMarkerPhotos[marker.photoURL]);
  const [imageError, setImageError] = useState(!hasPhoto);
  const [tracksViewChanges, setTracksViewChanges] = useState(Platform.OS === "android" && hasPhoto);

  useEffect(() => {
    setImageError(!hasPhoto);
  }, [hasPhoto, marker.photoURL]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (!hasPhoto) {
      setTracksViewChanges(false);
      return;
    }

    setTracksViewChanges(true);
    const timer = setTimeout(() => {
      setTracksViewChanges(false);
    }, markerTrackAfterMountMs);

    return () => {
      clearTimeout(timer);
    };
  }, [hasPhoto, isPhotoReady, marker.photoURL]);

  const bubbleSize = marker.isCurrentUser ? 50 : 42;
  const ringSize = marker.isCurrentUser ? 56 : 48;
  const showInitials = !hasPhoto || imageError || !isPhotoReady;

  return (
    <Marker
      coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
      identifier={marker.markerId}
      onPress={() => onMarkerPress?.(marker.markerId)}
      tracksViewChanges={Platform.OS === "android" ? tracksViewChanges : undefined}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          shadowColor: markerPalette.markerShadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 18,
        }}
      >
        <View
          style={{
            alignItems: "center",
            backgroundColor: markerPalette.ring,
            borderRadius: marker.isCurrentUser ? 28 : 24,
            height: ringSize,
            justifyContent: "center",
            padding: 3,
            width: ringSize,
          }}
        >
          <View
            style={{
              alignItems: "center",
              backgroundColor: markerPalette.bubbleFill,
              borderRadius: marker.isCurrentUser ? 25 : 21,
              height: bubbleSize,
              justifyContent: "center",
              overflow: "hidden",
              width: bubbleSize,
            }}
          >
            {showInitials ? (
              <Text
                style={{
                  color: markerPalette.bubbleText,
                  fontSize: marker.isCurrentUser ? 14 : 12,
                  fontWeight: "700",
                }}
              >
                {toInitials(marker.displayName)}
              </Text>
            ) : null}
            {hasPhoto && isPhotoReady && !imageError ? (
              <Image
                fadeDuration={0}
                onError={() => {
                  setImageError(true);
                  setTracksViewChanges(false);
                }}
                resizeMode="cover"
                source={{ uri: marker.photoURL }}
                style={{
                  height: bubbleSize,
                  width: bubbleSize,
                }}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Marker>
  );
};

const MapOverviewComponent = (
  {
    alerts,
    centers,
    focusTarget,
    highlightedCenterId,
    mapTheme,
    markers,
    onCenterOpenMaps,
    onCenterPress,
    onMapPress,
    onMarkerPress,
    onMemberBubbleDismiss,
    prefetchedMarkerPhotos = {},
    selectedCenterId = null,
    selectedMarkerBubbleId = null,
  }: MapOverviewProps,
  ref: ForwardedRef<MapOverviewHandle>,
) => {
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredCurrentUserRef = useRef(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showDiagnosticHint, setShowDiagnosticHint] = useState(false);
  const [mapViewport, setMapViewport] = useState({ height: 0, width: 0 });
  const [selectedCenterPoint, setSelectedCenterPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedCenterBubbleSize, setSelectedCenterBubbleSize] = useState({ height: 96, width: 220 });
  const [selectedMemberBubblePoint, setSelectedMemberBubblePoint] = useState<{ x: number; y: number } | null>(null);
  const [selectedMemberBubbleSize, setSelectedMemberBubbleSize] = useState({ height: 42, width: 120 });
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
  const selectedCenter = useMemo(
    () => (selectedCenterId ? centerLookup[selectedCenterId] ?? null : null),
    [centerLookup, selectedCenterId],
  );
  const selectedMemberBubbleMarker = useMemo(
    () => (selectedMarkerBubbleId ? markerLookup[selectedMarkerBubbleId] ?? null : null),
    [markerLookup, selectedMarkerBubbleId],
  );
  const currentUserInitialRegion = useMemo(
    () =>
      currentUserMarker
        ? toRegion(currentUserMarker.latitude, currentUserMarker.longitude, 0.1, 0.1)
        : null,
    [currentUserMarker],
  );
  const fallbackInitialRegion = useMemo(() => {
    const firstMarker = markers[0] ?? null;
    if (firstMarker) {
      return toRegion(firstMarker.latitude, firstMarker.longitude, 0.1, 0.1);
    }

    const preferredCenter = selectedCenter ?? centers[0] ?? null;
    if (preferredCenter) {
      return toRegion(preferredCenter.latitude, preferredCenter.longitude, 0.1, 0.1);
    }

    return appConfig.map.initialRegion;
  }, [centers, markers, selectedCenter]);
  const initialRegion = currentUserInitialRegion ?? fallbackInitialRegion;
  const markerPalette = useMemo(() => getMarkerPalette(mapTheme), [mapTheme]);
  const centerMarkerPalette = useMemo(() => getCenterMarkerPalette(mapTheme), [mapTheme]);
  const memberBubblePalette = useMemo(() => getMemberBubblePalette(mapTheme), [mapTheme]);
  const centerBubblePalette = useMemo(() => getCenterBubblePalette(mapTheme), [mapTheme]);

  const updateSelectedCenterBubblePosition = useCallback(async () => {
    if (!mapRef.current || !selectedCenter) {
      setSelectedCenterPoint(null);
      return;
    }

    try {
      const nextPoint = await mapRef.current.pointForCoordinate({
        latitude: selectedCenter.latitude,
        longitude: selectedCenter.longitude,
      });
      setSelectedCenterPoint(nextPoint);
    } catch {
      setSelectedCenterPoint(null);
    }
  }, [selectedCenter]);

  const updateSelectedMemberBubblePosition = useCallback(async () => {
    if (!mapRef.current || !selectedMemberBubbleMarker) {
      setSelectedMemberBubblePoint(null);
      return;
    }

    try {
      const nextPoint = await mapRef.current.pointForCoordinate({
        latitude: selectedMemberBubbleMarker.latitude,
        longitude: selectedMemberBubbleMarker.longitude,
      });
      setSelectedMemberBubblePoint(nextPoint);
    } catch {
      setSelectedMemberBubblePoint(null);
    }
  }, [selectedMemberBubbleMarker]);

  useImperativeHandle(
    ref,
    () => ({
      takeSnapshot: async () => {
        if (!mapRef.current) {
          return null;
        }

        try {
          return await mapRef.current.takeSnapshot({
            format: "png",
            result: "file",
          });
        } catch {
          return null;
        }
      },
    }),
    [],
  );

  const animateToCoordinate = (latitude: number, longitude: number, latitudeDelta = 0.045, longitudeDelta = 0.045) => {
    mapRef.current?.animateToRegion(toRegion(latitude, longitude, latitudeDelta, longitudeDelta), 420);
  };

  useEffect(() => {
    if (!currentUserMarker || hasCenteredCurrentUserRef.current) {
      return;
    }

    hasCenteredCurrentUserRef.current = true;
    animateToCoordinate(currentUserMarker.latitude, currentUserMarker.longitude, 0.08, 0.08);
  }, [currentUserMarker]);

  useEffect(() => {
    if (!selectedCenter || !mapLoaded) {
      setSelectedCenterPoint(null);
      return;
    }

    void updateSelectedCenterBubblePosition();
  }, [mapLoaded, selectedCenter, updateSelectedCenterBubblePosition]);

  useEffect(() => {
    if (!selectedMemberBubbleMarker || !mapLoaded) {
      setSelectedMemberBubblePoint(null);
      return;
    }

    void updateSelectedMemberBubblePosition();
  }, [mapLoaded, selectedMemberBubbleMarker, updateSelectedMemberBubblePosition]);

  useEffect(() => {
    if (!focusTarget) {
      return;
    }

    if (focusTarget.kind === "currentUser" && currentUserMarker) {
      animateToCoordinate(currentUserMarker.latitude, currentUserMarker.longitude);
      return;
    }

    if (focusTarget.kind === "marker") {
      const marker = markerLookup[focusTarget.markerId];
      if (marker) {
        animateToCoordinate(marker.latitude, marker.longitude);
      }
      return;
    }

    if (focusTarget.kind === "center") {
      const center = centerLookup[focusTarget.centerId];
      if (center) {
        animateToCoordinate(center.latitude, center.longitude, 0.06, 0.06);
      }
    }
  }, [centerLookup, currentUserMarker, focusTarget, markerLookup]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    if (mapLoaded) {
      setShowDiagnosticHint(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowDiagnosticHint(true);
    }, 6000);

    return () => {
      clearTimeout(timer);
    };
  }, [mapLoaded]);

  const hintPalette =
    mapTheme === "dark"
      ? {
          border: "rgba(255, 255, 255, 0.14)",
          body: "rgba(232, 237, 242, 0.82)",
          surface: "rgba(24, 35, 48, 0.9)",
          title: "#FFFFFF",
        }
      : {
          border: "rgba(123, 44, 40, 0.12)",
          body: "#6A6767",
          surface: "rgba(255, 255, 255, 0.94)",
          title: "#2E2C2C",
        };

  const bubbleLeft =
    selectedCenterPoint && mapViewport.width
      ? Math.min(
          Math.max(selectedCenterPoint.x - selectedCenterBubbleSize.width / 2, 12),
          Math.max(mapViewport.width - selectedCenterBubbleSize.width - 12, 12),
        )
      : 0;
  const bubbleTop =
    selectedCenterPoint && mapViewport.height
      ? Math.min(
          Math.max(selectedCenterPoint.y - selectedCenterBubbleSize.height - 18, 12),
          Math.max(mapViewport.height - selectedCenterBubbleSize.height - 12, 12),
        )
      : 0;
  const bubblePointerLeft = selectedCenterPoint
    ? Math.min(
        Math.max(selectedCenterPoint.x - bubbleLeft - 8, 18),
        Math.max(selectedCenterBubbleSize.width - 26, 18),
      )
    : 18;
  const memberBubbleLeft =
    selectedMemberBubblePoint && mapViewport.width
      ? (() => {
          const preferredRight = selectedMemberBubblePoint.x + 18;
          const maxRightAligned = Math.max(mapViewport.width - selectedMemberBubbleSize.width - 12, 12);
          if (preferredRight <= maxRightAligned) {
            return preferredRight;
          }

          return Math.max(selectedMemberBubblePoint.x - selectedMemberBubbleSize.width - 18, 12);
        })()
      : 0;
  const memberBubbleTop =
    selectedMemberBubblePoint && mapViewport.height
      ? Math.min(
          Math.max(selectedMemberBubblePoint.y - selectedMemberBubbleSize.height / 2 - 6, 12),
          Math.max(mapViewport.height - selectedMemberBubbleSize.height - 12, 12),
        )
      : 0;

  return (
    <View
      onLayout={(event) => {
        const { height, width } = event.nativeEvent.layout;
        setMapViewport((currentValue) =>
          currentValue.height === height && currentValue.width === width
            ? currentValue
            : { height, width },
        );
      }}
      style={styles.container}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapTheme === "dark" ? darkMapStyle : lightMapStyle}
        initialRegion={initialRegion}
        mapType="standard"
        moveOnMarkerPress={false}
        onMapLoaded={() => setMapLoaded(true)}
        onPress={(event) => {
          if (event.nativeEvent.action === "marker-press") {
            return;
          }

          onMapPress?.();
        }}
        onRegionChangeStart={(_, details) => {
          if (details.isGesture && selectedMemberBubbleMarker) {
            onMemberBubbleDismiss?.();
          }
        }}
        onRegionChangeComplete={(_, details) => {
          if (selectedCenter) {
            void updateSelectedCenterBubblePosition();
          }

          if (selectedMemberBubbleMarker && !details.isGesture) {
            void updateSelectedMemberBubblePosition();
          }
        }}
        rotateEnabled={false}
        showsBuildings={false}
        showsCompass={false}
        toolbarEnabled={false}
      >
        {alerts.map((alert) => (
          <Circle
            key={alert.alertId}
            center={{ latitude: alert.latitude, longitude: alert.longitude }}
            fillColor={mapTheme === "dark" ? "rgba(255, 94, 94, 0.18)" : "rgba(214, 82, 78, 0.14)"}
            radius={alertRadius[alert.severity] ?? 1400}
            strokeColor={mapTheme === "dark" ? "rgba(255, 124, 124, 0.52)" : "rgba(214, 82, 78, 0.54)"}
            strokeWidth={2}
          />
        ))}
        {centers.map((center) => (
          <Marker
            key={center.centerId}
            coordinate={{ latitude: center.latitude, longitude: center.longitude }}
            identifier={center.centerId}
            onPress={() => onCenterPress?.(center.centerId)}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor:
                  highlightedCenterId === center.centerId
                    ? centerMarkerPalette.highlightFill
                    : centerMarkerPalette.fill,
                borderColor:
                  highlightedCenterId === center.centerId ? centerMarkerPalette.icon : centerMarkerPalette.border,
                borderRadius: 18,
                borderWidth: 1,
                elevation: 2,
                height: 36,
                justifyContent: "center",
                shadowColor: markerPalette.markerShadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                width: 36,
              }}
            >
              <MaterialCommunityIcons color={centerMarkerPalette.icon} name="home-city-outline" size={18} />
            </View>
          </Marker>
        ))}
        {markers.map((marker) => {
            const photoStateKey =
              marker.photoURL && prefetchedMarkerPhotos[marker.photoURL] ? "photo-ready" : "initials-only";

            return (
              <AvatarMarker
                key={`${marker.markerId}:${photoStateKey}`}
                marker={marker}
                markerPalette={markerPalette}
                onMarkerPress={onMarkerPress}
                prefetchedMarkerPhotos={prefetchedMarkerPhotos}
              />
            );
        })}
      </MapView>
      {selectedCenter && selectedCenterPoint ? (
        <View pointerEvents="box-none" style={styles.centerBubbleLayer}>
          <View
            style={{
              left: bubbleLeft,
              position: "absolute",
              top: bubbleTop,
            }}
          >
            <View
              onLayout={(event) => {
                const { height, width } = event.nativeEvent.layout;
                setSelectedCenterBubbleSize((currentValue) =>
                  currentValue.height === height && currentValue.width === width
                    ? currentValue
                    : { height, width },
                );
              }}
              style={{
                backgroundColor: centerBubblePalette.background,
                borderColor: centerBubblePalette.border,
                borderRadius: 16,
                borderWidth: 1,
                maxWidth: 220,
                minWidth: 180,
                paddingHorizontal: 14,
                paddingVertical: 12,
                shadowColor: centerBubblePalette.shadow,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.16,
                shadowRadius: 18,
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  flexDirection: "row",
                }}
              >
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: centerBubblePalette.text,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    {selectedCenter.name}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      color: centerBubblePalette.textMuted,
                      fontSize: 13,
                      lineHeight: 18,
                      marginTop: 4,
                    }}
                  >
                    {selectedCenter.address}
                  </Text>
                </View>
                <Pressable
                  accessibilityHint="Open Maps directions to this safety hub"
                  accessibilityRole="button"
                  accessibilityLabel={`Open Maps directions to ${selectedCenter.name}`}
                  hitSlop={8}
                  onPress={() => onCenterOpenMaps?.(selectedCenter.centerId)}
                  style={({ pressed }) => ({
                    alignItems: "center",
                    backgroundColor: centerBubblePalette.actionBackground,
                    borderRadius: 999,
                    height: 40,
                    justifyContent: "center",
                    opacity: pressed ? 0.78 : 1,
                    width: 40,
                  })}
                >
                  <MaterialCommunityIcons color={centerBubblePalette.icon} name="navigation-variant" size={18} />
                </Pressable>
              </View>
            </View>
            <View
              style={{
                borderLeftColor: "transparent",
                borderLeftWidth: 8,
                borderRightColor: "transparent",
                borderRightWidth: 8,
                borderTopColor: centerBubblePalette.background,
                borderTopWidth: 10,
                height: 0,
                marginLeft: bubblePointerLeft,
                marginTop: -1,
                width: 0,
              }}
            />
          </View>
        </View>
      ) : null}
      {selectedMemberBubbleMarker && selectedMemberBubblePoint ? (
        <View pointerEvents="box-none" style={styles.centerBubbleLayer}>
          <View
            style={{
              left: memberBubbleLeft,
              position: "absolute",
              top: memberBubbleTop,
            }}
          >
            <View
              onLayout={(event) => {
                const { height, width } = event.nativeEvent.layout;
                setSelectedMemberBubbleSize((currentValue) =>
                  currentValue.height === height && currentValue.width === width
                    ? currentValue
                    : { height, width },
                );
              }}
              style={{
                backgroundColor: memberBubblePalette.background,
                borderRadius: 999,
                maxWidth: 168,
                minWidth: 84,
                paddingHorizontal: 14,
                paddingVertical: 9,
                shadowColor: memberBubblePalette.shadow,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.14,
                shadowRadius: 14,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: memberBubblePalette.text,
                  fontSize: 15,
                  fontWeight: "700",
                }}
              >
                {selectedMemberBubbleMarker.displayName}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
      {showDiagnosticHint ? (
        <View pointerEvents="none" style={styles.hintWrapper}>
          <View
            style={[
              styles.hintCard,
              {
                backgroundColor: hintPalette.surface,
                borderColor: hintPalette.border,
              },
            ]}
          >
            <Text style={[styles.hintTitle, { color: hintPalette.title }]}>Map tiles failed to load</Text>
            <Text style={[styles.hintBody, { color: hintPalette.body }]}>
              On Android this usually means the Google Maps key is not authorized for package
              {" "}
              <Text style={styles.hintCode}>com.sosync.mobile</Text>
              {" "}
              and the current debug SHA1. Run
              {" "}
              <Text style={styles.hintCode}>npm run doctor:android-live</Text>
              {" "}
              to see the exact fingerprint.
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
  prev.onCenterOpenMaps === next.onCenterOpenMaps &&
  prev.onCenterPress === next.onCenterPress &&
  prev.onMapPress === next.onMapPress &&
  prev.onMarkerPress === next.onMarkerPress &&
  prev.onMemberBubbleDismiss === next.onMemberBubbleDismiss &&
  prev.prefetchedMarkerPhotos === next.prefetchedMarkerPhotos &&
  prev.selectedCenterId === next.selectedCenterId &&
  prev.selectedMarkerBubbleId === next.selectedMarkerBubbleId;

const ForwardedMapOverview = forwardRef<MapOverviewHandle, MapOverviewProps>(MapOverviewComponent);

ForwardedMapOverview.displayName = "MapOverview";

export const MapOverview = memo(ForwardedMapOverview, areMapOverviewPropsEqual);
const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  centerBubbleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  hintBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  hintCard: {
    borderRadius: 18,
    borderWidth: 1,
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
    bottom: 118,
    left: 16,
    position: "absolute",
    right: 16,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

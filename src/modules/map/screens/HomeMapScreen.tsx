/** Purpose: Compose the Home map scene from a controller hook and focused presentational pieces. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Linking, Platform, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomSheet, { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from "react-native-reanimated";

import { useFloodRisk } from "@/hooks/useFloodRisk";
import { FloodRiskBottomSheet } from "@/modules/map/components/FloodRiskBottomSheet";
import { MapOverview } from "@/modules/map/components/MapOverview";
import { WeatherBottomSheet } from "@/modules/map/components/WeatherBottomSheet";
import { HomeContactRow } from "@/modules/map/components/HomeContactRow";
import { HomeContactsEmptyState } from "@/modules/map/components/HomeContactsEmptyState";
import { HomeQuickMemberStack } from "@/modules/map/components/HomeQuickMemberStack";
import { HomeSafetyHubFooter } from "@/modules/map/components/HomeSafetyHubFooter";
import {
  HomeSheetHeader,
  type HomeSheetWeatherPreview,
} from "@/modules/map/components/HomeSheetHeader";
import {
  getHomeShadowStyle,
} from "@/modules/map/homeMapTheme";
import type { HomeContactItem } from "@/modules/map/homeMapTheme";
import { useHomeMapController } from "@/modules/map/screens/useHomeMapController";
import {
  formatHomeWeatherHeadline,
  resolveHomeWeatherLocationLabel,
} from "@/modules/map/weatherPresentation";
import { toCallHref } from "@/utils/helpers";

export default function HomeMapScreen() {
  const isFocused = useIsFocused();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const {
    activeGroupName,
    activeHubCenter,
    addressLabel,
    appearance,
    centers,
    contactItems,
    currentLocation,
    focusTarget,
    groups,
    handleCenterOpenMaps,
    handleCenterPress,
    handleFocusCurrentUser,
    handleFocusNearestHub,
    handleMapPress,
    handleMarkerFocus,
    handleMemberBubbleDismiss,
    handleOpenHubInMaps,
    handleOpenSos,
    handleToggleSharing,
    handleTrustedCircleSelect,
    hubSummaryLabel,
    isSheetFullyExpanded,
    isSharingLive,
    mapOverviewRef,
    mapSnapshotAnimatedStyle,
    mapSnapshotUri,
    nearestCenter,
    palette,
    permissionStatus,
    prefetchedMarkerPhotos,
    quickMemberMarkers,
    reverseGeocodedLocality,
    requestLocationAccess,
    selectedCenterId,
    selectedMarkerBubbleId,
    selectedGroupId,
    selectedMarkerId,
    sheetAnimatedIndex,
    sheetAnimationConfigs,
    sheetContentPaddingBottom,
    sheetSnapPoints,
    setSheetIndex,
    stableAlerts,
    stableHomeMarkers,
  } = useHomeMapController();
  const floodRiskModalRef = useRef<BottomSheetModal | null>(null);
  const weatherModalRef = useRef<BottomSheetModal | null>(null);
  const [isHomeToolAreaPressable, setIsHomeToolAreaPressable] = useState(true);
  const [isFloodRiskOpening, setIsFloodRiskOpening] = useState(false);
  const [isFloodRiskOpen, setIsFloodRiskOpen] = useState(false);
  const [isWeatherOpening, setIsWeatherOpening] = useState(false);
  const [isWeatherOpen, setIsWeatherOpen] = useState(false);
  const {
    data: floodRisk,
    error: floodRiskError,
    isRefreshing: isFloodRiskRefreshing,
    refresh: refreshFloodRisk,
    status: floodRiskStatus,
  } = useFloodRisk(currentLocation, isFocused);
  const collapsedSheetHeight = useMemo(() => {
    const firstSnapPoint = sheetSnapPoints[0];
    if (typeof firstSnapPoint === "string" && firstSnapPoint.endsWith("%")) {
      return (Number.parseFloat(firstSnapPoint) / 100) * windowHeight;
    }

    return Number(firstSnapPoint ?? 0);
  }, [sheetSnapPoints, windowHeight]);
  const weatherPreview = useMemo<HomeSheetWeatherPreview>(() => {
    const currentWeather = floodRisk?.currentWeather;
    const apiLocationLabel = floodRisk?.location.label;

    if (
      currentWeather &&
      (Number.isFinite(currentWeather.temperatureC) || currentWeather.weatherCode !== undefined)
    ) {
      return {
        headlineText: formatHomeWeatherHeadline({
          temperatureC: currentWeather.temperatureC,
          weatherCode: currentWeather.weatherCode,
        }),
        locationText: resolveHomeWeatherLocationLabel({
          apiLocationLabel,
          fallback: "Your area",
          reverseGeocodedLocality,
        }),
        variant: "ready",
      };
    }

    if (permissionStatus === "denied" && !floodRisk) {
      return {
        headlineText: "Turn on location",
        locationText: "Allow location access for local weather",
        variant: "permission",
      };
    }

    if (
      (floodRiskStatus === "loading" || (floodRiskStatus === "idle" && permissionStatus === "granted")) &&
      !floodRisk
    ) {
      return {
        headlineText: "Checking weather",
        locationText: resolveHomeWeatherLocationLabel({
          apiLocationLabel,
          fallback: "Getting current conditions",
          reverseGeocodedLocality,
        }),
        variant: "loading",
      };
    }

    return {
      headlineText: "Weather unavailable",
      locationText: resolveHomeWeatherLocationLabel({
        apiLocationLabel,
        fallback: "Try again from Weather",
        reverseGeocodedLocality,
      }),
      variant: "unavailable",
    };
  }, [floodRisk, floodRiskStatus, permissionStatus, reverseGeocodedLocality]);
  const topBarStyle = useMemo(
    () => ({
      ...getHomeShadowStyle(appearance, "floatingSurface"),
      alignSelf: "center" as const,
      backgroundColor: palette.topPill,
      borderRadius: 999,
      width: Math.min(windowWidth - 56, 680),
    }),
    [appearance, palette.topPill, windowWidth],
  );
  const homeToolButtonStyle = useMemo(
    () => ({
      ...getHomeShadowStyle(appearance, "secondaryButton"),
      alignItems: "center" as const,
      backgroundColor: appearance === "dark" ? palette.floatingSurface : "#FFFFFF",
      borderRadius: 999,
      flexDirection: "row" as const,
      paddingHorizontal: 18,
      paddingVertical: 14,
    }),
    [appearance, palette.floatingSurface],
  );
  const bottomSheetBackgroundStyle = useMemo(
    () => ({
      ...getHomeShadowStyle(appearance, "sheet"),
      backgroundColor: palette.sheet,
      borderTopLeftRadius: 34,
      borderTopRightRadius: 34,
    }),
    [appearance, palette.sheet],
  );
  const homeToolVisibleThreshold = 0.08;
  const topIndex = Math.max(sheetSnapPoints.length - 1, 0);
  const topChromeFadeStartIndex = Math.max(topIndex - 0.08, 0);
  const topChromeFadeEndIndex = Math.max(topIndex - 0.01, 0);
  const topBarAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        sheetAnimatedIndex.value,
        [topChromeFadeStartIndex, topChromeFadeEndIndex],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  }, [sheetAnimatedIndex, topChromeFadeEndIndex, topChromeFadeStartIndex]);

  useAnimatedReaction(
    () => sheetAnimatedIndex.value <= homeToolVisibleThreshold,
    (nextValue, previousValue) => {
      if (nextValue !== previousValue) {
        runOnJS(setIsHomeToolAreaPressable)(nextValue);
      }
    },
    [homeToolVisibleThreshold, sheetAnimatedIndex],
  );

  const homeToolAreaAnimatedStyle = useAnimatedStyle(() => ({
    opacity: sheetAnimatedIndex.value <= homeToolVisibleThreshold ? 1 : 0,
  }), [homeToolVisibleThreshold]);
  const isAnyOutlookModalActive = isFloodRiskOpening || isFloodRiskOpen || isWeatherOpening || isWeatherOpen;

  const handleOpenFloodRisk = () => {
    if (isAnyOutlookModalActive) {
      return;
    }

    setIsFloodRiskOpening(true);
    floodRiskModalRef.current?.present();
  };

  const handleOpenWeather = () => {
    if (isAnyOutlookModalActive) {
      return;
    }

    setIsWeatherOpening(true);
    weatherModalRef.current?.present();
  };

  const handleFloodRiskSheetChange = (index: number) => {
    if (index >= 0) {
      setIsFloodRiskOpen(true);
      setIsFloodRiskOpening(false);
    }
  };

  const handleWeatherSheetChange = (index: number) => {
    if (index >= 0) {
      setIsWeatherOpen(true);
      setIsWeatherOpening(false);
    }
  };

  const handleDismissFloodRisk = () => {
    setIsFloodRiskOpen(false);
    setIsFloodRiskOpening(false);
  };

  const handleDismissWeather = () => {
    setIsWeatherOpen(false);
    setIsWeatherOpening(false);
  };

  const handleRequestFloodLocationAccess = () => {
    void requestLocationAccess().then((granted) => {
      if (granted) {
        void refreshFloodRisk();
      }
    });
  };

  const handleCallContact = (name: string, phoneNumber: string) => {
    Alert.alert(name, `${phoneNumber}\n\nCall this contact now?`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Call",
        onPress: () => {
          void Linking.openURL(toCallHref(phoneNumber));
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.page }}>
      <StatusBar style={appearance === "dark" ? "light" : "dark"} />
      <View className="flex-1">
        <View
          style={{
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        >
          <MapOverview
            ref={mapOverviewRef}
            alerts={stableAlerts}
            centers={centers}
            focusTarget={focusTarget}
            highlightedCenterId={selectedCenterId}
            mapTheme={appearance}
            markers={stableHomeMarkers}
            onCenterOpenMaps={handleCenterOpenMaps}
            onCenterPress={handleCenterPress}
            onMapPress={handleMapPress}
            onMarkerPress={handleMarkerFocus}
            onMemberBubbleDismiss={handleMemberBubbleDismiss}
            prefetchedMarkerPhotos={prefetchedMarkerPhotos}
            selectedCenterId={selectedCenterId}
            selectedMarkerBubbleId={selectedMarkerBubbleId}
          />
          {Platform.OS === "android" && mapSnapshotUri ? (
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  bottom: 0,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                },
                mapSnapshotAnimatedStyle,
              ]}
            >
              <Image
                resizeMode="cover"
                source={{ uri: mapSnapshotUri }}
                style={{
                  bottom: 0,
                  left: 0,
                  position: "absolute",
                  right: 0,
                  top: 0,
                }}
              />
            </Animated.View>
          ) : null}
        </View>

        <Animated.View
          className="absolute left-0 right-0 top-0 z-10 px-4"
          pointerEvents={isSheetFullyExpanded ? "none" : "box-none"}
          style={topBarAnimatedStyle}
        >
          <View className="mt-2 flex-row items-center px-4 py-3" style={topBarStyle}>
            <MaterialCommunityIcons color={palette.iconTint} name="map-marker-radius-outline" size={18} />
            <Text
              className="ml-3 flex-1 text-[13px]"
              numberOfLines={1}
              style={{ color: palette.sheetText }}
            >
              {addressLabel}
            </Text>
            <View className="ml-3 flex-row gap-2">
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={!currentLocation}
                onPress={handleFocusCurrentUser}
                style={{ opacity: currentLocation ? 1 : 0.42 }}
              >
                <MaterialCommunityIcons color={palette.iconTint} name="crosshairs-gps" size={18} />
              </Pressable>
              <Pressable
                className="h-10 w-10 items-center justify-center rounded-full"
                disabled={!nearestCenter}
                onPress={handleFocusNearestHub}
                style={{ opacity: nearestCenter ? 1 : 0.42 }}
              >
                <MaterialCommunityIcons color={palette.iconTint} name="map-marker-path" size={18} />
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <HomeQuickMemberStack
          fadeEndIndex={topChromeFadeEndIndex}
          fadeStartIndex={topChromeFadeStartIndex}
          isSheetFullyExpanded={isSheetFullyExpanded}
          markers={quickMemberMarkers}
          onFocusMarker={handleMarkerFocus}
          palette={palette}
          selectedMarkerId={selectedMarkerId}
          sheetAnimatedIndex={sheetAnimatedIndex}
        />

        <Animated.View
          pointerEvents={isHomeToolAreaPressable && !isAnyOutlookModalActive ? "auto" : "none"}
          style={[
            {
              bottom: collapsedSheetHeight - 18,
              left: 20,
              position: "absolute",
              zIndex: 24,
            },
            homeToolAreaAnimatedStyle,
          ]}
        >
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              disabled={!isHomeToolAreaPressable || isAnyOutlookModalActive}
              onPress={handleOpenFloodRisk}
              style={homeToolButtonStyle}
            >
              <MaterialCommunityIcons
                color={palette.iconTint}
                name="waves-arrow-up"
                size={18}
              />
              <Text
                className="ml-2.5 text-[15px] font-semibold"
                style={{ color: palette.sheetText }}
              >
                Flood risk
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!isHomeToolAreaPressable || isAnyOutlookModalActive}
              onPress={handleOpenWeather}
              style={homeToolButtonStyle}
            >
              <MaterialCommunityIcons
                color={palette.iconTint}
                name="weather-partly-cloudy"
                size={18}
              />
              <Text
                className="ml-2.5 text-[15px] font-semibold"
                style={{ color: palette.sheetText }}
              >
                Weather
              </Text>
            </Pressable>
          </View>
        </Animated.View>

        <BottomSheet
          animationConfigs={sheetAnimationConfigs}
          animatedIndex={sheetAnimatedIndex}
          backgroundStyle={bottomSheetBackgroundStyle}
          enableDynamicSizing={false}
          enableOverDrag={false}
          enablePanDownToClose={false}
          handleIndicatorStyle={{
            backgroundColor: palette.sheetHandle,
            height: 6,
            width: 56,
          }}
          handleStyle={{
            paddingBottom: 8,
            paddingTop: 12,
          }}
          index={0}
          onChange={setSheetIndex}
          snapPoints={sheetSnapPoints}
          style={{ zIndex: 20 }}
        >
          <BottomSheetFlatList<HomeContactItem>
            contentContainerStyle={{ flexGrow: 1, paddingBottom: sheetContentPaddingBottom }}
            data={contactItems}
            keyExtractor={(item: HomeContactItem) => item.member.userId}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<HomeContactsEmptyState palette={palette} />}
            ListFooterComponent={
              <View style={{ marginTop: "auto" }}>
                <HomeSafetyHubFooter
                  activeHubCenter={activeHubCenter}
                  appearance={appearance}
                  hubSummaryLabel={hubSummaryLabel}
                  nearestCenterId={nearestCenter?.centerId ?? null}
                  onOpenInMaps={() => {
                    void handleOpenHubInMaps();
                  }}
                  palette={palette}
                />
              </View>
            }
            ListHeaderComponent={
              <HomeSheetHeader
                activeGroupName={activeGroupName}
                appearance={appearance}
                groups={groups}
                isSharingLive={isSharingLive}
                onOpenSos={handleOpenSos}
                onSelectGroup={handleTrustedCircleSelect}
                onToggleSharing={handleToggleSharing}
                palette={palette}
                selectedGroupId={selectedGroupId}
                weatherPreview={weatherPreview}
              />
            }
            nestedScrollEnabled
            renderItem={({ item }: { item: HomeContactItem }) => (
              <HomeContactRow
                item={item}
                onCallContact={handleCallContact}
                onFocusMarker={handleMarkerFocus}
                palette={palette}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </BottomSheet>

        <FloodRiskBottomSheet
          ref={floodRiskModalRef}
          error={floodRiskError}
          floodRisk={floodRisk}
          isRefreshing={isFloodRiskRefreshing}
          onChange={handleFloodRiskSheetChange}
          onDismiss={handleDismissFloodRisk}
          onOpenSettings={() => {
            void Linking.openSettings();
          }}
          onRefresh={() => {
            void refreshFloodRisk();
          }}
          onRequestLocationAccess={handleRequestFloodLocationAccess}
          permissionStatus={permissionStatus}
          reverseGeocodedLocality={reverseGeocodedLocality}
          status={floodRiskStatus}
        />

        <WeatherBottomSheet
          ref={weatherModalRef}
          error={floodRiskError}
          floodRisk={floodRisk}
          isRefreshing={isFloodRiskRefreshing}
          onChange={handleWeatherSheetChange}
          onDismiss={handleDismissWeather}
          onOpenSettings={() => {
            void Linking.openSettings();
          }}
          onRefresh={() => {
            void refreshFloodRisk();
          }}
          onRequestLocationAccess={handleRequestFloodLocationAccess}
          permissionStatus={permissionStatus}
          status={floodRiskStatus}
        />
      </View>
    </SafeAreaView>
  );
}

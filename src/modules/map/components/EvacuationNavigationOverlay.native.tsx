/** Purpose: Run Google Navigation SDK guidance to an evacuation center inside SOSync. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  NavigationNightMode,
  NavigationSessionStatus,
  NavigationUIEnabledPreference,
  NavigationView,
  RouteStatus,
  useNavigation,
  type TimeAndDistance,
} from "@googlemaps/react-native-navigation-sdk";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import {
  formatNavigationArrivalTime,
  formatNavigationDistance,
  formatNavigationDuration,
  formatNavigationRetryAfter,
} from "@/modules/map/evacuationNavigationHelpers";
import { getHomeMapPalette, getHomeShadowStyle } from "@/modules/map/homeMapTheme";
import {
  evacuationTravelModeLabels,
  toGoogleNavigationTravelMode,
} from "@/modules/map/routeUtils";
import { NavigationAuthorizationError, apiService } from "@/services/apiService";
import type { EvacuationCenter, EvacuationTravelMode, HomeMapAppearance, MapCoordinate } from "@/types";

type EvacuationNavigationOverlayProps = {
  appearance: HomeMapAppearance;
  center: EvacuationCenter | null;
  currentLocation: MapCoordinate | null;
  onClose: () => void;
  onTravelModeChange: (travelMode: EvacuationTravelMode) => void;
  selectedTravelMode: EvacuationTravelMode;
};

type NavigationPhase = "preview" | "guiding";

const travelModes: EvacuationTravelMode[] = ["walk", "two_wheeler", "four_wheeler"];
const countDownTickMs = 1000;
const bottomNavigationClearance = 78;
const previewContentBottomPadding = 28;

const travelModeIcons: Record<EvacuationTravelMode, keyof typeof MaterialCommunityIcons.glyphMap> = {
  walk: "walk",
  two_wheeler: "motorbike",
  four_wheeler: "car",
};

const getTravelModeRouteTraits = (travelMode: EvacuationTravelMode) => {
  if (travelMode === "walk") {
    return ["Mostly flat", "Easy walk"];
  }

  if (travelMode === "two_wheeler") {
    return ["Road access", "Quick ride"];
  }

  return ["Road access", "Standard route"];
};

const toInitErrorMessage = (status: NavigationSessionStatus) => {
  if (status === NavigationSessionStatus.NOT_AUTHORIZED) {
    return "Navigation is not authorized for this API key. Enable Navigation SDK for this Android key.";
  }

  if (status === NavigationSessionStatus.LOCATION_PERMISSION_MISSING) {
    return "Location permission is required before navigation can start.";
  }

  if (status === NavigationSessionStatus.NETWORK_ERROR) {
    return "Navigation could not connect. Check your connection and try again.";
  }

  if (status === NavigationSessionStatus.TERMS_NOT_ACCEPTED) {
    return "Navigation terms must be accepted before guidance can start.";
  }

  return "Navigation could not start. Please try again.";
};

const toRouteErrorMessage = (status: RouteStatus) => {
  if (status === RouteStatus.NO_ROUTE_FOUND) {
    return "No route was found for this evacuation center and mode.";
  }

  if (status === RouteStatus.QUOTA_CHECK_FAILED) {
    return "Navigation quota is unavailable right now. Please try again later.";
  }

  if (status === RouteStatus.LOCATION_DISABLED || status === RouteStatus.LOCATION_UNKNOWN) {
    return "SOSync could not resolve your current location for navigation.";
  }

  if (status === RouteStatus.NETWORK_ERROR) {
    return "Navigation could not connect. Check your connection and try again.";
  }

  return "SOSync could not calculate that navigation route.";
};

export const EvacuationNavigationOverlay = ({
  appearance,
  center,
  currentLocation,
  onClose,
  onTravelModeChange,
  selectedTravelMode,
}: EvacuationNavigationOverlayProps) => {
  const {
    navigationController,
    removeAllListeners,
    setOnRemainingTimeOrDistanceChanged,
  } = useNavigation();
  const insets = useSafeAreaInsets();
  const palette = useMemo(() => getHomeMapPalette(appearance), [appearance]);
  const [phase, setPhase] = useState<NavigationPhase>("preview");
  const [statusLabel, setStatusLabel] = useState("Preparing route...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [timeAndDistance, setTimeAndDistance] = useState<TimeAndDistance | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isGuidanceLoading, setIsGuidanceLoading] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const operationTokenRef = useRef(0);
  const previousTravelModeRef = useRef<EvacuationTravelMode>(selectedTravelMode);
  const bottomSheetRef = useRef<BottomSheet | null>(null);
  const previewSnapPoints = useMemo(() => ["22%", "72%"], []);
  const guidanceSnapPoints = useMemo(() => ["18%", "40%"], []);
  const activeSnapPoints = phase === "guiding" ? guidanceSnapPoints : previewSnapPoints;
  const expandBottomSheet = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(1);
  }, []);
  const bottomSheetContentBottomPadding = insets.bottom + bottomNavigationClearance + previewContentBottomPadding;

  const stopGuidance = useCallback(() => {
    void navigationController.stopGuidance().catch(() => undefined);
    void navigationController.clearDestinations().catch(() => undefined);
  }, [navigationController]);

  const syncTimeAndDistance = useCallback(async () => {
    const nextTimeAndDistance = await navigationController.getCurrentTimeAndDistance().catch(() => null);
    setTimeAndDistance(nextTimeAndDistance);
    return nextTimeAndDistance;
  }, [navigationController]);

  const prepareRoutePreview = useCallback(async () => {
    if (!center) {
      return false;
    }

    operationTokenRef.current += 1;
    const operationToken = operationTokenRef.current;

    setIsPreviewLoading(true);
    setErrorMessage(null);
    setRetryAfterSeconds(null);
    setStatusLabel("Preparing route...");

    const acceptedTerms = await navigationController.showTermsAndConditionsDialog();
    if (operationToken !== operationTokenRef.current) {
      return false;
    }

    if (!acceptedTerms) {
      setErrorMessage("Navigation terms must be accepted before route preview can continue.");
      setIsPreviewLoading(false);
      return false;
    }

    const initStatus = await navigationController.init();
    if (operationToken !== operationTokenRef.current) {
      return false;
    }

    if (initStatus !== NavigationSessionStatus.OK) {
      setErrorMessage(toInitErrorMessage(initStatus));
      setIsPreviewLoading(false);
      return false;
    }

    const routeStatus = await navigationController.setDestination(
      {
        position: {
          lat: center.latitude,
          lng: center.longitude,
        },
        title: center.name,
      },
      {
        displayOptions: {
          showDestinationMarkers: true,
        },
        routingOptions: {
          travelMode: toGoogleNavigationTravelMode(selectedTravelMode),
        },
      },
    );

    if (operationToken !== operationTokenRef.current) {
      return false;
    }

    if (routeStatus !== RouteStatus.OK) {
      setErrorMessage(toRouteErrorMessage(routeStatus));
      setStatusLabel("Route unavailable");
      setTimeAndDistance(null);
      setIsPreviewLoading(false);
      return false;
    }

    await syncTimeAndDistance();
    if (operationToken !== operationTokenRef.current) {
      return false;
    }

    setStatusLabel("Ready to start");
    setIsPreviewLoading(false);
    return true;
  }, [center, navigationController, selectedTravelMode, syncTimeAndDistance]);

  const startGuidanceFlow = useCallback(async () => {
    if (!center) {
      return;
    }

    if (!currentLocation) {
      setErrorMessage("Your current location is required before navigation can start.");
      return;
    }

    operationTokenRef.current += 1;
    const operationToken = operationTokenRef.current;

    setIsGuidanceLoading(true);
    setErrorMessage(null);
    setRetryAfterSeconds(null);
    setStatusLabel(phase === "guiding" ? "Switching travel mode..." : "Starting guidance...");

    try {
      const initStatus = await navigationController.init();
      if (operationToken !== operationTokenRef.current) {
        return;
      }

      if (initStatus !== NavigationSessionStatus.OK) {
        setErrorMessage(toInitErrorMessage(initStatus));
        setPhase("preview");
        return;
      }

      await apiService.authorizeEvacuationNavigationStart({
        destination: {
          centerId: center.centerId,
          latitude: center.latitude,
          longitude: center.longitude,
        },
        origin: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        },
        travelMode: selectedTravelMode,
      });

      if (operationToken !== operationTokenRef.current) {
        return;
      }

      const routeStatus = await navigationController.setDestination(
        {
          position: {
            lat: center.latitude,
            lng: center.longitude,
          },
          title: center.name,
        },
        {
          displayOptions: {
            showDestinationMarkers: true,
          },
          routingOptions: {
            travelMode: toGoogleNavigationTravelMode(selectedTravelMode),
          },
        },
      );

      if (operationToken !== operationTokenRef.current) {
        return;
      }

      if (routeStatus !== RouteStatus.OK) {
        setErrorMessage(toRouteErrorMessage(routeStatus));
        setPhase("preview");
        return;
      }

      await syncTimeAndDistance();
      await navigationController.startGuidance();
      if (operationToken !== operationTokenRef.current) {
        return;
      }

      setPhase("guiding");
      setStatusLabel("Navigation active");
    } catch (error) {
      if (error instanceof NavigationAuthorizationError) {
        if (error.code === "rate_limited") {
          setRetryAfterSeconds(error.retryAfterSeconds ?? null);
          setErrorMessage(formatNavigationRetryAfter(error.retryAfterSeconds));
        } else {
          setErrorMessage(error.message);
        }
      } else {
        setErrorMessage("Navigation could not start. Please try again.");
      }

      setPhase("preview");
    } finally {
      if (operationToken === operationTokenRef.current) {
        setIsGuidanceLoading(false);
      }
    }
  }, [center, currentLocation, navigationController, phase, selectedTravelMode, syncTimeAndDistance]);

  useEffect(() => {
    setPhase("preview");
    setStatusLabel("Preparing route...");
    setErrorMessage(null);
    setRetryAfterSeconds(null);
    setTimeAndDistance(null);
    previousTravelModeRef.current = selectedTravelMode;
  }, [center?.centerId]);

  useEffect(() => {
    expandBottomSheet();
  }, [expandBottomSheet, phase]);

  useEffect(() => {
    if (phase === "preview") {
      previousTravelModeRef.current = selectedTravelMode;
    }
  }, [phase, selectedTravelMode]);

  useEffect(() => {
    setOnRemainingTimeOrDistanceChanged((nextTimeAndDistance) => {
      setTimeAndDistance(nextTimeAndDistance);
    });

    return () => {
      removeAllListeners();
    };
  }, [removeAllListeners, setOnRemainingTimeOrDistanceChanged]);

  useEffect(() => {
    if (!center || phase !== "preview" || isGuidanceLoading) {
      return;
    }

    void prepareRoutePreview();
  }, [center, isGuidanceLoading, phase, prepareRoutePreview, previewNonce]);

  useEffect(() => {
    if (!center || phase !== "guiding" || isGuidanceLoading) {
      return;
    }

    if (previousTravelModeRef.current === selectedTravelMode) {
      return;
    }

    previousTravelModeRef.current = selectedTravelMode;
    void startGuidanceFlow();
  }, [center, isGuidanceLoading, phase, selectedTravelMode]);

  useEffect(() => {
    if (!retryAfterSeconds || retryAfterSeconds <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setRetryAfterSeconds((currentValue) => {
        if (!currentValue || currentValue <= 1) {
          setErrorMessage("Navigation authorization is ready again. Try again.");
          return null;
        }

        const nextValue = currentValue - 1;
        setErrorMessage(formatNavigationRetryAfter(nextValue));
        return nextValue;
      });
    }, countDownTickMs);

    return () => {
      clearTimeout(timer);
    };
  }, [retryAfterSeconds]);

  useEffect(() => {
    return () => {
      operationTokenRef.current += 1;
      stopGuidance();
    };
  }, [stopGuidance]);

  if (!center) {
    return null;
  }

  const isDark = appearance === "dark";
  const isBusy = isPreviewLoading || isGuidanceLoading;
  const arrivalTimeLabel = formatNavigationArrivalTime(timeAndDistance?.seconds);
  const durationLabel = formatNavigationDuration(timeAndDistance?.seconds);
  const distanceLabel = formatNavigationDistance(timeAndDistance?.meters);
  const routeTraits = getTravelModeRouteTraits(selectedTravelMode);
  const routeSectionHeading = phase === "guiding" ? "Current route" : "Selected route";
  const inlineStatusTone = errorMessage ? "#B42318" : palette.sheetTextMuted;
  const shouldShowRetryAction = Boolean(errorMessage || (retryAfterSeconds && retryAfterSeconds > 0));

  return (
    <View style={styles.container}>
      <NavigationView
        footerEnabled={false}
        headerEnabled={false}
        initialCameraPosition={{
          target: {
            lat: center.latitude,
            lng: center.longitude,
          },
          tilt: 45,
          zoom: 16,
        }}
        navigationNightMode={isDark ? NavigationNightMode.FORCE_NIGHT : NavigationNightMode.FORCE_DAY}
        navigationUIEnabledPreference={NavigationUIEnabledPreference.AUTOMATIC}
        recenterButtonEnabled={phase === "guiding"}
        reportIncidentButtonEnabled={false}
        speedLimitIconEnabled={phase === "guiding"}
        speedometerEnabled={phase === "guiding" && selectedTravelMode !== "walk"}
        style={StyleSheet.absoluteFill}
        tripProgressBarEnabled={false}
      />

      <BottomSheet
        ref={bottomSheetRef}
        backgroundStyle={[
          styles.sheet,
          getHomeShadowStyle(appearance, "sheet"),
          {
            backgroundColor: palette.sheet,
            borderTopColor: palette.divider,
          },
        ]}
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
        index={1}
        snapPoints={activeSnapPoints}
      >
        <BottomSheetView className="px-5" style={{ paddingBottom: bottomSheetContentBottomPadding }}>
        <View className="mt-1 flex-row items-start">
          <View className="mr-4 mt-1">
            <BackButton
              onPress={() => {
                if (phase === "guiding") {
                  stopGuidance();
                }
                onClose();
              }}
              testID="navigation-back-button"
            />
          </View>

          <View className="flex-1 pr-1">
            <Text className="text-[26px] font-semibold" style={{ color: palette.sheetText }}>
              {phase === "guiding" ? "Navigation" : "Route preview"}
            </Text>
            <Text className="mt-2 text-[22px] font-semibold" numberOfLines={1} style={{ color: palette.sheetText }}>
              {center.name}
            </Text>
            <Text className="mt-1 text-[14px]" numberOfLines={2} style={{ color: palette.sheetTextMuted }}>
              {center.address}
            </Text>
          </View>
        </View>

        <View
          className="mt-4 flex-row overflow-hidden rounded-[16px] border"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
            borderColor: isDark ? "rgba(255,255,255,0.14)" : "#E9DAD4",
          }}
        >
          {travelModes.map((travelMode) => {
            const isSelected = selectedTravelMode === travelMode;

            return (
              <Pressable
                key={travelMode}
              onPress={() => {
                expandBottomSheet();
                onTravelModeChange(travelMode);
              }}
                style={[
                  styles.travelModeButton,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(255,255,255,0.1)"
                        : "#FAECE8"
                      : "transparent",
                    borderRightColor:
                      travelMode !== "four_wheeler"
                        ? isDark
                          ? "rgba(255,255,255,0.08)"
                          : "#E9DAD4"
                        : "transparent",
                    borderRightWidth: travelMode !== "four_wheeler" ? StyleSheet.hairlineWidth : 0,
                  },
                ]}
              >
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons
                    color={isSelected ? palette.share : palette.sheetTextMuted}
                    name={travelModeIcons[travelMode]}
                    size={18}
                  />
                  <Text
                    className="ml-2 text-[13px] font-semibold"
                    style={{ color: isSelected ? palette.share : palette.sheetTextMuted }}
                  >
                    {evacuationTravelModeLabels[travelMode]}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View
          className="mt-4 rounded-[26px] border px-5 py-5"
          style={{
            backgroundColor: palette.floatingSurface,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "#EFE4DF",
          }}
        >
          <Text className="text-[15px] font-semibold" style={{ color: palette.share }}>
            {routeSectionHeading}
          </Text>

          <View className="mt-4 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[52px] font-semibold leading-[56px]" style={{ color: palette.share }}>
                {durationLabel}
              </Text>
              <View className="mt-3 flex-row flex-wrap items-center">
                <MaterialCommunityIcons color={palette.sheetTextMuted} name={travelModeIcons[selectedTravelMode]} size={20} />
                <Text className="ml-2 text-[15px]" style={{ color: palette.sheetTextMuted }}>
                  {distanceLabel}
                  {arrivalTimeLabel ? ` • Arrive ${arrivalTimeLabel}` : ""}
                </Text>
              </View>
            </View>

            {isBusy ? <ActivityIndicator color={palette.share} size="small" /> : null}
          </View>

          <View className="mt-5 flex-row items-center">
            <MaterialCommunityIcons color={palette.sheetTextMuted} name="check-circle" size={20} />
            <Text className="ml-2 text-[15px] font-medium" style={{ color: palette.sheetTextMuted }}>
              {routeTraits[0]}
            </Text>
            <View
              className="mx-4 h-6 w-px"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "#E6D7D0" }}
            />
            <MaterialCommunityIcons color={palette.sheetTextMuted} name="signal-cellular-2" size={18} />
            <Text className="ml-2 text-[15px] font-medium" style={{ color: palette.sheetTextMuted }}>
              {routeTraits[1]}
            </Text>
          </View>

          {errorMessage || phase === "guiding" ? (
            <Text className="mt-4 text-[14px] leading-[20px]" style={{ color: inlineStatusTone }}>
              {errorMessage ?? statusLabel}
            </Text>
          ) : null}

          <View className="mt-5 flex-row gap-3">
            {phase === "guiding" ? (
              <Pressable
                testID="navigation-stop-button"
                onPress={() => {
                  stopGuidance();
                  onClose();
                }}
                style={[
                  getHomeShadowStyle(appearance, "secondaryButton"),
                  styles.primaryAction,
                  {
                    backgroundColor: palette.chip,
                    borderColor: isDark ? "rgba(255,255,255,0.14)" : "#E7D8D1",
                    borderWidth: 1,
                  },
                ]}
              >
                <MaterialCommunityIcons color={palette.share} name="stop-circle-outline" size={18} />
                <Text className="ml-2 text-[16px] font-semibold" style={{ color: palette.share }}>
                  Stop
                </Text>
              </Pressable>
            ) : (
              <Pressable
                disabled={isBusy || Boolean(retryAfterSeconds && retryAfterSeconds > 0)}
                testID="navigation-start-button"
                onPress={() => {
                  void startGuidanceFlow();
                }}
                style={[
                  getHomeShadowStyle(appearance, "primaryButton"),
                  styles.primaryAction,
                  {
                    backgroundColor: palette.share,
                    opacity: isBusy || (retryAfterSeconds && retryAfterSeconds > 0) ? 0.6 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons color="#FFFFFF" name="navigation-variant" size={18} />
                <Text className="ml-2 text-[16px] font-semibold text-white">
                  Start
                </Text>
              </Pressable>
            )}

            {shouldShowRetryAction ? (
              <Pressable
                disabled={isBusy || Boolean(retryAfterSeconds && retryAfterSeconds > 0)}
                testID="navigation-retry-button"
                onPress={() => {
                  if (retryAfterSeconds && retryAfterSeconds > 0) {
                    return;
                  }

                  if (phase === "guiding") {
                    void startGuidanceFlow();
                    return;
                  }

                  setPreviewNonce((currentValue) => currentValue + 1);
                }}
                style={[
                  getHomeShadowStyle(appearance, "secondaryButton"),
                  styles.secondaryAction,
                  {
                    backgroundColor: palette.chip,
                    borderColor: palette.share,
                    borderWidth: 1,
                    opacity: isBusy || (retryAfterSeconds && retryAfterSeconds > 0) ? 0.6 : 1,
                  },
                ]}
              >
                <MaterialCommunityIcons color={palette.iconTint} name="refresh" size={18} />
                <Text className="ml-2 text-[15px] font-semibold" style={{ color: palette.sheetText }}>
                  {retryAfterSeconds && retryAfterSeconds > 0
                    ? "Wait to retry"
                    : phase === "guiding"
                      ? "Refresh route"
                      : "Retry"}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
  },
  primaryAction: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 20,
  },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 18,
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  travelModeButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 10,
  },
});

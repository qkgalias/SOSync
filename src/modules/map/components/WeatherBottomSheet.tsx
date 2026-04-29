/** Purpose: Render the dedicated Home weather experience as a modal bottom sheet. */
import { type ForwardedRef, type ReactNode, forwardRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  TouchableOpacity as BottomSheetTouchableOpacity,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  formatTemperature,
  getWeatherCodeLabel,
  getWeatherIconName,
} from "@/modules/map/weatherPresentation";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { FloodRiskOverview } from "@/types";

type WeatherBottomSheetProps = {
  error: string | null;
  floodRisk: FloodRiskOverview | null;
  isRefreshing: boolean;
  isLocationSharingEnabled: boolean;
  onChange?: (index: number) => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
  onRefresh: () => void;
  onRequestLocationAccess: () => void;
  permissionStatus: "idle" | "granted" | "denied";
  status: "error" | "idle" | "loading" | "success";
};

const formatWeatherDay = (value: string) =>
  new Date(value).toLocaleString("en-US", {
    weekday: "short",
  });

const formatWeatherDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });

const renderBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    appearsOnIndex={0}
    disappearsOnIndex={-1}
    opacity={0.24}
    pressBehavior="close"
  />
);

const ActionButton = ({
  disabled = false,
  icon,
  label,
  onPress,
  primary = false,
}: {
  disabled?: boolean;
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) => {
  const { resolvedTheme, themeTokens } = useAppTheme();

  return (
    <BottomSheetTouchableOpacity
      activeOpacity={0.88}
      disabled={disabled}
      onPress={onPress}
      style={{
        alignItems: "center",
        backgroundColor: primary
          ? themeTokens.accentPrimary
          : resolvedTheme === "dark"
            ? themeTokens.surfaceElevated
            : themeTokens.surfaceInput,
        borderColor: primary ? themeTokens.accentPrimary : themeTokens.borderSubtle,
        borderRadius: 999,
        borderWidth: 1,
        flexDirection: "row",
        opacity: disabled ? 0.7 : 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <MaterialCommunityIcons color={primary ? "#FFFFFF" : themeTokens.accentPrimary} name={icon as never} size={16} />
      <Text className={`ml-2 text-[14px] font-semibold ${primary ? "text-white" : "text-ink"}`}>{label}</Text>
    </BottomSheetTouchableOpacity>
  );
};

const StateCard = ({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: ReactNode;
  title: string;
}) => (
  <View className="mt-5 rounded-[24px] border border-line bg-surface px-5 py-5">
    <Text className="text-[20px] font-semibold text-ink">{title}</Text>
    <View className="mt-2">{body}</View>
    {action ? <View className="mt-4 flex-row flex-wrap gap-3">{action}</View> : null}
  </View>
);

export const WeatherBottomSheet = forwardRef(function WeatherBottomSheet(
  {
    error,
    floodRisk,
    isRefreshing,
    isLocationSharingEnabled,
    onChange,
    onDismiss,
    onOpenSettings,
    onRefresh,
    onRequestLocationAccess,
    permissionStatus,
    status,
  }: WeatherBottomSheetProps,
  ref: ForwardedRef<BottomSheetModal>,
) {
  const { resolvedTheme, themeTokens } = useAppTheme();
  const hasCurrentWeather = Boolean(floodRisk?.currentWeather);
  const hasDailyWeather = Boolean(floodRisk?.weatherDaily.length);
  const hasWeather = hasCurrentWeather || hasDailyWeather;
  const showLocationOffState = !isLocationSharingEnabled;
  const showPermissionState = !showLocationOffState && permissionStatus === "denied" && !floodRisk;
  const showInitialLoading =
    !showLocationOffState &&
    (status === "loading" || (status === "idle" && permissionStatus === "granted")) &&
    !floodRisk;
  const showErrorState = !showLocationOffState && status === "error" && !floodRisk;
  const showContent = !showLocationOffState && !showPermissionState && !showInitialLoading && !showErrorState;
  const isDark = resolvedTheme === "dark";
  const iconChipSurface = isDark ? themeTokens.surfaceElevated : themeTokens.accentSoft;

  return (
    <BottomSheetModal
      ref={ref}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: themeTokens.bgSecondary,
        borderColor: themeTokens.borderSubtle,
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        borderWidth: 1,
      }}
      enableDismissOnClose
      handleIndicatorStyle={{
        backgroundColor: themeTokens.borderStrong,
        height: 2,
        width: 56,
      }}
      index={0}
      onChange={onChange}
      onDismiss={onDismiss}
      snapPoints={["92%"]}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pb-2 pt-2">
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-[26px] font-semibold text-ink">Weather</Text>
              <Text className="mt-1 text-[13px] text-secondary">Current conditions near your location</Text>
            </View>

            {showContent ? (
              <ActionButton
                disabled={isRefreshing}
                icon="refresh"
                label={isRefreshing ? "Refreshing" : "Refresh"}
                onPress={onRefresh}
              />
            ) : null}
          </View>

          {showLocationOffState ? (
            <StateCard
              body={
                <Text className="text-[14px] leading-7 text-secondary">
                  Turn on location to see local weather.
                </Text>
              }
              title="Location is off"
            />
          ) : null}

          {showPermissionState ? (
            <StateCard
              action={
                <>
                  <ActionButton
                    icon="crosshairs-gps"
                    label="Allow location"
                    onPress={onRequestLocationAccess}
                    primary
                  />
                  <ActionButton icon="cog-outline" label="Open settings" onPress={onOpenSettings} />
                </>
              }
              body={
                <Text className="text-[14px] leading-7 text-secondary">
                  We need your location to check nearby weather conditions.
                </Text>
              }
              title="Turn on location"
            />
          ) : null}

          {showInitialLoading ? (
            <View className="mt-5 items-center rounded-[24px] border border-line bg-surface px-5 py-8">
              <ActivityIndicator color={themeTokens.accentPrimary} size="large" />
              <Text className="mt-4 text-[16px] font-semibold text-ink">Checking weather near you</Text>
              <Text className="mt-2 text-center text-[14px] leading-7 text-secondary">
                Getting the latest weather information for your area.
              </Text>
            </View>
          ) : null}

          {showErrorState ? (
            <StateCard
              action={<ActionButton icon="refresh" label="Try again" onPress={onRefresh} primary />}
              body={
                <Text className="text-[14px] leading-7 text-secondary">
                  {error ?? "We couldn&apos;t load local weather right now. Try again in a moment."}
                </Text>
              }
              title="Couldn&apos;t load weather"
            />
          ) : null}

          {showContent ? (
            <>
              {hasWeather ? (
                <View className="mt-6">
                  {hasCurrentWeather ? (
                    <View className="rounded-[28px] border border-line bg-surface px-5 py-5">
                      <View className="flex-row items-center">
                        <View className="h-20 w-20 items-center justify-center rounded-[24px]" style={{ backgroundColor: iconChipSurface }}>
                          <MaterialCommunityIcons
                            color={themeTokens.accentPrimary}
                            name={getWeatherIconName(floodRisk?.currentWeather?.weatherCode)}
                            size={40}
                          />
                        </View>
                        <View className="ml-4 flex-1">
                          <Text className="text-[34px] font-semibold text-ink">
                            {formatTemperature(floodRisk?.currentWeather?.temperatureC)}
                          </Text>
                          <Text className="text-[17px] font-medium text-ink">
                            {getWeatherCodeLabel(floodRisk?.currentWeather?.weatherCode)}
                          </Text>
                          <Text className="mt-1 text-[14px] text-secondary">
                            Feels like {formatTemperature(floodRisk?.currentWeather?.feelsLikeC)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {hasDailyWeather ? (
                    <View className="mt-5">
                      <Text className="text-[15px] font-semibold text-ink">7-day forecast</Text>
                      <View className="mt-3 rounded-[24px] border border-line bg-surface px-4 py-2">
                        {floodRisk?.weatherDaily.map((day, index) => (
                          <View
                            key={day.date}
                            className="flex-row items-center py-3"
                            style={{
                              borderBottomColor: themeTokens.borderSubtle,
                              borderBottomWidth: index === floodRisk.weatherDaily.length - 1 ? 0 : 1,
                            }}
                          >
                            <View className="w-[74px]">
                              <Text className="text-[15px] font-semibold text-ink">
                                {formatWeatherDay(day.date)}
                              </Text>
                              <Text className="mt-0.5 text-[12px] text-muted">
                                {formatWeatherDate(day.date)}
                              </Text>
                            </View>

                            <View className="ml-2 flex-1 flex-row items-center">
                              <View className="h-10 w-10 items-center justify-center rounded-[14px]" style={{ backgroundColor: iconChipSurface }}>
                                <MaterialCommunityIcons
                                  color={themeTokens.accentPrimary}
                                  name={getWeatherIconName(day.weatherCode)}
                                  size={20}
                                />
                              </View>
                              <Text className="ml-3 text-[14px] font-medium text-secondary">
                                {getWeatherCodeLabel(day.weatherCode)}
                              </Text>
                            </View>

                            <Text className="text-[14px] font-semibold text-ink">
                              {formatTemperature(day.maxTemperatureC)} / {formatTemperature(day.minTemperatureC)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View className="mt-6 rounded-[24px] border border-dashed border-borderStrong bg-secondaryPage px-5 py-5">
                  <Text className="text-[18px] font-semibold text-ink">Weather unavailable</Text>
                  <Text className="mt-2 text-[14px] leading-7 text-secondary">
                    We couldn&apos;t load local weather right now. Try again in a moment.
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </View>
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
});

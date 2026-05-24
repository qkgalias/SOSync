/** Purpose: Show deeper operational context for a selected disaster alert. */
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { useAlerts } from "@/hooks/useAlerts";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { locationService } from "@/services/locationService";
import type { DisasterAlert } from "@/types";
import { formatTimestampLabel, goBackOrReplace } from "@/utils/helpers";

const formatAlertType = (type: string) => `${type.toUpperCase()} ADVISORY`;

const formatSourceLabel = (source: string) => {
  switch (source) {
    case "open-meteo":
      return "open-meteo";
    case "google-flood-forecasting":
      return "Flood forecasting model";
    case "manual":
      return "SOSync operations";
    default:
      return source;
  }
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Manila",
  year: "numeric",
});

const compactDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  hour: "numeric",
  minute: "2-digit",
  month: "2-digit",
  timeZone: "Asia/Manila",
  year: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Manila",
});

const toValidDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    ? `${value}:00+08:00`
    : value;
  const date = new Date(normalizedValue);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatAlertDate = (value?: string | null) => {
  const date = toValidDate(value);
  return date ? dateFormatter.format(date) : null;
};

const formatAlertTime = (value?: string | null) => {
  const date = toValidDate(value);
  return date ? timeFormatter.format(date) : "Recently";
};

const formatForecastWindow = (alert: DisasterAlert) => {
  const start = toValidDate(alert.forecastStart);
  const end = toValidDate(alert.forecastEnd);

  if (start && end) {
    return `${compactDateTimeFormatter.format(start)} - ${compactDateTimeFormatter.format(end)}`;
  }

  const [fallbackStart, fallbackEnd] =
    alert.forecastWindow?.split(/\s+to\s+/i) ?? [];
  const parsedFallbackStart = toValidDate(fallbackStart);
  const parsedFallbackEnd = toValidDate(fallbackEnd);
  if (parsedFallbackStart && parsedFallbackEnd) {
    return `${compactDateTimeFormatter.format(parsedFallbackStart)} - ${compactDateTimeFormatter.format(parsedFallbackEnd)}`;
  }

  return alert.forecastWindow ?? "Next 24 hours";
};

const getSeverityLevelLabel = (severity: DisasterAlert["severity"]) => {
  switch (severity) {
    case "critical":
      return "Critical Risk";
    case "warning":
      return "High Risk";
    case "watch":
      return "Moderate Risk";
    case "advisory":
    default:
      return "Moderate Risk";
  }
};

const getRiskToneLabel = (severity: DisasterAlert["severity"]) => {
  switch (severity) {
    case "critical":
      return "Extreme";
    case "warning":
      return "High";
    case "watch":
      return "Moderate";
    case "advisory":
    default:
      return "Advisory";
  }
};

const getAlertRadiusLabel = () => "5 km around your circle";

const formatRangeTime = (
  startValue?: string | null,
  endValue?: string | null,
) => {
  const start = toValidDate(startValue);
  const end = toValidDate(endValue);
  if (!start || !end) {
    return null;
  }

  return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
};

const getDayPeriodLabel = (value?: string | null) => {
  const date = toValidDate(value);
  if (!date) {
    return "To be confirmed";
  }

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(date),
  );

  if (hour < 12) {
    return "This morning";
  }
  if (hour < 18) {
    return "This afternoon";
  }
  return "This evening";
};

const formatTemperature = (value?: number) =>
  Number.isFinite(value) ? `${Math.round(value as number)}°C` : null;

const formatRainChance = (value?: number) =>
  Number.isFinite(value) ? `${Math.round(value as number)}%` : null;

const formatUvIndex = (value?: number) => {
  if (!Number.isFinite(value)) {
    return null;
  }

  const roundedValue = Math.round(value as number);
  if (roundedValue <= 2) {
    return "Low";
  }
  if (roundedValue <= 5) {
    return "Moderate";
  }
  if (roundedValue <= 7) {
    return "High";
  }
  return "Very high";
};

const formatWind = (speed?: number, gust?: number) => {
  if (!Number.isFinite(speed) && !Number.isFinite(gust)) {
    return null;
  }

  if (
    Number.isFinite(speed) &&
    Number.isFinite(gust) &&
    Math.round(speed as number) !== Math.round(gust as number)
  ) {
    return `${Math.round(speed as number)}-${Math.round(gust as number)} km/h`;
  }

  const value = Number.isFinite(gust) ? gust : speed;
  return `${Math.round(value as number)} km/h`;
};

const hasDetailedForecastMetrics = (
  alert: DisasterAlert,
  peakRiskLabel: string | null,
) =>
  Boolean(
    formatRainChance(alert.rainChancePercent) ||
    formatWind(alert.windSpeedKph, alert.windGustKph) ||
    formatTemperature(alert.temperatureC) ||
    formatUvIndex(alert.uvIndex) ||
    typeof alert.peakRainfallMm === "number" ||
    peakRiskLabel,
  );

const getDefaultActions = (alert: DisasterAlert) => {
  if (alert.type === "flood") {
    return [
      "Keep members reachable and check on anyone near flood-prone roads.",
      "Avoid low-lying routes if rain intensifies.",
      "Follow local government and emergency advisories.",
    ];
  }

  return [
    "Keep notifications on for your trusted circle.",
    "Confirm important contacts are reachable.",
    "Watch for official local weather updates.",
  ];
};

const getPrimaryAction = (actions: string[]) =>
  actions[0] ??
  "Keep notifications on, check your circle, and monitor local updates.";

const safetyTips = [
  {
    icon: "home-outline",
    text: "Stay indoors during strong rain or lightning.",
  },
  {
    icon: "car-brake-alert",
    text: "Avoid walking or driving through flood water.",
  },
  {
    icon: "weather-windy",
    text: "Secure loose outdoor items that may blow away.",
  },
  {
    icon: "battery-charging-outline",
    text: "Charge your phone and power bank.",
  },
  {
    icon: "flashlight",
    text: "Prepare flashlight, water, and important items.",
  },
  { icon: "paw-outline", text: "Keep pets inside and stay calm." },
] as const;

const ForecastMetric = ({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  value: string;
}) => {
  const { themeTokens } = useAppTheme();

  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <MaterialCommunityIcons
          color={themeTokens.accentPrimary}
          name={icon}
          size={18}
        />
        <Text className="flex-1 text-[14px] text-ink">{label}</Text>
      </View>
      <Text className="max-w-[48%] shrink text-right text-[14px] font-semibold text-ink">
        {value}
      </Text>
    </View>
  );
};

const TimingRow = ({
  icon,
  label,
  tone = "text-ink",
  value,
}: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  tone?: string;
  value: string;
}) => {
  const { themeTokens } = useAppTheme();

  return (
    <View className="flex-row items-start gap-2">
      <MaterialCommunityIcons
        color={themeTokens.accentPrimary}
        name={icon}
        size={17}
      />
      <View className="min-w-0 flex-1">
        <Text className="text-[12px] leading-4 text-muted">{label}</Text>
        <Text className={`mt-0.5 text-[13px] font-semibold leading-5 ${tone}`}>
          {value}
        </Text>
      </View>
    </View>
  );
};

const AlertCard = ({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) => (
  <View
    className={`rounded-[20px] border border-line bg-card p-4 ${className}`}
    style={style}
  >
    {children}
  </View>
);

export default function AlertDetailScreen() {
  const params = useLocalSearchParams<{ alertId: string }>();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const { themeTokens } = useAppTheme();
  const { selectedGroupId } = useAuthSession();
  const alerts = useAlerts(selectedGroupId);
  const alert = alerts.find((entry) => entry.alertId === params.alertId);
  const [resolvedAreaLabel, setResolvedAreaLabel] = useState<string | null>(
    null,
  );
  const recommendedActions = alert?.recommendedActions?.length
    ? alert.recommendedActions
    : alert
      ? getDefaultActions(alert)
      : [];
  const handleBack = () => goBackOrReplace(router, "/(tabs)/notifications");
  const lastCheckedDate = formatAlertDate(alert?.lastEvaluatedAt);
  const placeLabel = alert
    ? (resolvedAreaLabel ?? alert.areaLabel ?? "Near your trusted circle")
    : "";
  const peakRiskLabel = alert
    ? formatRangeTime(alert.peakRiskStart, alert.peakRiskEnd)
    : null;
  const hasDetailedForecast = alert
    ? hasDetailedForecastMetrics(alert, peakRiskLabel)
    : false;
  const contentWidth = Math.max(0, windowWidth - 40);
  const cardGap = 12;
  const useTwoColumnCards = contentWidth >= 340;
  const forecastCardWidth = useTwoColumnCards
    ? Math.floor((contentWidth - cardGap) * 0.52)
    : contentWidth;
  const timingColumnWidth = useTwoColumnCards
    ? contentWidth - cardGap - forecastCardWidth
    : contentWidth;

  useEffect(() => {
    if (!alert) {
      setResolvedAreaLabel(null);
      return;
    }

    let active = true;
    setResolvedAreaLabel(null);
    locationService
      .reverseGeocodeDetails({
        latitude: alert.latitude,
        longitude: alert.longitude,
      })
      .then(({ addressLabel, localityLabel }) => {
        if (!active) {
          return;
        }

        setResolvedAreaLabel(
          addressLabel?.trim() || localityLabel?.trim() || null,
        );
      })
      .catch((error) => {
        console.warn("Alert location reverse geocode failed.", error);
      });

    return () => {
      active = false;
    };
  }, [alert]);

  return (
    <Screen
      contentClassName="pb-3"
      leftSlot={<BackButton onPress={handleBack} testID="alert-detail-back" />}
      subtitle="Review severity, timing, forecast, and safety actions."
      title={alert?.title ?? "Alert detail"}
    >
      {alert ? (
        <View className="gap-4">
          <View className="overflow-hidden rounded-[24px] border border-line bg-card">
            <View className="flex-row gap-4 bg-dangerSurface/40 p-4">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-page">
                <MaterialCommunityIcons
                  color={themeTokens.accentPrimary}
                  name="weather-lightning-rainy"
                  size={34}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="text-[12px] text-muted">
                    {formatTimestampLabel(alert.createdAt)}
                  </Text>
                  <StatusBadge label={alert.severity} />
                </View>
                <Text className="mt-2 text-[24px] font-black tracking-tight text-accent">
                  {formatAlertType(alert.type)}
                </Text>
                <Text className="mt-2 text-[14px] leading-6 text-ink">
                  <Text className="font-semibold">
                    Level: {getSeverityLevelLabel(alert.severity)}
                  </Text>
                  {"  ·  "}
                  <Text className="font-semibold">Status: Active</Text>
                </Text>
                <Text className="mt-4 text-[15px] leading-6 text-ink">
                  {alert.message}
                </Text>
              </View>
            </View>

            <View
              className="border-t border-line px-4 py-3"
              testID="alert-hero-footer"
            >
              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-2">
                <View className="flex-row items-center gap-1.5">
                  <MaterialCommunityIcons
                    color={themeTokens.textPrimary}
                    name="calendar-month-outline"
                    size={16}
                  />
                  <Text className="text-[13px] text-muted">
                    Issued: {formatAlertTime(alert.createdAt)}
                  </Text>
                </View>
                <Text className="text-[13px] text-muted">·</Text>
                <View className="flex-row items-center gap-1.5">
                  <MaterialCommunityIcons
                    color={themeTokens.textPrimary}
                    name="sync"
                    size={16}
                  />
                  <Text className="text-[13px] text-muted">
                    Updated:{" "}
                    {lastCheckedDate
                      ? formatTimestampLabel(
                          alert.lastEvaluatedAt ?? alert.createdAt,
                        )
                      : "Recently"}
                  </Text>
                </View>
                <Text className="text-[13px] text-muted">·</Text>
                <Text className="text-[13px] text-muted">
                  Source: {formatSourceLabel(alert.source)}
                </Text>
                <Text className="text-[13px] text-muted">·</Text>
                <View className="min-w-0 flex-row items-center gap-1.5">
                  <MaterialCommunityIcons
                    color={themeTokens.textPrimary}
                    name="map-marker-outline"
                    size={17}
                  />
                  <Text className="text-[13px] leading-5 text-muted">
                    {placeLabel}
                  </Text>
                </View>
                <Text className="text-[13px] text-muted">·</Text>
                <Text className="text-[13px] leading-5 text-muted">
                  Radius: {getAlertRadiusLabel()}
                </Text>
              </View>
            </View>
          </View>

          <View
            className={
              useTwoColumnCards ? "flex-row items-start gap-3" : "gap-3"
            }
          >
            <AlertCard className="p-3" style={{ width: forecastCardWidth }}>
              <View className="mb-4 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-infoSurface">
                  <MaterialCommunityIcons
                    color="#1F66D1"
                    name="weather-pouring"
                    size={22}
                  />
                </View>
                <Text className="flex-1 text-[15px] font-bold leading-5 text-ink">
                  Today's Forecast
                </Text>
              </View>
              <View className="gap-3">
                {formatRainChance(alert.rainChancePercent) ? (
                  <ForecastMetric
                    icon="weather-rainy"
                    label="Rain chance"
                    value={formatRainChance(alert.rainChancePercent) as string}
                  />
                ) : null}
                {formatWind(alert.windSpeedKph, alert.windGustKph) ? (
                  <ForecastMetric
                    icon="weather-windy"
                    label="Wind"
                    value={
                      formatWind(
                        alert.windSpeedKph,
                        alert.windGustKph,
                      ) as string
                    }
                  />
                ) : null}
                {formatTemperature(alert.temperatureC) ? (
                  <ForecastMetric
                    icon="thermometer"
                    label="Temperature"
                    value={formatTemperature(alert.temperatureC) as string}
                  />
                ) : null}
                <ForecastMetric
                  icon="weather-lightning"
                  label="Storm risk"
                  value={getRiskToneLabel(alert.severity)}
                />
                {formatUvIndex(alert.uvIndex) ? (
                  <ForecastMetric
                    icon="white-balance-sunny"
                    label="UV Index"
                    value={formatUvIndex(alert.uvIndex) as string}
                  />
                ) : null}
                {typeof alert.peakRainfallMm === "number" ? (
                  <ForecastMetric
                    icon="water-percent"
                    label="Peak rainfall"
                    value={`${alert.peakRainfallMm} mm`}
                  />
                ) : null}
                {peakRiskLabel ? (
                  <View className="border-t border-line pt-3">
                    <ForecastMetric
                      icon="clock-outline"
                      label="Expected peak"
                      value={peakRiskLabel}
                    />
                  </View>
                ) : null}
                {!hasDetailedForecast ? (
                  <Text className="text-[12px] leading-5 text-muted">
                    Detailed forecast metrics will appear after the advisory
                    refreshes.
                  </Text>
                ) : null}
              </View>
            </AlertCard>

            <View className="gap-3" style={{ width: timingColumnWidth }}>
              <AlertCard className="p-3">
                <View className="mb-4 flex-row items-center gap-3">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-soft">
                    <MaterialCommunityIcons
                      color={themeTokens.accentPrimary}
                      name="clock-outline"
                      size={22}
                    />
                  </View>
                  <Text className="flex-1 text-[15px] font-bold leading-5 text-ink">
                    Expected Timing
                  </Text>
                </View>
                <View className="gap-3">
                  <TimingRow
                    icon="calendar-start"
                    label="Start"
                    value={getDayPeriodLabel(alert.forecastStart)}
                  />
                  <TimingRow
                    icon="alert-circle-outline"
                    label="Highest risk"
                    tone="text-accent"
                    value={peakRiskLabel ?? "Monitor updates"}
                  />
                  <TimingRow
                    icon="check-circle-outline"
                    label="Expected to improve"
                    tone="text-successText"
                    value="Monitor updates"
                  />
                </View>
              </AlertCard>

              <AlertCard className="p-3">
                <View className="flex-row items-start gap-3">
                  <View className="h-9 w-9 items-center justify-center rounded-full bg-soft">
                    <MaterialCommunityIcons
                      color={themeTokens.accentPrimary}
                      name="shield-check-outline"
                      size={21}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold leading-5 text-ink">
                      Recommended Action
                    </Text>
                    <Text className="mt-2 text-[12px] leading-5 text-muted">
                      {getPrimaryAction(recommendedActions)}
                    </Text>
                  </View>
                </View>
              </AlertCard>
            </View>
          </View>

          <AlertCard className="p-3">
            <View className="flex-row items-start gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-infoSurface">
                <MaterialCommunityIcons
                  color="#1F66D1"
                  name="clock-outline"
                  size={20}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-ink">
                  Forecast window
                </Text>
                <Text className="mt-1 text-[14px] font-semibold leading-5 text-accent">
                  {formatForecastWindow(alert)}
                </Text>
              </View>
            </View>
          </AlertCard>

          <AlertCard>
            <View className="mb-4 flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-successSurface">
                <MaterialCommunityIcons
                  color="#1E7F38"
                  name="shield-check"
                  size={24}
                />
              </View>
              <Text className="text-[18px] font-bold text-successText">
                Safety Tips
              </Text>
            </View>
            <View className="flex-row gap-5">
              <View className="flex-1 gap-4">
                {safetyTips.slice(0, 3).map((tip) => (
                  <View key={tip.text} className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-successSurface/60">
                      <MaterialCommunityIcons
                        color="#1E7F38"
                        name={tip.icon}
                        size={22}
                      />
                    </View>
                    <Text className="flex-1 text-[14px] leading-5 text-ink">
                      {tip.text}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-1 gap-4">
                {safetyTips.slice(3).map((tip) => (
                  <View key={tip.text} className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-successSurface/60">
                      <MaterialCommunityIcons
                        color="#1E7F38"
                        name={tip.icon}
                        size={22}
                      />
                    </View>
                    <Text className="flex-1 text-[14px] leading-5 text-ink">
                      {tip.text}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </AlertCard>

          <View className="rounded-[18px] border border-infoBorder bg-infoSurface px-4 py-3">
            <View className="flex-row items-center gap-3">
              <MaterialCommunityIcons
                color="#1F66D1"
                name="information-outline"
                size={22}
              />
              <Text className="flex-1 text-[14px] leading-5 text-infoText">
                Conditions can change quickly. We'll keep you updated.
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <InfoCard title="Alert unavailable" eyebrow="Missing data">
          <Text className="text-sm leading-6 text-muted">
            The requested alert could not be found in the currently selected
            group feed.
          </Text>
          <Button
            className="mt-5 self-start rounded-full px-6"
            label="Back to Alerts"
            onPress={handleBack}
          />
        </InfoCard>
      )}
    </Screen>
  );
}

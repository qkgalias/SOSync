/** Purpose: Render a simplified, mobile-first flood outlook sheet for Home. */
import { type ForwardedRef, type ReactNode, forwardRef, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  TouchableOpacity as BottomSheetTouchableOpacity,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { getFloodLevelColors, getFloodLevelLabel } from "@/hooks/useFloodRisk.helpers";
import { FloodMiniMap } from "@/modules/map/components/FloodMiniMap";
import {
  buildFloodRiskLadder,
  formatFloodLowConfidenceNote,
  getFloodTrendIconName,
  resolveFloodGaugeDisplayLabel,
  shouldRenderFloodHeroTitle,
} from "@/modules/map/floodPresentation";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { FloodGaugeSummary, FloodRiskOverview } from "@/types";

type FloodRiskBottomSheetProps = {
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
  reverseGeocodedLocality?: string | null;
  status: "error" | "idle" | "loading" | "success";
};

type DisplayPoint = FloodGaugeSummary & {
  displayLabel: string;
};

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
  icon,
  label,
  onPress,
  primary = false,
  disabled = false,
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

const SectionCard = ({
  children,
  subtitle,
  title,
}: {
  children: ReactNode;
  subtitle?: string;
  title: string;
}) => {
  return (
    <View className="mt-6">
      <Text className="text-[18px] font-semibold text-ink">{title}</Text>
      {subtitle ? <Text className="mt-1 text-[13px] leading-5 text-secondary">{subtitle}</Text> : null}
      <View className="mt-3 rounded-[22px] border border-line bg-surface px-4 py-4">{children}</View>
    </View>
  );
};

const MetaChip = ({
  icon,
  text,
}: {
  icon?: string;
  text: string;
}) => {
  const { resolvedTheme, themeTokens } = useAppTheme();

  return (
    <View
      className="flex-row items-center rounded-full px-3 py-2"
      style={{ backgroundColor: resolvedTheme === "dark" ? themeTokens.surfaceElevated : themeTokens.accentSoft }}
    >
      {icon ? <MaterialCommunityIcons color={themeTokens.accentPrimary} name={icon as never} size={14} /> : null}
      <Text className={`${icon ? "ml-2" : ""} text-[12px] font-medium text-secondary`}>{text}</Text>
    </View>
  );
};

const InlineMetaRow = ({
  items,
}: {
  items: Array<{ icon: string; text: string }>;
}) => {
  const { themeTokens } = useAppTheme();

  return (
    <View className="mt-4 flex-row flex-wrap items-center">
      {items.map((item, index) => (
        <View key={`${item.icon}-${item.text}`} className="mb-2 mr-3 flex-row items-center">
          {index > 0 ? <Text className="mr-3 text-[12px] text-muted">•</Text> : null}
          <MaterialCommunityIcons color={themeTokens.accentPrimary} name={item.icon as never} size={14} />
          <Text className="ml-1.5 text-[12px] font-medium text-secondary">{item.text}</Text>
        </View>
      ))}
    </View>
  );
};

const FloodLevelPill = ({
  compact = false,
  level,
}: {
  compact?: boolean;
  level: FloodGaugeSummary["level"];
}) => {
  const colors = getFloodLevelColors(level);

  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: colors.badgeBackground,
        borderRadius: 999,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 6 : 8,
      }}
    >
      <Text
        style={{
          color: colors.badgeText,
          fontSize: compact ? 11 : 12,
          fontWeight: "700",
          letterSpacing: 0.3,
        }}
      >
        {getFloodLevelLabel(level)}
      </Text>
    </View>
  );
};

const DetailRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <View className="border-b border-line py-3 last:border-b-0">
    <Text className="text-[12px] uppercase tracking-[0.4px] text-muted">{label}</Text>
    <Text className="mt-1 text-[15px] font-medium text-ink">{value}</Text>
  </View>
);

const DetailModal = ({
  onClose,
  point,
}: {
  onClose: () => void;
  point: DisplayPoint | null;
}) => {
  const { resolvedTheme, themeTokens } = useAppTheme();

  if (!point) {
    return null;
  }

  const lowConfidenceNote = formatFloodLowConfidenceNote({
    confidenceNote: point.confidenceNote,
    verified: point.verified,
  });
  const referenceNote =
    point.referenceNote?.trim() || "This is a nearby monitoring point used as a reference for conditions in your area.";

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-5">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="self-center rounded-[28px] px-5 py-5"
          style={{ backgroundColor: themeTokens.bgSecondary, maxHeight: "74%", width: "100%" }}
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-[22px] font-semibold text-ink">{point.displayLabel}</Text>
              <Text className="mt-1 text-[13px] leading-5 text-secondary">
                Nearby monitoring point details
              </Text>
            </View>
            <Pressable className="h-10 w-10 items-center justify-center" hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            <View className="rounded-[22px] border border-line bg-surface px-4 py-4">
              <View className="flex-row flex-wrap gap-2">
                <FloodLevelPill compact level={point.level} />
                <MetaChip icon={getFloodTrendIconName(point.trend)} text={point.trendLabel} />
              </View>

              <View className="mt-4">
                <DetailRow label="Distance" value={point.distanceLabel} />
                <DetailRow label="Last updated" value={point.lastUpdatedLabel} />
              </View>

              <View
                className="mt-4 rounded-[18px] px-4 py-4"
                style={{ backgroundColor: resolvedTheme === "dark" ? themeTokens.surfaceElevated : themeTokens.accentSoft }}
              >
                <Text className="text-[13px] font-semibold text-ink">Why this matters</Text>
                <Text className="mt-2 text-[13px] leading-6 text-secondary">{referenceNote}</Text>
              </View>

              {lowConfidenceNote ? (
                <View className="mt-4 rounded-[18px] bg-warningSurface px-4 py-4">
                  <Text className="text-[13px] font-semibold text-warningText">Confidence note</Text>
                  <Text className="mt-2 text-[13px] leading-6 text-warningText">{lowConfidenceNote}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
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

export const FloodRiskBottomSheet = forwardRef(function FloodRiskBottomSheet(
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
    reverseGeocodedLocality,
    status,
  }: FloodRiskBottomSheetProps,
  ref: ForwardedRef<BottomSheetModal>,
) {
  const { resolvedTheme, themeTokens } = useAppTheme();
  const [selectedPoint, setSelectedPoint] = useState<DisplayPoint | null>(null);

  const flood = floodRisk?.flood ?? null;
  const primaryPoint = flood?.primaryPoint ?? null;
  const nearbyPoints = flood?.nearbyPoints ?? [];
  const floodLocalityLabel =
    reverseGeocodedLocality?.trim() ||
    floodRisk?.location.localityLabel?.trim() ||
    floodRisk?.location.label?.trim() ||
    null;
  const showLocationOffState = !isLocationSharingEnabled;
  const showPermissionState = !showLocationOffState && permissionStatus === "denied" && !floodRisk;
  const showInitialLoading =
    !showLocationOffState &&
    (status === "loading" || (status === "idle" && permissionStatus === "granted")) &&
    !floodRisk;
  const showErrorState = !showLocationOffState && status === "error" && !floodRisk;
  const showMalformedState =
    !showLocationOffState &&
    !showPermissionState &&
    !showInitialLoading &&
    !showErrorState &&
    Boolean(floodRisk) &&
    !flood;
  const showContent =
    !showLocationOffState && !showPermissionState && !showInitialLoading && !showErrorState && Boolean(flood);
  const levelColors = getFloodLevelColors(flood?.level ?? "LIMITED_DATA");

  const displayPrimaryLabel = useMemo(() => {
    if (!primaryPoint) {
      return null;
    }

    return resolveFloodGaugeDisplayLabel({
      distanceLabel: primaryPoint.distanceLabel,
      isPrimary: true,
      localityLabel: floodLocalityLabel,
      river: primaryPoint.river,
      siteName: primaryPoint.siteName,
    });
  }, [floodLocalityLabel, primaryPoint]);

  const lowConfidencePrimaryNote = useMemo(
    () =>
      primaryPoint
        ? formatFloodLowConfidenceNote({
            confidenceNote: primaryPoint.confidenceNote,
            isPrimary: true,
            verified: primaryPoint.verified,
          })
        : null,
    [primaryPoint],
  );

  const riskGuideRows = useMemo(() => buildFloodRiskLadder(), []);

  const displayedNearbyPoints = useMemo(
    () =>
      nearbyPoints.slice(0, 3).map<DisplayPoint>((point) => ({
        ...point,
        displayLabel: resolveFloodGaugeDisplayLabel({
          distanceLabel: point.distanceLabel,
          isPrimary: false,
          localityLabel: floodLocalityLabel,
          river: point.river,
          siteName: point.siteName,
        }),
      })),
    [floodLocalityLabel, nearbyPoints],
  );

  const heroBadgeLabel = flood?.hero.badgeLabel ?? "LIMITED DATA";
  const showHeroTitle = flood
    ? shouldRenderFloodHeroTitle({
        badgeLabel: heroBadgeLabel,
        title: flood.hero.title,
      })
    : false;

  const closeDetail = () => setSelectedPoint(null);

  return (
    <>
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
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          <View className="px-5 pb-2 pt-2">
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-[26px] font-semibold text-ink">Flood outlook</Text>
                <Text className="mt-1 text-[13px] text-secondary">Nearby modeled flood conditions for your area</Text>
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
                    Turn on location to see nearby flood outlook.
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
                    We need your location to check flood conditions near you.
                  </Text>
                }
                title="Turn on location"
              />
            ) : null}

            {showInitialLoading ? (
              <StateCard
                body={
                  <View className="items-center">
                    <ActivityIndicator color={themeTokens.accentPrimary} size="large" />
                    <Text className="mt-4 text-center text-[16px] font-semibold text-ink">
                      Checking flood outlook near you
                    </Text>
                    <Text className="mt-2 text-center text-[14px] leading-7 text-secondary">
                      Looking for nearby monitoring points and the latest flood signal.
                    </Text>
                  </View>
                }
                title="Loading"
              />
            ) : null}

            {showErrorState ? (
              <StateCard
                action={<ActionButton icon="refresh" label="Try again" onPress={onRefresh} primary />}
                body={
                  <Text className="text-[14px] leading-7 text-secondary">
                    {error ?? "We couldn't load flood information right now. Try again in a moment."}
                  </Text>
                }
                title="Couldn't load flood outlook"
              />
            ) : null}

            {showMalformedState ? (
              <StateCard
                action={<ActionButton icon="refresh" label="Refresh" onPress={onRefresh} primary />}
                body={
                  <Text className="text-[14px] leading-7 text-secondary">
                    We received an older or incomplete flood response. Refresh to load the latest outlook.
                  </Text>
                }
                title="Refreshing flood outlook"
              />
            ) : null}

            {showContent && flood ? (
              <View className="mt-6">
                <View
                  className="rounded-[28px] border px-5 py-5"
                  style={{
                    backgroundColor: resolvedTheme === "dark" ? themeTokens.surface : levelColors.heroBackground,
                    borderColor: resolvedTheme === "dark" ? themeTokens.borderSubtle : levelColors.heroBorder,
                  }}
                >
                  <FloodLevelPill level={flood.level} />

                  {showHeroTitle ? (
                    <Text className="mt-4 text-[22px] font-semibold text-ink">{flood.hero.title}</Text>
                  ) : null}

                  <Text className={`${showHeroTitle ? "mt-2" : "mt-4"} text-[15px] leading-7 text-ink`}>
                    {flood.hero.summary}
                  </Text>

                  <InlineMetaRow
                    items={[
                      {
                        icon: getFloodTrendIconName(flood.hero.trend),
                        text: flood.hero.trendLabel,
                      },
                      {
                        icon: "clock-outline",
                        text: `Updated ${primaryPoint?.lastUpdatedLabel ?? "just now"}`,
                      },
                    ]}
                  />

                  {flood.hero.forecastWindowLabel ? (
                    <Text className="mt-3 text-[13px] leading-6 text-secondary">{flood.hero.forecastWindowLabel}</Text>
                  ) : null}

                  <Text className="mt-4 text-[14px] font-medium leading-6" style={{ color: levelColors.accent }}>
                    {flood.hero.safetyMessage}
                  </Text>
                </View>

                {primaryPoint ? (
                  <SectionCard
                    subtitle="This is the nearest modeled reference we found for your area."
                    title="Primary monitoring point"
                  >
                    <Text className="text-[18px] font-semibold text-ink">
                      {displayPrimaryLabel ?? primaryPoint.label}
                    </Text>
                    <InlineMetaRow
                      items={[
                        {
                          icon: "map-marker-distance",
                          text: primaryPoint.distanceLabel,
                        },
                        {
                          icon: "clock-outline",
                          text: `Updated ${primaryPoint.lastUpdatedLabel}`,
                        },
                      ]}
                    />
                    <Text className="mt-4 text-[14px] leading-7 text-secondary">
                      {primaryPoint.referenceNote ??
                        "This is the nearest available modeled reference for your location, not an exact street-level reading."}
                    </Text>
                    {lowConfidencePrimaryNote ? (
                      <Text className="mt-3 text-[13px] leading-6 text-warningText">{lowConfidencePrimaryNote}</Text>
                    ) : null}
                  </SectionCard>
                ) : null}

                <SectionCard
                  subtitle="Use this as a quick guide for what each flood level means in your area."
                  title="How to read this alert"
                >
                  {riskGuideRows.map((row, index) => (
                    <View
                      key={row.key}
                      className={`${index > 0 ? "border-t border-line" : ""} py-3`}
                    >
                      <Text className="text-[15px] font-semibold text-ink">{row.title}</Text>
                      <Text className="mt-1 text-[13px] leading-6 text-secondary">{row.description}</Text>
                    </View>
                  ))}
                </SectionCard>

                {displayedNearbyPoints.length ? (
                  <View className="mt-6">
                    <Text className="text-[18px] font-semibold text-ink">Nearby monitoring points</Text>
                    <Text className="mt-1 text-[13px] leading-5 text-secondary">
                      Other nearby references that can help you compare conditions.
                    </Text>

                    {displayedNearbyPoints.map((point) => (
                      <BottomSheetTouchableOpacity
                        key={point.gaugeId}
                        activeOpacity={0.88}
                        className="mt-3"
                        onPress={() => setSelectedPoint(point)}
                      >
                        <View className="rounded-[22px] border border-line bg-surface px-4 py-4">
                          <View className="flex-row items-start justify-between gap-3">
                            <View className="flex-1">
                              <Text className="text-[16px] font-semibold text-ink">{point.displayLabel}</Text>
                              <Text className="mt-1 text-[13px] leading-6 text-secondary">
                                {point.distanceLabel} away • {point.trendLabel} • Updated {point.lastUpdatedLabel}
                              </Text>
                            </View>

                            <View className="items-end">
                              <FloodLevelPill compact level={point.level} />
                              <MaterialCommunityIcons
                                color={themeTokens.textMuted}
                                name="chevron-right"
                                size={20}
                                style={{ marginTop: 10 }}
                              />
                            </View>
                          </View>
                        </View>
                      </BottomSheetTouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {flood.map?.hasRenderableData ? (
                  <View className="mt-6">
                    <Text className="text-[18px] font-semibold text-ink">Area preview</Text>
                    <Text className="mt-1 text-[13px] leading-5 text-secondary">
                      Your location, nearby monitoring points, and affected areas when Google provides them.
                    </Text>
                    <View className="mt-3">
                      <FloodMiniMap level={flood.level} map={flood.map} />
                    </View>
                  </View>
                ) : null}

                <Text className="mt-6 text-[13px] leading-6 text-secondary">
                  This outlook uses nearby monitoring points and modeled flood guidance. Follow official local alerts
                  and emergency instructions for final decisions.
                </Text>
              </View>
            ) : null}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      <DetailModal onClose={closeDetail} point={selectedPoint} />
    </>
  );
});

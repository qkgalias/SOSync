/** Purpose: Render the production-styled SOS flow with a livelier ring hero and deliberate countdown. */
import { useEffect, useMemo, useRef, useState } from "react";
import { Image, Pressable, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Button } from "@/components/Button";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { useLocation } from "@/hooks/useLocation";
import { SlideToCancel } from "@/modules/sos/components/SlideToCancel";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { firestoreService } from "@/services/firestoreService";
import { USER_SEED } from "@/utils/constants";
import { toInitials } from "@/utils/helpers";

const COUNTDOWN_SECONDS = 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const IDLE_STATUS = "Tap or hold to send an SOS to everyone.";

const withAlpha = (hex: string, alpha: number) => {
  const sanitized = hex.replace("#", "");
  const normalized =
    sanitized.length === 3
      ? sanitized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : sanitized;

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const buildShadow = (color: string, elevation: number, opacity: number, radius: number, height: number) => ({
  elevation,
  shadowColor: color,
  shadowOffset: { width: 0, height },
  shadowOpacity: opacity,
  shadowRadius: radius,
});

const AvatarOrbit = ({
  active,
  avatarSize,
  backgroundColor,
  borderColor,
  initialsColor,
  index,
  member,
  radius,
  total,
}: {
  active: boolean;
  avatarSize: number;
  backgroundColor: string;
  borderColor: string;
  index: number;
  initialsColor: string;
  member: { displayName: string; photoURL?: string };
  radius: number;
  total: number;
}) => {
  const angle = (-Math.PI / 2) + (Math.PI * 2 * index) / Math.max(total, 1);
  const center = radius + avatarSize / 2;
  const left = center + Math.cos(angle) * radius - avatarSize / 2;
  const top = center + Math.sin(angle) * radius - avatarSize / 2;
  const drift = useSharedValue(0);

  useEffect(() => {
    const duration = active ? 1650 : 2200;
    drift.value = withDelay(
      index * 140,
      withRepeat(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.quad),
        }),
        -1,
        true,
      ),
    );

    return () => cancelAnimation(drift);
  }, [active, drift, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drift.value, [0, 1], [0, active ? -2 : -8]) },
      { scale: interpolate(drift.value, [0, 1], [1, active ? 1.015 : 1.02]) },
    ],
  }));

  return (
    <Animated.View
      className="absolute items-center justify-center rounded-full border-2"
      style={[
        { backgroundColor, borderColor, height: avatarSize, left, top, width: avatarSize },
        buildShadow(withAlpha(borderColor, 0.28), 10, 0.22, 12, 6),
        animatedStyle,
      ]}
    >
      {member.photoURL ? (
        <Image
          className="rounded-full"
          resizeMode="cover"
          source={{ uri: member.photoURL }}
          style={{ height: avatarSize - 4, width: avatarSize - 4 }}
        />
      ) : (
        <Text className="text-sm font-semibold" style={{ color: initialsColor }}>
          {toInitials(member.displayName)}
        </Text>
      )}
    </Animated.View>
  );
};

export default function SosScreen() {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { resolvedTheme, themeTokens } = useAppTheme();
  const { authUser, profile, selectedGroupId } = useAuthSession();
  const { blockedUserIds } = useBlockedUsers(authUser?.uid);
  const privacy = profile?.privacy ?? USER_SEED.privacy;
  const members = useGroupMembers(selectedGroupId).filter((member) => !blockedUserIds.includes(member.userId));
  const { currentLocation } = useLocation(
    authUser?.uid,
    selectedGroupId,
    Boolean(privacy.locationSharingEnabled),
    blockedUserIds,
  );
  const [countdown, setCountdown] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState(IDLE_STATUS);
  const sendingRef = useRef(false);
  const pulseProgress = useSharedValue(0);
  const countdownProgress = useSharedValue(0);

  const recipientCount = Math.max(members.length - 1, 0);
  const orbitMembers = useMemo(
    () => members.filter((member) => member.userId !== authUser?.uid).slice(0, 4),
    [authUser?.uid, members],
  );
  const isCountdownActive = countdown !== null;

  const ringOuterSize = clamp(Math.min(width * 0.76, height * 0.42), 250, 336);
  const ringMiddleSize = ringOuterSize * 0.82;
  const ringInnerSize = ringOuterSize * 0.64;
  const avatarSize = clamp(width * 0.11, 38, 48);
  const orbitRadius = ringOuterSize * 0.48;
  const orbitContainerSize = orbitRadius * 2 + avatarSize;
  const isDark = resolvedTheme === "dark";
  const pageBackgroundColor = isDark ? themeTokens.bgApp : themeTokens.accentPrimary;
  const ringBorderColor = isDark ? themeTokens.accentOutline : "#C11212";
  const buttonFillColor = isDark ? themeTokens.accentPrimary : "#CD5751";
  const orbitSurfaceColor = isDark ? themeTokens.surfaceElevated : "#FFFFFF";
  const ringGlowColor = isDark ? withAlpha(themeTokens.accentPrimary, 0.34) : withAlpha("#FFE7E5", 0.26);
  const innerGlowColor = isDark ? withAlpha(themeTokens.accentPrimary, 0.28) : withAlpha("#9B0B1F", 0.16);

  useEffect(() => {
    const duration = isCountdownActive ? 1600 : 2300;
    pulseProgress.value = 0;
    pulseProgress.value = withRepeat(
      withTiming(1, {
        duration,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true,
    );

    return () => cancelAnimation(pulseProgress);
  }, [isCountdownActive, pulseProgress]);

  useEffect(() => {
    countdownProgress.value = withTiming(isCountdownActive ? 1 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [countdownProgress, isCountdownActive]);

  const outerRingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 1], [0.72, isCountdownActive ? 0.34 : 0.34]),
    transform: [{ scale: interpolate(pulseProgress.value, [0, 1], [0.99, isCountdownActive ? 1.045 : 1.04]) }],
  }));

  const middleRingAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 1], [0.9, isCountdownActive ? 0.58 : 0.58]),
    transform: [{ scale: interpolate(pulseProgress.value, [0, 1], [0.992, isCountdownActive ? 1.03 : 1.025]) }],
  }));

  const innerButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulseProgress.value, [0, 1], [1, isCountdownActive ? 1.012 : 1.012]) }],
  }));

  const backgroundPulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulseProgress.value, [0, 1], [0.18, isCountdownActive ? 0.24 : 0.24]),
    transform: [{ scale: interpolate(pulseProgress.value, [0, 1], [0.92, isCountdownActive ? 1.04 : 1.02]) }],
  }));

  const startCountdown = () => {
    if (countdown !== null || sendingRef.current) {
      return;
    }

    setStatusMessage("After the countdown starts, slide to cancel if you need to stop.");
    setCountdown(COUNTDOWN_SECONDS);
  };

  const cancelCountdown = () => {
    setCountdown(null);
    setStatusMessage(IDLE_STATUS);
  };

  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }

    const timeout = setTimeout(() => setCountdown((value) => (value === null ? null : value - 1)), 1000);
    return () => clearTimeout(timeout);
  }, [countdown]);

  useEffect(() => {
    if (countdown !== 0 || sendingRef.current) {
      return;
    }

    const send = async () => {
      if (!authUser?.uid) {
        setStatusMessage("Sign in is required before SOS can be sent.");
        setCountdown(null);
        return;
      }

      if (!selectedGroupId) {
        setStatusMessage("Join a trusted circle first so SOS has someone to reach.");
        setCountdown(null);
        return;
      }

      if (!currentLocation) {
        setStatusMessage("Location is required before SOS can be sent.");
        setCountdown(null);
        return;
      }

      sendingRef.current = true;

      try {
        await firestoreService.createSosEvent({
          groupId: selectedGroupId,
          senderId: authUser.uid,
          message: "Immediate assistance requested. Check the live map for my current location.",
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        });
        setStatusMessage(
          recipientCount > 0
            ? `SOS sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`
            : "SOS sent.",
        );
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Unable to send the SOS right now.");
      } finally {
        setCountdown(null);
        sendingRef.current = false;
      }
    };

    void send();
  }, [authUser?.uid, countdown, currentLocation, recipientCount, selectedGroupId]);

  const primaryMessage =
    countdown !== null
      ? `After ${countdown} seconds, your SOS will be sent to ${recipientCount} ${recipientCount === 1 ? "person" : "people"}.`
      : statusMessage === IDLE_STATUS
        ? "Your trusted circle will receive your SOS alert and latest location the moment it is sent."
        : statusMessage;

  return (
    <SafeAreaView className="flex-1" edges={["top", "left", "right"]} style={{ backgroundColor: pageBackgroundColor }}>
      <View className="flex-1 px-6" style={{ backgroundColor: pageBackgroundColor }}>
        <View className="items-center pt-3">
          <Text className="text-[34px] font-semibold tracking-[0.01em] text-white">SOS</Text>
        </View>

        <View
          className="flex-1 items-center justify-center"
          style={{
            paddingTop: clamp(height * 0.015, 8, 20),
            paddingBottom: clamp(height * 0.02, 12, 28),
          }}
        >
          <View
            className="items-center justify-center"
            style={{
              height: orbitContainerSize,
              width: orbitContainerSize,
            }}
          >
            <Animated.View
              className="absolute rounded-full"
              style={[
                {
                  backgroundColor: ringGlowColor,
                  height: ringOuterSize * 0.86,
                  width: ringOuterSize * 0.86,
                },
                { borderRadius: (ringOuterSize * 0.86) / 2 },
                backgroundPulseAnimatedStyle,
              ]}
            />
            <Animated.View
              className="absolute items-center justify-center rounded-full border-2"
              style={[
                {
                  borderColor: ringBorderColor,
                  height: ringOuterSize,
                  width: ringOuterSize,
                },
                buildShadow(ringGlowColor, 10, isDark ? 0.18 : 0.1, 18, 8),
                outerRingAnimatedStyle,
              ]}
            >
              <Animated.View
                className="items-center justify-center rounded-full border-2"
                style={[
                  {
                    borderColor: ringBorderColor,
                    height: ringMiddleSize,
                    width: ringMiddleSize,
                  },
                  middleRingAnimatedStyle,
                ]}
              >
                <Animated.View style={innerButtonAnimatedStyle}>
                  <Pressable
                    className="items-center justify-center rounded-full"
                    delayLongPress={450}
                    onLongPress={startCountdown}
                    onPress={startCountdown}
                    style={{
                      backgroundColor: buttonFillColor,
                      height: ringInnerSize,
                      width: ringInnerSize,
                      ...buildShadow(innerGlowColor, isDark ? 18 : 12, isDark ? 0.36 : 0.18, isDark ? 20 : 12, 8),
                    }}
                  >
                    <MaterialCommunityIcons color="#FFFFFF" name="alarm-light" size={clamp(ringInnerSize * 0.22, 42, 60)} />
                    <Text className="mt-4 px-8 text-center text-[15px] leading-6 text-white">
                      {countdown !== null ? `Sending in ${countdown}s` : IDLE_STATUS}
                    </Text>
                  </Pressable>
                </Animated.View>
              </Animated.View>
            </Animated.View>

            {orbitMembers.map((member, index) => (
              <AvatarOrbit
                key={member.userId}
                active={countdown !== null}
                avatarSize={avatarSize}
                backgroundColor={orbitSurfaceColor}
                borderColor={orbitSurfaceColor}
                index={index}
                initialsColor={themeTokens.accentPrimary}
                member={{ displayName: member.displayName, photoURL: member.photoURL }}
                radius={orbitRadius}
                total={orbitMembers.length}
              />
            ))}
          </View>
        </View>

        <View
          className="pb-6"
          style={{
            paddingBottom: Math.max(insets.bottom, 18),
          }}
        >
          <Text className="text-[32px] leading-[46px] text-white">Take a breath, we’re here</Text>
          <Text className="mt-3 text-[15px] leading-6 text-white/90">{primaryMessage}</Text>

          {countdown !== null ? (
            <SlideToCancel active label="Slide to cancel" onComplete={cancelCountdown} />
          ) : (
            <Button
              className={`mx-auto mt-8 w-[220px] rounded-full border-0 ${isDark ? "bg-surface" : "bg-white"}`}
              label="Ready to send"
              onPress={startCountdown}
              textClassName={isDark ? "" : "text-accent"}
              variant="outline"
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

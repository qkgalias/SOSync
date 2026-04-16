/** Purpose: Establish the SOSync brand before handing off to the prototype-style onboarding flow. */
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Image, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useAppTheme } from "@/providers/AppThemeProvider";

const splashMarkSource = require("../../../../assets/branding/brand-mark.png");

export default function SplashScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const { width } = useWindowDimensions();
  const rowProgress = useSharedValue(0);
  const markShiftProgress = useSharedValue(0);
  const wordmarkProgress = useSharedValue(0.86);
  const markSize = Math.min(width * 0.18, 78);
  const gap = Math.min(width * 0.018, 9);
  const wordmarkWidth = Math.min(width * 0.24, 108);
  const sosSize = Math.min(width * 0.073, 32);
  const syncSize = Math.max(sosSize - 5, 20);

  useEffect(() => {
    rowProgress.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    markShiftProgress.value = withDelay(
      220,
      withTiming(1, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
    );
    wordmarkProgress.value = withDelay(
      120,
      withTiming(1, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      }),
    );

    const timeout = setTimeout(() => router.replace("/(onboarding)/welcome"), 1700);
    return () => clearTimeout(timeout);
  }, [markShiftProgress, router, rowProgress, wordmarkProgress]);

  const rowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rowProgress.value,
    transform: [
      {
        scale: interpolate(rowProgress.value, [0, 1], [0.94, 1]),
      },
      {
        translateY: interpolate(rowProgress.value, [0, 1], [8, 0]),
      },
    ],
  }));

  const markAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(markShiftProgress.value, [0, 1], [0, -6]),
      },
    ],
  }));

  const wordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rowProgress.value,
    width: interpolate(wordmarkProgress.value, [0.86, 1], [wordmarkWidth * 0.84, wordmarkWidth]),
  }));

  return (
    <SafeAreaView className="flex-1 bg-page">
      <View className="flex-1 items-center justify-center px-8">
        <Animated.View className="flex-row items-center justify-center" style={[rowAnimatedStyle, { gap }]}>
          <Animated.View className="items-center justify-center" style={markAnimatedStyle}>
            <Image
              source={splashMarkSource}
              style={{ height: markSize, width: markSize }}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View className="overflow-hidden" style={wordmarkAnimatedStyle}>
            <View className="flex-row items-start" style={{ width: wordmarkWidth }}>
              <Text
                className="font-semibold"
                style={{ color: themeTokens.accentPrimary, fontSize: sosSize, letterSpacing: -0.9, lineHeight: sosSize + 2 }}
              >
                SoS
              </Text>
              <Text
                className="font-semibold"
                style={{
                  color: themeTokens.textPrimary,
                  fontSize: syncSize,
                  letterSpacing: -0.6,
                  lineHeight: syncSize + 2,
                  marginLeft: -1,
                  marginTop: 4,
                }}
              >
                ync
              </Text>
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

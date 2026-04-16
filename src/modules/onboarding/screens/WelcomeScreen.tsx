/** Purpose: Present the three-slide prototype welcome flow before account entry. */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/Button";
import { useAppTheme } from "@/providers/AppThemeProvider";

const slides = [
  {
    image: require("../../../../assets/onboarding/welcome-hero.png"),
    key: "welcome",
    ratio: 352 / 339,
  },
  {
    image: require("../../../../assets/onboarding/notified-hero.png"),
    key: "notified",
    ratio: 354 / 339,
  },
  {
    image: require("../../../../assets/onboarding/track-hero.png"),
    key: "track",
    ratio: 348 / 344,
  },
 ] satisfies Array<{
  image: ReturnType<typeof require>;
  key: string;
  ratio: number;
}>;

const WelcomeHero = ({
  heroHeight,
  heroWidth,
  image,
}: {
  heroHeight: number;
  heroWidth: number;
  image: (typeof slides)[number]["image"];
}) => (
  <View className="items-center">
    <View className="items-center justify-center" style={{ height: heroHeight, width: heroWidth }}>
      <Image source={image} style={{ height: heroHeight, width: heroWidth }} resizeMode="contain" />
    </View>
  </View>
);

export default function WelcomeScreen() {
  const router = useRouter();
  const { resolvedTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const previousWidthRef = useRef(width);
  const heroWidth = Math.min(width - 44, 344);
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const widthChanged = previousWidthRef.current !== width;

    scrollRef.current?.scrollTo({
      x: width * activeIndex,
      animated: !widthChanged,
    });

    previousWidthRef.current = width;
  }, [activeIndex, width]);

  return (
    <View className="flex-1 bg-page">
      <SafeAreaView edges={["top"]} className="flex-1 bg-page">
        <View className="flex-1 bg-page">
          <View className="px-7 pt-4">
            <BrandLogo size="sm" />
          </View>
          <ScrollView
            ref={scrollRef}
            className="mt-8 flex-1"
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
          >
            {slides.map((slide) => (
              <View key={slide.key} className="px-5" style={{ width }}>
                <WelcomeHero
                  heroHeight={heroWidth * slide.ratio}
                  heroWidth={heroWidth}
                  image={slide.image}
                />
              </View>
            ))}
          </ScrollView>
          <View className="mb-5 flex-row items-center justify-center gap-2">
            {slides.map((slide, index) => (
              <View
                key={slide.key}
                className={index === activeIndex ? "h-2 w-2 rounded-full bg-primary" : "h-2 w-2 rounded-full bg-line"}
              />
            ))}
          </View>
          <View
            className={`rounded-t-[44px] border-t px-7 pt-8 ${isDark ? "border-line bg-secondaryPage" : "border-soft bg-primary"}`}
            style={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
          >
            <Button
              label="Join the Safety"
              onPress={() => router.push("/(onboarding)/signUp")}
              variant={isDark ? "outline" : "secondary"}
              className={`rounded-full py-4 ${isDark ? "border-0 bg-page" : ""}`}
              textClassName={`text-[23px] ${isDark ? "text-accent" : ""}`}
            />
            <View className={`mt-8 h-px ${isDark ? "bg-line" : "bg-white/70"}`} />
            <View className="mt-6 flex-row items-center justify-center">
              <Text className={`text-[12px] ${isDark ? "text-secondary" : "text-white"}`}>Already have an account? </Text>
              <Pressable onPress={() => router.push("/(onboarding)/signInEmail")}>
                <Text className={`text-[12px] underline ${isDark ? "text-ink" : "text-white"}`}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

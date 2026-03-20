/** Purpose: Establish the SOSync brand and lead new users into onboarding. */
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => router.replace("/(onboarding)/welcome"), 1200);
    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <Screen scroll={false} title="SOSync" subtitle="Private coordination for the moments that matter most.">
      <View className="mt-16 rounded-[36px] bg-primary p-8 shadow-soft">
        <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Safety network</Text>
        <Text className="mt-4 text-5xl font-black text-white">Stay located.</Text>
        <Text className="mt-2 text-5xl font-black text-white">Stay informed.</Text>
        <Text className="mt-6 text-base leading-7 text-white/80">
          SOSync keeps trusted circles aligned during floods, storms, and evacuations without exposing your location
          outside the people you choose.
        </Text>
      </View>
    </Screen>
  );
}

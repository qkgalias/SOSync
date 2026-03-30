/** Purpose: Preserve the legacy phone sign-in route while redirecting users into email sign-in. */
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { AuthScreen } from "@/components/AuthScreen";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { goBackOrReplace } from "@/utils/helpers";

export default function SignInNumberScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/(onboarding)/signInEmail");
  }, [router]);

  return (
    <AuthScreen
      scrollable={false}
      title="Sign In"
      topSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/welcome")} />}
      sheetClassName="mt-4 flex-1 px-6 pt-6"
    >
      <View className="flex-1 justify-center">
        <View>
          <Text className="mb-4 text-center text-[23px] font-semibold text-white">Phone sign-in has been removed</Text>
          <Text className="text-center text-[14px] leading-6 text-white/95">
            Continue with your email and password. We now verify new accounts with a code sent to email instead of SMS.
          </Text>
          <Button
            label="Go to email sign in"
            onPress={() => router.replace("/(onboarding)/signInEmail")}
            variant="secondary"
            className="mx-auto mt-10 w-[230px] rounded-full"
          />
        </View>
      </View>
    </AuthScreen>
  );
}

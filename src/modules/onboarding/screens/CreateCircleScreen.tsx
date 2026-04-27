/** Purpose: Let users create a trusted circle or join one with a permanent six-digit code. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { toFriendlyJoinCircleError } from "@/utils/circleErrors";
import { goBackOrReplace } from "@/utils/helpers";
import { inviteCodeSchema } from "@/utils/validators";

export default function CreateCircleScreen() {
  const router = useRouter();
  const { joinCircleWithInvite, saveProfile, skipCircleSetup } = useAuthSession();
  const { themeTokens } = useAppTheme();
  const [inviteCode, setInviteCode] = useState("");
  const [consentChecked, setConsentChecked] = useState(true);
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState<"join" | "skip" | "create" | null>(null);

  const handleJoin = async () => {
    const parsed = inviteCodeSchema.safeParse({ inviteCode });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter the 6-digit code shared by your trusted circle.");
      return;
    }

    if (!consentChecked) {
      setError("Agree to share your location with this circle before joining.");
      return;
    }

    setLoadingAction("join");
    setError("");

    try {
      await joinCircleWithInvite(parsed.data.inviteCode);
      router.replace("/(onboarding)/permissions");
    } catch (nextError) {
      setError(toFriendlyJoinCircleError(nextError));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreate = async () => {
    setLoadingAction("create");
    setError("");

    try {
      await saveProfile({
        onboarding: {
          currentStep: "circle-name",
          profileComplete: true,
          circleComplete: false,
          permissionsComplete: false,
        },
      });
      router.push("/(onboarding)/createCircleName");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to continue right now.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSkip = async () => {
    setLoadingAction("skip");
    setError("");

    try {
      await skipCircleSetup();
      router.replace("/(onboarding)/permissions");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to continue right now.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Screen
      title="Create your Trusted Circle"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/profileSetup")} />}
      contentClassName="justify-between pb-10"
    >
      <View className="pt-10">
        <Button
          label="Create New Group"
          onPress={handleCreate}
          loading={loadingAction === "create"}
          className="mx-auto min-w-[210px] rounded-[16px] px-6"
          icon={<MaterialCommunityIcons color="#FFFFFF" name="plus-circle-outline" size={22} />}
        />

        <Text className="mt-16 text-center text-[18px] font-semibold text-ink">Join Using Invite Code</Text>

        <View className="mt-6 px-6">
          <CodeInput value={inviteCode} onChangeValue={setInviteCode} cellClassName="h-16 w-14 rounded-[12px]" />
        </View>

        <Pressable
          className="mt-8 flex-row items-start px-2"
          onPress={() => {
            setConsentChecked((current) => !current);
            if (error) {
              setError("");
            }
          }}
        >
          <View className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-[6px] border border-primary">
            {consentChecked ? <MaterialCommunityIcons color={themeTokens.accentPrimary} name="check" size={18} /> : null}
          </View>
          <Text className="flex-1 text-sm leading-6 text-muted">
            By joining, you agree to share your location with this group.
          </Text>
        </Pressable>

        {error ? <Text className="mt-4 text-center text-sm text-danger">{error}</Text> : null}
      </View>

      <View className="gap-4">
        <Button
          label="Join Group"
          loading={loadingAction === "join"}
          onPress={handleJoin}
          className="mx-auto min-w-[210px] rounded-[16px] px-6"
        />
        <Button label="Skip for now" loading={loadingAction === "skip"} onPress={handleSkip} variant="ghost" />
      </View>
    </Screen>
  );
}

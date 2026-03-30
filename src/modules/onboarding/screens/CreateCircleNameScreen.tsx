/** Purpose: Let users name a new circle before the permanent invite code is revealed. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { groupSchema } from "@/utils/validators";

export default function CreateCircleNameScreen() {
  const router = useRouter();
  const { createCircle, saveProfile } = useAuthSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const parsed = groupSchema.safeParse({ name });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Give your circle a recognizable name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createCircle(parsed.data.name);
      router.replace("/(onboarding)/invite");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the trusted circle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Name your Trusted Circle"
      centerTitle
      leftSlot={
        <BackButton
          onPress={async () => {
            await saveProfile({
              onboarding: {
                currentStep: "circle",
                profileComplete: true,
                circleComplete: false,
                permissionsComplete: false,
              },
            });
            goBackOrReplace(router, "/(onboarding)/createCircle");
          }}
        />
      }
      contentClassName="pb-10"
    >
      <View className="pt-10">
        <Text className="mb-4 text-center text-[16px] leading-6 text-muted">
          Choose a group name your trusted circle will recognize during an emergency.
        </Text>
        <TextField
          label="Circle name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Family Circle"
          inputClassName="rounded-[14px] bg-panel"
          error={error}
        />
      </View>

      <Button label="Create Circle" loading={loading} onPress={handleCreate} className="mt-8" />
    </Screen>
  );
}

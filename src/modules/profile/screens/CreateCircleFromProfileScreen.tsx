/** Purpose: Let signed-in users create a new trusted circle outside the onboarding flow. */
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { groupSchema } from "@/utils/validators";

export default function CreateCircleFromProfileScreen() {
  const router = useRouter();
  const { createCircle } = useAuthSession();
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
      router.replace("/account");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the trusted circle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Create your Trusted Circle"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/(tabs)/profile")} />}
      contentClassName="pb-10"
    >
      <View className="pt-10">
        <Text className="mb-4 text-center text-[16px] leading-6 text-muted">
          Choose a circle name your trusted circle will recognize during an emergency.
        </Text>
        <TextField
          autoCapitalize="words"
          error={error}
          inputClassName="rounded-[18px] bg-panel"
          label="Circle name"
          onChangeText={setName}
          placeholder="Family Circle"
          value={name}
        />
      </View>

      <Button className="mt-8" label="Create circle" loading={loading} onPress={handleCreate} />
    </Screen>
  );
}

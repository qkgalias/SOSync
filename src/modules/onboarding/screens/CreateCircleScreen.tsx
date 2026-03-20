/** Purpose: Create the first trusted circle that receives location and SOS updates. */
import { useState } from "react";
import { useRouter } from "expo-router";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useGroups } from "@/hooks/useGroups";
import { groupSchema } from "@/utils/validators";

export default function CreateCircleScreen() {
  const router = useRouter();
  const { createCircle } = useGroups();
  const [name, setName] = useState("Family Response Circle");
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
      await createCircle(name);
      router.push("/(onboarding)/invite");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the trusted circle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Create your circle" subtitle="Group members will see each other’s location only inside this circle.">
      <TextField
        label="Circle name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        helperText="Examples: Family Response Circle, Neighborhood Watch, Response Team Alpha"
        error={error}
      />
      <Button label="Create circle" loading={loading} onPress={handleCreate} />
    </Screen>
  );
}

/** Purpose: Collect the account basics before profile enrichment and circle setup. */
import { useState } from "react";
import { useRouter } from "expo-router";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { signUpSchema } from "@/utils/validators";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail } = useAuthSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete the required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signUpWithEmail(name, email, password);
      router.replace("/(onboarding)/profileSetup");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create your account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Create your account" subtitle="Set up a private safety profile before inviting your circle.">
      <TextField label="Full name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        helperText="Use at least 8 characters so a fallback email login is still secure."
        error={error}
      />
      <Button label="Create account" loading={loading} onPress={handleSignUp} />
    </Screen>
  );
}

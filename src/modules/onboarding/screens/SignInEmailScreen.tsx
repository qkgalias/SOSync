/** Purpose: Support email sign-in for users who do not want OTP first. */
import { useState } from "react";
import { useRouter } from "expo-router";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { emailSignInSchema } from "@/utils/validators";

export default function SignInEmailScreen() {
  const router = useRouter();
  const { signInWithEmail } = useAuthSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    const parsed = emailSignInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signInWithEmail(email, password);
      router.replace("/");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Sign in with email" subtitle="Keep a backup access path for your trusted circles.">
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        error={error}
      />
      <Button label="Sign in" loading={loading} onPress={handleSignIn} />
    </Screen>
  );
}

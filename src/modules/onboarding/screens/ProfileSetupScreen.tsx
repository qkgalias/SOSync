/** Purpose: Capture the user profile data needed for trusted circle identity. */
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";

import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { profileSchema } from "@/utils/validators";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const [name, setName] = useState(profile?.name ?? authUser?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? authUser?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? authUser?.phoneNumber ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? authUser?.displayName ?? "");
    setEmail(profile?.email ?? authUser?.email ?? "");
    setPhoneNumber(profile?.phoneNumber ?? authUser?.phoneNumber ?? "");
  }, [authUser?.displayName, authUser?.email, authUser?.phoneNumber, profile]);

  const handleContinue = async () => {
    const parsed = profileSchema.safeParse({ name, email, phoneNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete your profile before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await saveProfile({
        name,
        email,
        phoneNumber,
        onboarding: {
          currentStep: "circle",
          profileComplete: true,
          circleComplete: false,
          permissionsComplete: false,
        },
      });
      router.push("/(onboarding)/createCircle");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to save your profile right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Build your profile" subtitle="Your trusted circles will use this to identify you during emergencies.">
      <TextField label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
      <TextField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
      <TextField
        label="Phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        error={error}
      />
      <Button label="Save and continue" loading={loading} onPress={handleContinue} />
    </Screen>
  );
}

/** Purpose: Capture the avatar plus final contact details shown to the user's trusted circle. */
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text, View } from "react-native";

import { AvatarPicker } from "@/components/AvatarPicker";
import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { profileMediaService } from "@/services/profileMediaService";
import { goBackOrReplace } from "@/utils/helpers";
import { profileSchema } from "@/utils/validators";

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const [displayName, setDisplayName] = useState(profile?.name ?? authUser?.displayName ?? "");
  const [email, setEmail] = useState(profile?.email ?? authUser?.email ?? "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phoneNumber ?? authUser?.phoneNumber ?? "");
  const [photoURL, setPhotoURL] = useState(profile?.photoURL ?? authUser?.photoURL ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.name ?? authUser?.displayName ?? "");
    setEmail(profile?.email ?? authUser?.email ?? "");
    setPhoneNumber(profile?.phoneNumber ?? authUser?.phoneNumber ?? "");
    setPhotoURL(profile?.photoURL ?? authUser?.photoURL ?? "");
  }, [authUser?.displayName, authUser?.email, authUser?.phoneNumber, authUser?.photoURL, profile]);

  const handleChooseAvatar = async () => {
    setAvatarLoading(true);
    setError("");

    try {
      const asset = await profileMediaService.pickImage();
      if (!asset?.uri) {
        return;
      }

      setLocalAvatarUri(asset.uri);
      setPhotoURL(asset.uri);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to choose a profile photo.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleContinue = async () => {
    const parsed = profileSchema.safeParse({ name: displayName, email, phoneNumber });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete your profile before continuing.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const uploadedPhotoUrl =
        localAvatarUri && authUser?.uid
          ? await profileMediaService.uploadProfilePhoto(authUser.uid, localAvatarUri)
          : photoURL;

      await saveProfile({
        name: parsed.data.name,
        email: parsed.data.email,
        phoneNumber: parsed.data.phoneNumber,
        photoURL: uploadedPhotoUrl,
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
    <Screen
      title="Profile Setup"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/(onboarding)/verification")} />}
      contentClassName="pb-10"
    >
      <View className="items-center pt-6">
        <AvatarPicker
          className="mb-8"
          loading={avatarLoading}
          name={displayName || "SOSync"}
          onPress={handleChooseAvatar}
          photoURL={photoURL}
        />
        <Text className="mb-6 text-center text-sm leading-6 text-muted">
          Add the profile photo your trusted circle will recognize, then confirm the contact details tied to this account.
        </Text>
      </View>
      <TextField
        label="Display Name"
        value={displayName}
        onChangeText={(value) => {
          setDisplayName(value);
          if (error) {
            setError("");
          }
        }}
        autoCapitalize="words"
        inputClassName="rounded-[14px] bg-panel"
      />
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        editable={false}
        keyboardType="email-address"
        inputClassName="rounded-[14px] bg-panel"
      />
      <TextField
        label="Phone number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        keyboardType="phone-pad"
        inputClassName="rounded-[14px] bg-panel"
      />
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      <Button label="Save Profile" loading={loading} onPress={handleContinue} className="mt-2" />
    </Screen>
  );
}

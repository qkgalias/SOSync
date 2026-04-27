/** Purpose: Let users update their display name and phone number while keeping email read-only. */
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { formatPhoneDigits, normalizePhoneDigits } from "@/utils/input";
import { contactDetailsSchema } from "@/utils/validators";

export default function EditProfileContactScreen() {
  const router = useRouter();
  const { authUser, profile, saveProfile } = useAuthSession();
  const initialName = profile?.name ?? authUser?.displayName ?? "Responder";
  const initialPhoneDigits = normalizePhoneDigits(profile?.phoneNumber ?? authUser?.phoneNumber ?? "");
  const [name, setName] = useState(initialName);
  const [phoneDigits, setPhoneDigits] = useState(initialPhoneDigits);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phoneNumber?: string }>({});
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const email = profile?.email ?? authUser?.email ?? "No email saved yet";

  const helperMessage = useMemo(() => "Email stays read-only because SOSync still uses it as the current verification method.", []);

  const handleSave = async () => {
    const parsed = contactDetailsSchema.safeParse({ name, phoneNumber: phoneDigits });
    if (!parsed.success) {
      const nextErrors: { name?: string; phoneNumber?: string } = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "name" || field === "phoneNumber") {
          nextErrors[field] = issue.message;
        }
      });
      setFieldErrors(nextErrors);
      setMessage("");
      return;
    }

    setFieldErrors({});
    const initialPhoneNumber = contactDetailsSchema.shape.phoneNumber.safeParse(initialPhoneDigits);
    const hasSamePhoneNumber =
      initialPhoneNumber.success && parsed.data.phoneNumber === initialPhoneNumber.data;

    if (parsed.data.name === initialName && hasSamePhoneNumber) {
      setMessage("Nothing changed yet.");
      return;
    }

    setLoadingAction(true);
    setMessage("");

    try {
      await saveProfile({
        name: parsed.data.name,
        phoneNumber: parsed.data.phoneNumber,
      });

      const nameChanged = parsed.data.name !== initialName;
      const phoneChanged = !hasSamePhoneNumber;
      if (nameChanged && phoneChanged) {
        setMessage("Username and phone number updated.");
      } else if (nameChanged) {
        setMessage("Username updated.");
      } else {
        setMessage("Phone number updated.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update your contact details right now.");
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <Screen
      title="Change Contact Details"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account/edit")} />}
      contentClassName="pb-10"
    >
      <View className="mt-7 rounded-[24px] bg-panel px-5 py-5">
        <TextField
          autoCapitalize="words"
          error={fieldErrors.name}
          inputClassName="rounded-[18px] border border-line bg-page"
          label="Username"
          onChangeText={setName}
          value={name}
        />

        <View className="mb-4">
          <Text className="mb-2 text-sm text-muted">Email</Text>
          <View className="rounded-[18px] border border-line bg-page px-4 py-4">
            <Text className="text-base text-ink">{email}</Text>
          </View>
          <Text className="mt-2 text-sm text-muted">{helperMessage}</Text>
        </View>

        <TextField
          error={fieldErrors.phoneNumber}
          helperText="Enter the 10-digit mobile number after +63."
          inputClassName="rounded-[18px] border border-line bg-page"
          keyboardType="phone-pad"
          label="Phone number"
          leftSlot={<Text className="text-base text-ink">+63</Text>}
          onChangeText={(value) => {
            setPhoneDigits(normalizePhoneDigits(value));
            if (fieldErrors.phoneNumber) {
              setFieldErrors((current) => ({ ...current, phoneNumber: undefined }));
            }
          }}
          placeholder="912 345 6789"
          value={formatPhoneDigits(phoneDigits)}
        />

        <Button
          className="mt-1 rounded-full bg-profileAccent"
          label="Save contact details"
          loading={loadingAction}
          onPress={handleSave}
          textClassName="text-white"
        />
      </View>

      {message ? <Text className="mt-3 text-sm text-profileAccent">{message}</Text> : null}
    </Screen>
  );
}

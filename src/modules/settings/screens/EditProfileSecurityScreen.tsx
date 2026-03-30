/** Purpose: Let users change their password with focused validation and specific feedback. */
import { useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { goBackOrReplace } from "@/utils/helpers";
import { passwordChangeSchema } from "@/utils/validators";

type PasswordErrors = {
  currentPassword?: string;
  nextPassword?: string;
  confirmPassword?: string;
};

export default function EditProfileSecurityScreen() {
  const router = useRouter();
  const { authUser, updatePassword } = useAuthSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<PasswordErrors>({});
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  const handleChangePassword = async () => {
    if (!authUser?.email) {
      setMessage("Password changes are only available for email-based accounts.");
      return;
    }

    const parsed = passwordChangeSchema.safeParse({
      confirmPassword,
      currentPassword,
      nextPassword,
    });

    if (!parsed.success) {
      const nextErrors: PasswordErrors = {};
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "currentPassword" || field === "nextPassword" || field === "confirmPassword") {
          nextErrors[field] = issue.message;
        }
      });
      setFieldErrors(nextErrors);
      setMessage("");
      return;
    }

    setFieldErrors({});
    setLoadingAction(true);
    setMessage("");

    try {
      await updatePassword(parsed.data.currentPassword, parsed.data.nextPassword);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setMessage("Password updated successfully.");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to update your password right now.";
      setMessage(nextMessage);
      if (/current password|incorrect email or password/i.test(nextMessage)) {
        setFieldErrors({ currentPassword: "Your current password is incorrect." });
      }
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <Screen
      title="Change Password"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account/edit")} />}
      contentClassName="pb-10"
    >
      <View className="mt-7 rounded-[24px] bg-panel px-5 py-5">
        <TextField
          error={fieldErrors.currentPassword}
          inputClassName="rounded-[18px] border border-line bg-page"
          label="Current password"
          onChangeText={setCurrentPassword}
          secureTextEntry
          value={currentPassword}
        />
        <TextField
          error={fieldErrors.nextPassword}
          helperText="Use at least 8 characters."
          inputClassName="rounded-[18px] border border-line bg-page"
          label="New password"
          onChangeText={setNextPassword}
          secureTextEntry
          value={nextPassword}
        />
        <TextField
          error={fieldErrors.confirmPassword}
          inputClassName="rounded-[18px] border border-line bg-page"
          label="Confirm new password"
          onChangeText={setConfirmPassword}
          secureTextEntry
          value={confirmPassword}
        />

        <Button
          className="mt-1 rounded-full bg-profileAccent"
          label="Update password"
          loading={loadingAction}
          onPress={handleChangePassword}
          textClassName="text-white"
        />
      </View>

      {message ? <Text className="mt-3 text-sm text-profileAccent">{message}</Text> : null}
    </Screen>
  );
}

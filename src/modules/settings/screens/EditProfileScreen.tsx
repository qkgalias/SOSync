/** Purpose: Provide an edit-profile hub for contact changes, password updates, and account deletion. */
import type { ComponentProps } from "react";
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { goBackOrReplace } from "@/utils/helpers";

const ActionCard = ({
  description,
  icon,
  onPress,
  title,
}: {
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  onPress: () => void;
  title: string;
}) => (
  <Pressable className="mb-4 flex-row items-center rounded-[22px] bg-panel px-5 py-5" onPress={onPress}>
    <View className="h-8 w-8 items-center justify-center">
      <MaterialCommunityIcons color={PROFILE_ACCENT} name={icon} size={22} />
    </View>
    <View className="ml-4 flex-1">
      <Text className="text-[18px] font-semibold text-ink">{title}</Text>
      <Text className="mt-1 text-sm leading-5 text-muted">{description}</Text>
    </View>
    <MaterialCommunityIcons color={PROFILE_ACCENT} name="chevron-right" size={24} />
  </Pressable>
);

export default function EditProfileScreen() {
  const router = useRouter();
  const { authUser, deleteAccount } = useAuthSession();
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [loadingDelete, setLoadingDelete] = useState(false);

  const closeDeleteModal = () => {
    setDeleteVisible(false);
    setDeletePassword("");
    setDeleteFeedback("");
  };

  const handleDeleteAccount = async () => {
    if (authUser?.email && !deletePassword.trim()) {
      setDeleteFeedback("Enter your current password to delete this account.");
      return;
    }

    setLoadingDelete(true);
    setDeleteFeedback("");

    try {
      await deleteAccount(deletePassword || undefined);
      router.replace("/(onboarding)/welcome");
    } catch (error) {
      setDeleteFeedback(error instanceof Error ? error.message : "Unable to delete your account right now.");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <Screen
      title="Edit Profile"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account")} />}
      contentClassName="pb-10"
    >
      <View className="mt-7">
        <ActionCard
          description="Update your display name and phone number."
          icon="account-edit-outline"
          onPress={() => router.push("/account/contact" as never)}
          title="Change contact details"
        />
        <ActionCard
          description="Enter your current password, then choose a new one."
          icon="form-textbox-password"
          onPress={() => router.push("/account/security" as never)}
          title="Change password"
        />
        <ActionCard
          description="Permanently remove your SOSync account and circle data."
          icon="trash-can-outline"
          onPress={() => setDeleteVisible(true)}
          title="Delete account"
        />
      </View>

      <Modal animationType="fade" transparent visible={deleteVisible} onRequestClose={closeDeleteModal}>
        <View className="flex-1 justify-center bg-black/35 px-6 py-10">
          <Pressable className="absolute inset-0" onPress={closeDeleteModal} />
          <View className="rounded-[28px] bg-white px-6 pb-5 pt-6 shadow-soft">
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-[24px] font-semibold text-ink">Delete account</Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  This permanently removes your SOSync profile, circles, alerts, and saved preferences.
                </Text>
              </View>
              <Pressable
                className="h-9 w-9 items-center justify-center rounded-full border border-profileAccent/20 bg-profileAccentSoft"
                hitSlop={10}
                onPress={closeDeleteModal}
              >
                <MaterialCommunityIcons color={PROFILE_ACCENT} name="close" size={22} />
              </Pressable>
            </View>

            {authUser?.email ? (
              <TextField
                containerClassName="mt-5"
                inputClassName="rounded-[18px] border border-line bg-page"
                label="Current password"
                onChangeText={setDeletePassword}
                secureTextEntry
                value={deletePassword}
              />
            ) : null}

            {deleteFeedback ? <Text className="mt-1 text-sm text-danger">{deleteFeedback}</Text> : null}

            <Button
              className="mt-5 min-h-11 rounded-full border border-danger bg-transparent"
              label="Delete account"
              loading={loadingDelete}
              onPress={handleDeleteAccount}
              textClassName="text-danger"
              variant="danger"
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

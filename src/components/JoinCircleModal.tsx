/** Purpose: Reuse the signed-in invite-code join flow across profile and account-circle surfaces. */
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useAppTheme } from "@/providers/AppThemeProvider";
import { inviteCodeSchema } from "@/utils/validators";

type JoinCircleModalProps = {
  onClose: () => void;
  onSuccess?: () => void;
  visible: boolean;
};

export const JoinCircleModal = ({ onClose, onSuccess, visible }: JoinCircleModalProps) => {
  const { joinCircleWithInvite } = useAuthSession();
  const { themeTokens } = useAppTheme();
  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setInviteCode("");
    setJoinError("");
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleJoinCircle = async () => {
    const parsed = inviteCodeSchema.safeParse({ inviteCode });
    if (!parsed.success) {
      setJoinError(parsed.error.issues[0]?.message ?? "Enter a valid 6-digit circle code.");
      return;
    }

    setLoading(true);
    setJoinError("");

    try {
      await joinCircleWithInvite(parsed.data.inviteCode);
      handleClose();
      onSuccess?.();
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join the trusted circle right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={handleClose}>
      <View className="flex-1 justify-center bg-black/30 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={handleClose} />
        <View className="rounded-[28px] bg-panel px-5 pb-5 pt-6 shadow-soft">
          <View className="flex-row items-start justify-between">
            <View className="mr-4 flex-1">
              <Text className="text-[24px] font-semibold text-ink">Join a circle</Text>
              <Text className="mt-2 text-sm leading-6 text-muted">
                Enter the 6-digit invite code shared with you by a trusted circle owner or admin.
              </Text>
            </View>
            <Pressable className="h-9 w-9 items-center justify-center" hitSlop={10} onPress={handleClose}>
              <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
            </Pressable>
          </View>

          <View className="mt-5">
            <CodeInput
              cellClassName="h-14 w-12 rounded-[14px]"
              emptyState="dot"
              onChangeValue={setInviteCode}
              rowClassName="justify-between"
              value={inviteCode}
            />
          </View>

          {joinError ? <Text className="mt-4 text-sm text-danger">{joinError}</Text> : null}

          <Button
            className="mt-6 min-h-11 rounded-[16px] bg-profileAccent"
            label="Join circle"
            loading={loading}
            onPress={() => void handleJoinCircle()}
            textClassName="text-white"
          />
        </View>
      </View>
    </Modal>
  );
};

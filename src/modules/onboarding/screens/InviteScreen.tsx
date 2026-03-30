/** Purpose: Show the permanent circle code and share it through native channels. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, Share, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroups } from "@/hooks/useGroups";
import { buildInviteMessage, goBackOrReplace } from "@/utils/helpers";

const channelConfig = [
  { value: "messenger", icon: "facebook-messenger", label: "Messenger" },
  { value: "link", icon: "link-variant", label: "Link" },
  { value: "email", icon: "email-outline", label: "Email" },
  { value: "message", icon: "message-text-outline", label: "Message" },
] as const;

export default function InviteScreen() {
  const router = useRouter();
  const { groups, selectedGroupId } = useGroups();
  const { saveProfile } = useAuthSession();
  const [actionMessage, setActionMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const activeGroup = groups.find((group) => group.groupId === selectedGroupId) ?? groups[0];
  const inviteCode = activeGroup?.inviteCode ?? "";

  const handleShare = async (channel: (typeof channelConfig)[number]["value"]) => {
    if (!inviteCode) {
      setActionMessage("This circle does not have a permanent invite code yet.");
      return;
    }

    const message = buildInviteMessage(activeGroup?.name ?? "SOSync Circle", inviteCode);

    if (channel === "messenger") {
      await Share.share({ message });
      setActionMessage("Invite ready to share.");
      return;
    }

    if (channel === "link") {
      await Clipboard.setStringAsync(message);
      setActionMessage("Invite copied to clipboard.");
      return;
    }

    if (channel === "email") {
      await Linking.openURL(
        `mailto:?subject=${encodeURIComponent("Join my SOSync circle")}&body=${encodeURIComponent(message)}`,
      );
      setActionMessage("Email composer opened.");
      return;
    }

    await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
    setActionMessage("Message composer opened.");
  };

  const handleContinue = async () => {
    setLoading(true);
    try {
      await saveProfile({
        onboarding: {
          currentStep: "permissions",
          profileComplete: true,
          circleComplete: true,
          permissionsComplete: false,
        },
      });
      router.push("/(onboarding)/permissions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Invite your Trusted Circle"
      centerTitle
      leftSlot={
        <BackButton
          onPress={async () => {
            await saveProfile({
              onboarding: {
                currentStep: "circle-name",
                profileComplete: true,
                circleComplete: true,
                permissionsComplete: false,
              },
            });
            goBackOrReplace(router, "/(onboarding)/createCircleName");
          }}
        />
      }
      contentClassName="pb-10"
    >
      <View className="pt-8">
        <Text className="mb-3 text-[16px] font-medium text-ink">Invite code</Text>
        <View className="flex-row items-center rounded-[16px] bg-panel">
          <View className="flex-1 px-5 py-4">
            <Text className="text-[28px] font-semibold tracking-[4px] text-ink">{inviteCode || "------"}</Text>
          </View>
          <Pressable
            className="h-full min-h-14 items-center justify-center rounded-r-[16px] bg-[#8E8A8A] px-5"
            onPress={() => {
              void handleShare("link");
            }}
          >
            <MaterialCommunityIcons color="#1E1E1E" name="clipboard-text-outline" size={24} />
          </Pressable>
        </View>
        <Text className="mt-3 text-sm text-muted">Share this permanent code with trusted individuals.</Text>
      </View>

      <View className="mt-16">
        <Text className="mb-5 text-[18px] font-medium text-ink">Share Invite via:</Text>
        <View className="flex-row flex-wrap justify-between gap-y-4">
          {channelConfig.map((entry) => (
            <Pressable
              key={entry.value}
              className="h-24 w-[22%] min-w-[72px] items-center justify-center rounded-[16px] bg-primary"
              onPress={() => {
                void handleShare(entry.value);
              }}
            >
              <MaterialCommunityIcons color="#FFFFFF" name={entry.icon} size={24} />
              <Text className="mt-2 text-center text-[13px] text-white">{entry.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {actionMessage ? <Text className="mt-8 text-center text-sm text-muted">{actionMessage}</Text> : null}

      <View className="mt-auto">
        <Button label="Skip for now" loading={loading} onPress={handleContinue} className="mx-auto min-w-[210px]" />
        <Text className="mt-4 text-center text-sm text-muted">You can always add more members later.</Text>
      </View>
    </Screen>
  );
}

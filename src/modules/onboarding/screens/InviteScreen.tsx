/** Purpose: Create invite records and launch share or compose actions for new members. */
import { useState } from "react";
import { useRouter } from "expo-router";
import { Linking, Share, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { InfoCard } from "@/components/InfoCard";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroups } from "@/hooks/useGroups";
import { buildInviteMessage } from "@/utils/helpers";
import { inviteSchema } from "@/utils/validators";

export default function InviteScreen() {
  const router = useRouter();
  const { groups, selectedGroupId } = useGroups();
  const { createInvite } = useAuthSession();
  const [contact, setContact] = useState("");
  const [channel, setChannel] = useState<"share" | "sms" | "email">("share");
  const [lastInviteCode, setLastInviteCode] = useState("");
  const [error, setError] = useState("");

  const activeGroup = groups.find((group) => group.groupId === selectedGroupId) ?? groups[0];

  const launchChannel = async (inviteCode: string) => {
    const message = buildInviteMessage(activeGroup?.name ?? "SOSync Circle", inviteCode);

    if (channel === "share") {
      await Share.share({ message });
      return;
    }

    if (channel === "sms") {
      await Linking.openURL(`sms:${contact}?body=${encodeURIComponent(message)}`);
      return;
    }

    await Linking.openURL(`mailto:${contact}?subject=${encodeURIComponent("Join my SOSync circle")}&body=${encodeURIComponent(message)}`);
  };

  const handleInvite = async () => {
    const parsed = inviteSchema.safeParse({ contact, channel });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Add a destination before inviting someone.");
      return;
    }

    try {
      const invite = await createInvite(contact, channel);
      setLastInviteCode(invite.inviteCode);
      setError("");
      await launchChannel(invite.inviteCode);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to create the invite.");
    }
  };

  return (
    <Screen title="Invite your circle" subtitle="Share a code now or skip ahead and invite later from settings.">
      <InfoCard title={activeGroup?.name ?? "Trusted circle"} eyebrow="Active circle">
        <Text className="text-sm leading-6 text-muted">
          Members only gain access after they accept the invite code and are added to the circle.
        </Text>
      </InfoCard>
      <TextField label="Phone or email" value={contact} onChangeText={setContact} error={error} />
      <View className="mb-4 flex-row gap-2">
        {(["share", "sms", "email"] as const).map((value) => (
          <View key={value} className="flex-1">
            <Button
              label={value.toUpperCase()}
              onPress={() => setChannel(value)}
              variant={channel === value ? "primary" : "secondary"}
            />
          </View>
        ))}
      </View>
      <Button label="Create invite" onPress={handleInvite} />
      {lastInviteCode ? (
        <Text className="mt-4 text-sm leading-6 text-muted">Latest invite code: {lastInviteCode}</Text>
      ) : null}
      <View className="mt-6">
        <Button label="Continue to permissions" onPress={() => router.push("/(onboarding)/permissions")} variant="ghost" />
      </View>
    </Screen>
  );
}

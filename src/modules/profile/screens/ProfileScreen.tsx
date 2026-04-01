/** Purpose: Present the polished signed-in profile hub with circle summary, settings entry points, and modal join flow. */
import { useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Button } from "@/components/Button";
import { CodeInput } from "@/components/CodeInput";
import { Screen } from "@/components/Screen";
import { SettingsRow } from "@/components/SettingsRow";
import { useAuthSession } from "@/hooks/useAuthSession";
import { PROFILE_ACCENT } from "@/modules/settings/profileTheme";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { profileMediaService } from "@/services/profileMediaService";
import { toInitials } from "@/utils/helpers";
import { inviteCodeSchema } from "@/utils/validators";

const AvatarPreview = ({
  displayName,
  offset,
  photoURL,
}: {
  displayName: string;
  offset: number;
  photoURL?: string;
}) => (
  <View
    className="absolute h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-page shadow-soft"
    style={{ left: offset * 28 }}
  >
    {photoURL ? (
      <Image className="h-9 w-9 rounded-full" resizeMode="cover" source={{ uri: photoURL }} />
    ) : (
      <Text className="text-xs font-semibold text-profileAccent">{toInitials(displayName)}</Text>
    )}
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const { authUser, groups, joinCircleWithInvite, profile, saveProfile, selectedGroupId, signOut } = useAuthSession();
  const [inviteCode, setInviteCode] = useState("");
  const [joinVisible, setJoinVisible] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"join" | null>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [joinError, setJoinError] = useState("");

  const activeGroup = groups.find((group) => group.groupId === selectedGroupId) ?? groups[0];
  const activeMembers = useGroupMembers(activeGroup?.groupId ?? null);
  const previewMembers = useMemo(() => activeMembers.slice(0, 4), [activeMembers]);
  const groupRoleLabel =
    activeGroup?.ownerId === authUser?.uid
      ? "Owner"
      : activeGroup?.memberRole === "admin"
        ? "Admin"
        : "Member";

  const contactLines = [profile?.email ?? authUser?.email, profile?.phoneNumber ?? authUser?.phoneNumber].filter(Boolean);

  const closeJoinModal = () => {
    setJoinVisible(false);
    setInviteCode("");
    setJoinError("");
  };

  const handleJoinCircle = async () => {
    const parsed = inviteCodeSchema.safeParse({ inviteCode });
    if (!parsed.success) {
      setJoinError(parsed.error.issues[0]?.message ?? "Enter a valid 6-digit circle code.");
      return;
    }

    setLoadingAction("join");
    setJoinError("");
    setStatusMessage("");
    setStatusTone("success");

    try {
      await joinCircleWithInvite(parsed.data.inviteCode);
      closeJoinModal();
      setStatusMessage("Trusted circle joined.");
    } catch (error) {
      setJoinError(error instanceof Error ? error.message : "Unable to join the trusted circle right now.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChooseAvatar = async () => {
    if (!authUser?.uid) {
      setStatusTone("error");
      setStatusMessage("Your session is still loading. Please try updating your profile photo again.");
      return;
    }

    setAvatarLoading(true);
    setStatusMessage("");
    setStatusTone("success");

    try {
      const asset = await profileMediaService.pickImage();
      if (!asset?.uri) {
        return;
      }

      const uploadedPhotoUrl = await profileMediaService.uploadProfilePhoto(authUser.uid, asset.uri);
      await saveProfile({ photoURL: uploadedPhotoUrl });
      setStatusMessage("Profile photo updated.");
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(error instanceof Error ? error.message : "Unable to update your profile photo right now.");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <Screen title="Profile" centerTitle contentClassName="pb-10">
      <View className="items-center px-2 pt-5">
        <View className="relative">
          <View className="h-28 w-28 items-center justify-center rounded-full bg-panel">
            {profile?.photoURL ? (
              <Image className="h-28 w-28 rounded-full" resizeMode="cover" source={{ uri: profile.photoURL }} />
            ) : (
              <Text className="text-[30px] font-semibold text-muted">{toInitials(profile?.name ?? "SOSync")}</Text>
            )}
          </View>
          <Pressable
            className="absolute bottom-1 right-1 h-10 w-10 items-center justify-center rounded-full border border-line bg-page shadow-soft"
            disabled={avatarLoading}
            hitSlop={10}
            onPress={() => void handleChooseAvatar()}
          >
            {avatarLoading ? (
              <ActivityIndicator color={PROFILE_ACCENT} size="small" />
            ) : (
              <MaterialCommunityIcons color={PROFILE_ACCENT} name="pencil-outline" size={20} />
            )}
          </Pressable>
        </View>

        <Text className="mt-5 text-[30px] font-semibold text-ink">{profile?.name ?? "Responder"}</Text>
        {contactLines.map((line) => (
          <Text key={line} className="mt-1 text-center text-[14px] leading-5 text-muted">
            {line}
          </Text>
        ))}
      </View>

      {activeGroup ? (
        <View className="mt-8 rounded-[24px] bg-panel px-5 py-5">
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-xs uppercase tracking-[0.18em] text-muted">Trusted Circle</Text>
              <Text className="mt-2 text-[22px] font-semibold text-ink">{activeGroup.name}</Text>
              <Text className="mt-1 text-sm text-muted">
                Active circle · {activeGroup.membersCount} {activeGroup.membersCount === 1 ? "member" : "members"}
              </Text>
            </View>
            <View className={`rounded-full px-3 py-2 ${groupRoleLabel === "Owner" ? "bg-white" : "bg-white/50"}`}>
              <Text
                className={`text-xs font-semibold uppercase tracking-[0.12em] ${
                  groupRoleLabel === "Owner" ? "text-muted" : "text-muted/70"
                }`}
              >
                {groupRoleLabel}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between">
            <View className="relative h-10 w-[122px]">
              {previewMembers.map((member, index) => (
                <AvatarPreview
                  key={member.userId}
                  displayName={member.displayName}
                  offset={index}
                  photoURL={member.photoURL}
                />
              ))}
            </View>
            <View className="w-[112px]">
              <Button
                className="min-h-10 rounded-full bg-profileAccent px-4 py-2"
                label="Manage"
                onPress={() => router.push(`/account/circle/${activeGroup.groupId}` as never)}
                textClassName="text-sm text-white"
              />
            </View>
          </View>
        </View>
      ) : (
        <View className="mt-8 rounded-[24px] bg-panel px-5 py-5">
          <Text className="text-xs uppercase tracking-[0.18em] text-muted">Trusted Circle</Text>
          <Text className="mt-2 text-[22px] font-semibold text-ink">No circle yet</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            Join an existing circle when someone shares a code with you, or create your own trusted circle.
          </Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Button
                className="min-h-11 rounded-full bg-profileAccent"
                label="Join circle"
                onPress={() => {
                  setJoinVisible(true);
                  setJoinError("");
                }}
                textClassName="text-white"
              />
            </View>
            <View className="flex-1">
              <Button
                className="min-h-11 rounded-full border border-profileAccent bg-transparent"
                label="Create circle"
                onPress={() => router.push("/circle/create" as never)}
                textClassName="text-profileAccent"
                variant="outline"
              />
            </View>
          </View>
        </View>
      )}

      {statusMessage ? (
        <Text className={`mt-4 text-sm ${statusTone === "error" ? "text-danger" : "text-profileAccent"}`}>
          {statusMessage}
        </Text>
      ) : null}

      <SettingsRow
        className="mt-8 rounded-[22px] px-5 py-5"
        icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="cog-outline" size={24} />}
        onPress={() => router.push("/general" as never)}
        titleClassName="text-[18px] font-semibold text-ink"
        title="General"
      />

      <SettingsRow
        className="rounded-[22px] px-5 py-5"
        icon={<MaterialCommunityIcons color={PROFILE_ACCENT} name="palette-outline" size={24} />}
        onPress={() => router.push("/appearance" as never)}
        titleClassName="text-[18px] font-semibold text-ink"
        title="Appearance"
      />

      <Button
        className="mt-8 min-h-11 rounded-full border border-profileAccent bg-transparent"
        label="Sign out"
        onPress={() => signOut()}
        textClassName="text-profileAccent"
        variant="outline"
      />

      <Modal animationType="fade" transparent visible={joinVisible} onRequestClose={closeJoinModal}>
        <View className="flex-1 justify-center bg-black/30 px-6 py-10">
          <Pressable className="absolute inset-0" onPress={closeJoinModal} />
          <View className="rounded-[28px] bg-white px-5 pt-6 pb-5 shadow-soft">
            <View className="flex-row items-start justify-between">
              <View className="mr-4 flex-1">
                <Text className="text-[24px] font-semibold text-ink">Join a circle</Text>
                <Text className="mt-2 text-sm leading-6 text-muted">
                  Enter the 6-digit invite code shared with you by a trusted circle owner or admin.
                </Text>
              </View>
              <Pressable className="h-9 w-9 items-center justify-center" hitSlop={10} onPress={closeJoinModal}>
                <MaterialCommunityIcons color={PROFILE_ACCENT} name="close" size={22} />
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
              loading={loadingAction === "join"}
              onPress={handleJoinCircle}
              textClassName="text-white"
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

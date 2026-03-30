/** Purpose: Let users manage profile identity, circles, invite code, and circle roles with a polished account layout. */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Image, Modal, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { PROFILE_ACCENT, getCircleRoleLabel, getCircleRoleSummary } from "@/modules/settings/profileTheme";
import type { GroupMember, GroupRole } from "@/types/group";
import { buildInviteMessage, goBackOrReplace, toInitials } from "@/utils/helpers";

const SectionCard = ({
  eyebrow,
  title,
  rightSlot,
  children,
}: {
  eyebrow?: string;
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}) => (
  <View className="mb-6 rounded-[24px] bg-panel px-5 py-5">
    <View className="mb-4 flex-row items-start justify-between">
      <View className="mr-3 flex-1">
        {eyebrow ? <Text className="mb-1 text-xs uppercase tracking-[0.12em] text-muted">{eyebrow}</Text> : null}
        <Text className="text-[19px] font-semibold text-ink">{title}</Text>
      </View>
      {rightSlot}
    </View>
    {children}
  </View>
);

const MemberActionModal = ({
  canManageRole,
  canRemove,
  canTransferOwnership,
  loadingAction,
  member,
  onClose,
  onRemove,
  onToggleRole,
  onTransferOwnership,
  roleLabel,
  visible,
}: {
  canManageRole: boolean;
  canRemove: boolean;
  canTransferOwnership: boolean;
  loadingAction: string | null;
  member: GroupMember | null;
  onClose: () => void;
  onRemove: () => void;
  onToggleRole: (nextRole: GroupRole) => void;
  onTransferOwnership: () => void;
  roleLabel: string;
  visible: boolean;
}) => {
  if (!member) {
    return null;
  }

  const nextRole: GroupRole = member.role === "admin" ? "member" : "admin";
  const canTakeAction = canManageRole || canTransferOwnership || canRemove;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[28px] bg-white px-6 pb-5 pt-6 shadow-soft">
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-[24px] font-semibold text-ink">{member.displayName}</Text>
              <Text className="mt-2 text-sm font-medium text-profileAccent">{roleLabel}</Text>
            </View>
            <Pressable className="h-9 w-9 items-center justify-center rounded-full border border-profileAccent/20 bg-profileAccentSoft" hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color={PROFILE_ACCENT} name="close" size={22} />
            </Pressable>
          </View>

          <View className="mt-5 rounded-[20px] bg-panel px-4 py-4">
            <Text className="text-sm font-semibold text-ink">Role permissions</Text>
            <Text className="mt-2 text-sm leading-6 text-muted">{getCircleRoleSummary(roleLabel)}</Text>
          </View>

          <View className="mt-4 rounded-[20px] bg-panel px-4 py-4">
            <Text className="text-sm font-semibold text-ink">Allowed actions</Text>
            {canTakeAction ? (
              <Text className="mt-2 text-sm leading-6 text-muted">
                Only the actions your current role is allowed to perform are shown here.
              </Text>
            ) : (
              <Text className="mt-2 text-sm leading-6 text-muted">
                You can review this person&apos;s role, but you do not currently have permission to change it.
              </Text>
            )}

            {canManageRole ? (
              <Button
                className="mt-4 min-h-11 rounded-full bg-profileAccent"
                label={nextRole === "admin" ? "Promote to admin" : "Change to member"}
                loading={loadingAction === `role:${member.userId}`}
                onPress={() => onToggleRole(nextRole)}
                textClassName="text-white"
              />
            ) : null}

            {canTransferOwnership ? (
              <Button
                className="mt-3 min-h-11 rounded-full border border-profileAccent bg-transparent"
                label="Transfer ownership"
                loading={loadingAction === `transfer:${member.userId}`}
                onPress={onTransferOwnership}
                textClassName="text-profileAccent"
                variant="outline"
              />
            ) : null}

            {canRemove ? (
              <Button
                className="mt-3 min-h-11 rounded-full border border-danger bg-transparent"
                label="Remove from circle"
                loading={loadingAction === `remove:${member.userId}`}
                onPress={onRemove}
                textClassName="text-danger"
                variant="danger"
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AccountScreen() {
  const router = useRouter();
  const {
    authUser,
    groups,
    leaveCircle,
    profile,
    removeCircleMember,
    selectedGroupId,
    setSelectedGroupId,
    transferCircleOwnership,
    updateCircleMemberRole,
  } = useAuthSession();
  const activeCircle = groups.find((group) => group.groupId === selectedGroupId) ?? groups[0];
  const members = useGroupMembers(activeCircle?.groupId ?? null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () => members.slice().sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [members],
  );
  const ownerMember = useMemo(
    () => sortedMembers.find((member) => member.userId === activeCircle?.ownerId) ?? null,
    [activeCircle?.ownerId, sortedMembers],
  );
  const otherMembers = useMemo(
    () => sortedMembers.filter((member) => member.userId !== activeCircle?.ownerId),
    [activeCircle?.ownerId, sortedMembers],
  );
  const selectedMember = useMemo(
    () => sortedMembers.find((member) => member.userId === selectedMemberId) ?? null,
    [selectedMemberId, sortedMembers],
  );

  const currentUserIsOwner = activeCircle?.ownerId === authUser?.uid;
  const currentUserIsAdmin = currentUserIsOwner || activeCircle?.memberRole === "admin";

  const getRoleLabel = (member: GroupMember) => getCircleRoleLabel(member.userId === activeCircle?.ownerId, member.role);

  const getMemberPermissions = (member: GroupMember | null) => {
    if (!member) {
      return {
        canManageRole: false,
        canRemove: false,
        canTransferOwnership: false,
        roleLabel: "Member",
      };
    }

    const isSelf = member.userId === authUser?.uid;
    const isOwner = member.userId === activeCircle?.ownerId;

    return {
      canManageRole: Boolean(currentUserIsOwner && !isSelf && !isOwner),
      canTransferOwnership: Boolean(currentUserIsOwner && !isSelf),
      canRemove: Boolean(
        !isSelf &&
          ((currentUserIsOwner && !isOwner) ||
            (currentUserIsAdmin && !currentUserIsOwner && member.role === "member")),
      ),
      roleLabel: getRoleLabel(member),
    };
  };

  const memberPermissions = getMemberPermissions(selectedMember);

  const handleLeaveCircle = async (groupId: string, circleName: string) => {
    setLoadingAction(`leave:${groupId}`);
    setMessage("");

    try {
      await leaveCircle(groupId);
      setMessage(`You left ${circleName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to leave ${circleName} right now.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShareInvite = async () => {
    if (!activeCircle?.inviteCode) {
      setMessage("This circle does not have a permanent invite code yet.");
      return;
    }

    await Share.share({
      message: buildInviteMessage(activeCircle.name, activeCircle.inviteCode),
    });
    setMessage(`Invite for ${activeCircle.name} is ready to share.`);
  };

  const handleCopyInvite = async () => {
    if (!activeCircle?.inviteCode) {
      setMessage("This circle does not have a permanent invite code yet.");
      return;
    }

    await Clipboard.setStringAsync(buildInviteMessage(activeCircle.name, activeCircle.inviteCode));
    setMessage(`Invite for ${activeCircle.name} copied to your clipboard.`);
  };

  const closeMemberModal = () => setSelectedMemberId(null);

  const runMemberAction = async (action: () => Promise<void>, fallbackMessage: string) => {
    try {
      await action();
      closeMemberModal();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : fallbackMessage);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTransferOwnership = (targetUserId: string, displayName: string) => {
    if (!activeCircle) {
      return;
    }

    Alert.alert("Transfer ownership", `Make ${displayName} the owner of ${activeCircle.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Transfer",
        style: "destructive",
        onPress: () => {
          setLoadingAction(`transfer:${targetUserId}`);
          setMessage("");
          void runMemberAction(
            async () => {
              await transferCircleOwnership(activeCircle.groupId, targetUserId);
              setMessage(`${displayName} is now the owner of ${activeCircle.name}.`);
            },
            `Unable to transfer ownership of ${activeCircle.name}.`,
          );
        },
      },
    ]);
  };

  const handleToggleRole = (targetUserId: string, displayName: string, nextRole: GroupRole) => {
    if (!activeCircle) {
      return;
    }

    setLoadingAction(`role:${targetUserId}`);
    setMessage("");

    void runMemberAction(
      async () => {
        await updateCircleMemberRole(activeCircle.groupId, targetUserId, nextRole);
        setMessage(
          nextRole === "admin"
            ? `${displayName} can now help manage ${activeCircle.name}.`
            : `${displayName} is now a member of ${activeCircle.name}.`,
        );
      },
      nextRole === "admin"
        ? `Unable to promote ${displayName} right now.`
        : `Unable to update ${displayName}'s circle role right now.`,
    );
  };

  const handleRemoveMember = (targetUserId: string, displayName: string) => {
    if (!activeCircle) {
      return;
    }

    Alert.alert("Remove from circle", `Remove ${displayName} from ${activeCircle.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setLoadingAction(`remove:${targetUserId}`);
          setMessage("");
          void runMemberAction(
            async () => {
              await removeCircleMember(activeCircle.groupId, targetUserId);
              setMessage(`${displayName} was removed from ${activeCircle.name}.`);
            },
            `Unable to remove ${displayName} right now.`,
          );
        },
      },
    ]);
  };

  return (
    <Screen
      title="Account"
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/general")} />}
      contentClassName="pb-10"
    >
      <SectionCard title="Profile information">
        <View className="flex-row items-center">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-page/70">
            {profile?.photoURL ? (
              <Image className="h-14 w-14 rounded-full" resizeMode="cover" source={{ uri: profile.photoURL }} />
            ) : (
              <Text className="text-[20px] font-semibold text-profileAccent">{toInitials(profile?.name ?? "SOSync")}</Text>
            )}
          </View>

          <View className="ml-4 flex-1">
            <Text className="text-[21px] font-semibold text-ink">{profile?.name ?? "Responder"}</Text>
          </View>
        </View>

        <View className="mt-4 border-t border-line pt-4">
          <View className="mb-3 flex-row items-center">
            <MaterialCommunityIcons color={PROFILE_ACCENT} name="phone" size={20} />
            <Text className="ml-3 text-sm text-ink">{profile?.phoneNumber ?? authUser?.phoneNumber ?? "No phone number saved yet"}</Text>
          </View>
          <View className="flex-row items-center">
            <MaterialCommunityIcons color={PROFILE_ACCENT} name="email-outline" size={20} />
            <Text className="ml-3 text-sm text-ink">{profile?.email ?? authUser?.email ?? "No email saved yet"}</Text>
          </View>

          <Button
            className="mt-5 min-h-10 rounded-full bg-profileAccent px-4 py-2"
            label="Edit profile"
            onPress={() => router.push("/account/edit" as never)}
            textClassName="text-sm text-white"
          />
        </View>
      </SectionCard>

      <SectionCard
        eyebrow="Circles"
        rightSlot={
          <Pressable
            className="h-11 w-11 items-center justify-center"
            hitSlop={10}
            onPress={() => router.push("/circle/create" as never)}
          >
            <MaterialCommunityIcons color={PROFILE_ACCENT} name="plus" size={28} />
          </Pressable>
        }
        title="Circles"
      >
        {!groups.length ? <Text className="text-sm leading-6 text-muted">You have not joined a circle yet.</Text> : null}

        {groups.map((circle, index) => {
          const isSelected = circle.groupId === selectedGroupId;
          const roleLabel = getCircleRoleLabel(circle.ownerId === authUser?.uid, circle.memberRole);

          return (
            <View key={circle.groupId} className={index === 0 ? "py-3" : "border-t border-line py-3"}>
              <View className="flex-row items-center justify-between">
                <View className="mr-3 flex-1">
                  <Text className="text-[18px] font-semibold text-ink">{circle.name}</Text>
                  <Text className="mt-1 text-sm text-muted">
                    {circle.membersCount} {circle.membersCount === 1 ? "member" : "members"} · {roleLabel.toLowerCase()}
                    {isSelected ? " · active" : ""}
                  </Text>
                </View>

                <View className="flex-row items-center gap-3">
                  {!isSelected ? (
                    <View className="w-[96px]">
                      <Button
                        className="min-h-10 rounded-full bg-profileAccent px-4 py-2"
                        label="Use"
                        onPress={() => {
                          setSelectedGroupId(circle.groupId);
                          setMessage(`${circle.name} is now your active circle.`);
                        }}
                        textClassName="text-sm text-white"
                      />
                    </View>
                  ) : (
                    <View className="w-[96px]">
                      <Button
                        className="min-h-10 rounded-full border border-profileAccent bg-transparent px-4 py-2"
                        label="Leave"
                        loading={loadingAction === `leave:${circle.groupId}`}
                        onPress={() => handleLeaveCircle(circle.groupId, circle.name)}
                        textClassName="text-sm text-profileAccent"
                        variant="outline"
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </SectionCard>

      {activeCircle ? (
        <SectionCard eyebrow={activeCircle.name} title="Circle code">
          <Text className="text-[34px] font-semibold tracking-[6px] text-profileAccent">{activeCircle.inviteCode}</Text>
          <Text className="mt-3 text-sm leading-6 text-muted">
            This permanent 6-digit code lets trusted people join {activeCircle.name} from their own SOSync account.
          </Text>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1">
              <Button
                className="min-h-11 rounded-full bg-profileAccent"
                label="Share code"
                onPress={() => void handleShareInvite()}
                textClassName="text-white"
              />
            </View>
            <View className="flex-1">
              <Button
                className="min-h-11 rounded-full border border-profileAccent bg-transparent"
                label="Copy invite"
                onPress={() => void handleCopyInvite()}
                textClassName="text-profileAccent"
                variant="outline"
              />
            </View>
          </View>
        </SectionCard>
      ) : null}

      {activeCircle ? (
        <SectionCard eyebrow={activeCircle.name} title="Membership">
          <Text className="mb-4 text-sm leading-5 text-muted">Tap a circle member to view permissions and available actions.</Text>
          {ownerMember ? (
            <View className="border-b border-line pb-4">
              <Text className="mb-3 text-xs uppercase tracking-[0.12em] text-muted">Owner</Text>
              <Pressable className="flex-row items-center" onPress={() => setSelectedMemberId(ownerMember.userId)}>
                <View className="h-12 w-12 items-center justify-center rounded-full bg-page/70">
                  {ownerMember.photoURL ? (
                    <Image className="h-12 w-12 rounded-full" resizeMode="cover" source={{ uri: ownerMember.photoURL }} />
                  ) : (
                    <Text className="text-sm font-semibold text-profileAccent">{toInitials(ownerMember.displayName)}</Text>
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-semibold text-ink">
                    {ownerMember.displayName}
                    {ownerMember.userId === authUser?.uid ? " (You)" : ""}
                  </Text>
                  <Text className="mt-1 text-sm text-muted">
                    Owner
                    {ownerMember.email ? ` · ${ownerMember.email}` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons color="#111111" name="chevron-right" size={24} />
              </Pressable>
            </View>
          ) : null}

          <View className="pt-4">
            <Text className="mb-3 text-xs uppercase tracking-[0.12em] text-muted">Members</Text>
            {!otherMembers.length ? (
              <Text className="text-sm leading-6 text-muted">No other members found for this circle yet.</Text>
            ) : null}

            {otherMembers.map((member, index) => (
              <Pressable
                key={member.userId}
                className={index === 0 ? "py-3" : "border-t border-line py-3"}
                onPress={() => setSelectedMemberId(member.userId)}
              >
                <View className="flex-row items-center">
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-page/70">
                    {member.photoURL ? (
                      <Image className="h-12 w-12 rounded-full" resizeMode="cover" source={{ uri: member.photoURL }} />
                    ) : (
                      <Text className="text-sm font-semibold text-profileAccent">{toInitials(member.displayName)}</Text>
                    )}
                  </View>

                  <View className="ml-4 flex-1">
                    <Text className="text-[16px] font-semibold text-ink">
                      {member.displayName}
                      {member.userId === authUser?.uid ? " (You)" : ""}
                    </Text>
                    <Text className="mt-1 text-sm text-muted">
                      {getRoleLabel(member)}
                      {member.email ? ` · ${member.email}` : ""}
                    </Text>
                  </View>
                  <MaterialCommunityIcons color="#111111" name="chevron-right" size={24} />
                </View>
              </Pressable>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {message ? <Text className="mt-1 text-sm text-profileAccent">{message}</Text> : null}

      <MemberActionModal
        canManageRole={memberPermissions.canManageRole}
        canRemove={memberPermissions.canRemove}
        canTransferOwnership={memberPermissions.canTransferOwnership}
        loadingAction={loadingAction}
        member={selectedMember}
        onClose={closeMemberModal}
        onRemove={() => selectedMember && handleRemoveMember(selectedMember.userId, selectedMember.displayName)}
        onToggleRole={(nextRole) => selectedMember && handleToggleRole(selectedMember.userId, selectedMember.displayName, nextRole)}
        onTransferOwnership={() => selectedMember && handleTransferOwnership(selectedMember.userId, selectedMember.displayName)}
        roleLabel={memberPermissions.roleLabel}
        visible={Boolean(selectedMember)}
      />
    </Screen>
  );
}

/** Purpose: Show invite-code, membership, and role-management details for one selected circle. */
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Alert, Image, Modal, Pressable, Share, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { BackButton } from "@/components/BackButton";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useGroupMembers } from "@/hooks/useGroupMembers";
import { getCircleRoleLabel, getCircleRoleSummary } from "@/modules/settings/profileTheme";
import { useAppTheme } from "@/providers/AppThemeProvider";
import type { GroupMember, GroupRole } from "@/types/group";
import { buildInviteMessage, goBackOrReplace, toInitials } from "@/utils/helpers";

const SectionCard = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) => (
  <View className="mb-6 rounded-[24px] bg-panel px-5 py-5">
    <View className="mb-4">
      {eyebrow ? <Text className="mb-1 text-xs uppercase tracking-[0.12em] text-muted">{eyebrow}</Text> : null}
      <Text className="text-[19px] font-semibold text-ink">{title}</Text>
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
  const { themeTokens } = useAppTheme();

  if (!member) {
    return null;
  }

  const nextRole: GroupRole = member.role === "admin" ? "member" : "admin";
  const canTakeAction = canManageRole || canTransferOwnership || canRemove;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-6 py-10">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[28px] bg-panel px-6 pb-5 pt-6 shadow-soft">
          <View className="flex-row items-start justify-between">
            <View className="mr-3 flex-1">
              <Text className="text-[24px] font-semibold text-ink">{member.displayName}</Text>
              <Text className="mt-2 text-sm font-medium text-profileAccent">{roleLabel}</Text>
            </View>
            <Pressable className="h-9 w-9 items-center justify-center" hitSlop={10} onPress={onClose}>
              <MaterialCommunityIcons color={themeTokens.accentPrimary} name="close" size={22} />
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

export default function CircleDetailScreen() {
  const router = useRouter();
  const { themeTokens } = useAppTheme();
  const { groupId: groupIdParam } = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(groupIdParam) ? groupIdParam[0] : groupIdParam;
  const {
    authUser,
    groups,
    leaveCircle,
    removeCircleMember,
    transferCircleOwnership,
    updateCircleMemberRole,
  } = useAuthSession();
  const circle = groups.find((group) => group.groupId === groupId) ?? null;
  const members = useGroupMembers(circle?.groupId ?? null);
  const [message, setMessage] = useState("");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const sortedMembers = useMemo(
    () => members.slice().sort((left, right) => left.displayName.localeCompare(right.displayName)),
    [members],
  );
  const ownerMember = useMemo(
    () => sortedMembers.find((member) => member.userId === circle?.ownerId) ?? null,
    [circle?.ownerId, sortedMembers],
  );
  const otherMembers = useMemo(
    () => sortedMembers.filter((member) => member.userId !== circle?.ownerId),
    [circle?.ownerId, sortedMembers],
  );
  const selectedMember = useMemo(
    () => sortedMembers.find((member) => member.userId === selectedMemberId) ?? null,
    [selectedMemberId, sortedMembers],
  );

  if (!circle) {
    return (
      <Screen
        title="Circle"
        centerTitle
        leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account/circles")} />}
        contentClassName="pb-10"
      >
        <View className="mt-7 rounded-[24px] bg-panel px-5 py-5">
          <Text className="text-[20px] font-semibold text-ink">Circle not found</Text>
          <Text className="mt-2 text-sm leading-6 text-muted">
            This circle is no longer available in your account.
          </Text>

          <Button
            className="mt-5 min-h-11 rounded-full bg-profileAccent"
            label="Back to Joined Circles"
            onPress={() => router.replace("/account/circles" as never)}
            textClassName="text-white"
          />
        </View>
      </Screen>
    );
  }

  const currentUserIsOwner = circle.ownerId === authUser?.uid;
  const currentUserIsAdmin = currentUserIsOwner || circle.memberRole === "admin";

  const getMemberRoleLabel = (member: GroupMember) =>
    getCircleRoleLabel(member.userId === circle.ownerId, member.role);

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
    const isOwner = member.userId === circle.ownerId;

    return {
      canManageRole: Boolean(currentUserIsOwner && !isSelf && !isOwner),
      canTransferOwnership: Boolean(currentUserIsOwner && !isSelf),
      canRemove: Boolean(
        !isSelf &&
          ((currentUserIsOwner && !isOwner) ||
            (currentUserIsAdmin && !currentUserIsOwner && member.role === "member")),
      ),
      roleLabel: getMemberRoleLabel(member),
    };
  };

  const memberPermissions = getMemberPermissions(selectedMember);

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

  const handleLeaveCircle = async () => {
    setLoadingAction(`leave:${circle.groupId}`);
    setMessage("");

    try {
      await leaveCircle(circle.groupId);
      router.replace("/account/circles" as never);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to leave ${circle.name} right now.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleShareInvite = async () => {
    if (!circle.inviteCode) {
      setMessage("This circle does not have a permanent invite code yet.");
      return;
    }

    await Share.share({
      message: buildInviteMessage(circle.name, circle.inviteCode),
    });
    setMessage(`Invite for ${circle.name} is ready to share.`);
  };

  const handleCopyInvite = async () => {
    if (!circle.inviteCode) {
      setMessage("This circle does not have a permanent invite code yet.");
      return;
    }

    await Clipboard.setStringAsync(buildInviteMessage(circle.name, circle.inviteCode));
    setMessage(`Invite for ${circle.name} copied to your clipboard.`);
  };

  const handleTransferOwnership = (targetUserId: string, displayName: string) => {
    Alert.alert("Transfer ownership", `Make ${displayName} the owner of ${circle.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Transfer",
        style: "destructive",
        onPress: () => {
          setLoadingAction(`transfer:${targetUserId}`);
          setMessage("");
          void runMemberAction(
            async () => {
              await transferCircleOwnership(circle.groupId, targetUserId);
              setMessage(`${displayName} is now the owner of ${circle.name}.`);
            },
            `Unable to transfer ownership of ${circle.name}.`,
          );
        },
      },
    ]);
  };

  const handleToggleRole = (targetUserId: string, displayName: string, nextRole: GroupRole) => {
    setLoadingAction(`role:${targetUserId}`);
    setMessage("");

    void runMemberAction(
      async () => {
        await updateCircleMemberRole(circle.groupId, targetUserId, nextRole);
        setMessage(
          nextRole === "admin"
            ? `${displayName} can now help manage ${circle.name}.`
            : `${displayName} is now a member of ${circle.name}.`,
        );
      },
      nextRole === "admin"
        ? `Unable to promote ${displayName} right now.`
        : `Unable to update ${displayName}'s circle role right now.`,
    );
  };

  const handleRemoveMember = (targetUserId: string, displayName: string) => {
    Alert.alert("Remove from circle", `Remove ${displayName} from ${circle.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setLoadingAction(`remove:${targetUserId}`);
          setMessage("");
          void runMemberAction(
            async () => {
              await removeCircleMember(circle.groupId, targetUserId);
              setMessage(`${displayName} was removed from ${circle.name}.`);
            },
            `Unable to remove ${displayName} right now.`,
          );
        },
      },
    ]);
  };

  return (
    <Screen
      title={circle.name}
      centerTitle
      leftSlot={<BackButton onPress={() => goBackOrReplace(router, "/account/circles")} />}
      contentClassName="pb-10"
    >
      <SectionCard eyebrow={circle.name} title="Invite Code">
        <Text className="text-[34px] font-semibold tracking-[6px] text-accent">{circle.inviteCode}</Text>
        <Text className="mt-3 text-sm leading-6 text-muted">
          This permanent 6-digit code lets trusted people join {circle.name} from their own SOSync account.
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

      <SectionCard eyebrow={circle.name} title="Membership">
        <Text className="mb-4 text-sm leading-5 text-muted">
          Tap a circle member to view permissions and available actions.
        </Text>
        {ownerMember ? (
          <View className="border-b border-line pb-4">
            <Text className="mb-3 text-xs uppercase tracking-[0.12em] text-muted">Owner</Text>
            <Pressable className="flex-row items-center" onPress={() => setSelectedMemberId(ownerMember.userId)}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-page/70">
                {ownerMember.photoURL ? (
                  <Image className="h-12 w-12 rounded-full" resizeMode="cover" source={{ uri: ownerMember.photoURL }} />
                ) : (
                    <Text className="text-sm font-semibold text-accent">{toInitials(ownerMember.displayName)}</Text>
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
              <MaterialCommunityIcons color={themeTokens.textPrimary} name="chevron-right" size={24} />
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
                    <Text className="text-sm font-semibold text-accent">{toInitials(member.displayName)}</Text>
                  )}
                </View>

                <View className="ml-4 flex-1">
                  <Text className="text-[16px] font-semibold text-ink">
                    {member.displayName}
                    {member.userId === authUser?.uid ? " (You)" : ""}
                  </Text>
                  <Text className="mt-1 text-sm text-muted">
                    {getMemberRoleLabel(member)}
                    {member.email ? ` · ${member.email}` : ""}
                  </Text>
                </View>
                <MaterialCommunityIcons color={themeTokens.textPrimary} name="chevron-right" size={24} />
              </View>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      {message ? <Text className="mt-1 text-sm text-accent">{message}</Text> : null}

      <Button
        className="mt-2 min-h-11 rounded-full border border-danger bg-transparent"
        label="Leave circle"
        loading={loadingAction === `leave:${circle.groupId}`}
        onPress={handleLeaveCircle}
        textClassName="text-danger"
        variant="danger"
      />

      <MemberActionModal
        canManageRole={memberPermissions.canManageRole}
        canRemove={memberPermissions.canRemove}
        canTransferOwnership={memberPermissions.canTransferOwnership}
        loadingAction={loadingAction}
        member={selectedMember}
        onClose={closeMemberModal}
        onRemove={() => selectedMember && handleRemoveMember(selectedMember.userId, selectedMember.displayName)}
        onToggleRole={(nextRole) =>
          selectedMember && handleToggleRole(selectedMember.userId, selectedMember.displayName, nextRole)
        }
        onTransferOwnership={() =>
          selectedMember && handleTransferOwnership(selectedMember.userId, selectedMember.displayName)
        }
        roleLabel={memberPermissions.roleLabel}
        visible={Boolean(selectedMember)}
      />
    </Screen>
  );
}

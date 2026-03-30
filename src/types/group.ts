/** Purpose: Group, member, and circle-preference contracts for trusted circle collaboration. */
import type { SafetyStatus } from "@/types/user";

export type GroupRole = "admin" | "member";

export type Group = {
  groupId: string;
  name: string;
  createdBy: string;
  ownerId: string;
  createdAt: string;
  inviteCode: string;
  membersCount: number;
  memberRole?: GroupRole;
  region: string;
};

export type GroupMember = {
  userId: string;
  groupId: string;
  displayName: string;
  role: GroupRole;
  joinedAt: string;
  phoneNumber?: string;
  email?: string;
  photoURL?: string;
};

export type GroupPreferences = {
  groupId: string;
  primaryContactIds: string[];
  preferredHotlineId?: string;
};

export type GroupStatus = {
  groupId: string;
  userId: string;
  status: SafetyStatus;
  updatedAt: string;
};

export type BlockedUser = {
  blockedUserId: string;
  createdAt: string;
};

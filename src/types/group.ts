/** Purpose: Group, member, and invite contracts for trusted circle collaboration. */
export type GroupRole = "admin" | "member";

export type Group = {
  groupId: string;
  name: string;
  createdBy: string;
  createdAt: string;
  groupCode: string;
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
};

export type GroupInviteStatus = "pending" | "accepted" | "expired";

export type GroupInviteChannel = "share" | "sms" | "email";

export type GroupInvite = {
  inviteId: string;
  groupId: string;
  createdBy: string;
  inviteCode: string;
  channel: GroupInviteChannel;
  contact: string;
  status: GroupInviteStatus;
  createdAt: string;
  expiresAt: string;
};

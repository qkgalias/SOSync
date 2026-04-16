/** Purpose: Create circles, join by permanent code, and enforce owner/admin/member permissions. */
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminDb } from "./admin.js";
import { functionsRegion } from "./config.js";
import { nowIso } from "./helpers.js";
import {
  GROUP_NAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  normalizeDisplayName,
  normalizeGroupName,
  sanitizeInviteCode,
} from "./input.js";

type GroupRecord = {
  createdAt?: string;
  createdBy?: string;
  inviteCode?: string;
  membersCount?: number;
  name?: string;
  ownerId?: string;
  region?: string;
};

type MembershipRecord = {
  displayName?: string;
  joinedAt?: string;
  role?: "admin" | "member";
};

const CIRCLE_CODE_REGEX = /^\d{6}$/;

const assertAuthenticated = (uid?: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before managing a trusted circle.");
  }

  return uid;
};

const toGroupRef = (groupId: string) => adminDb.collection("groups").doc(groupId);
const toMemberRef = (groupId: string, userId: string) => toGroupRef(groupId).collection("members").doc(userId);
const toLocationRef = (groupId: string, userId: string) => adminDb.collection("locations").doc(`${groupId}_${userId}`);

const toGroupPayload = (
  groupId: string,
  group: GroupRecord,
  memberRole?: "admin" | "member",
) => ({
  groupId,
  name: group.name ?? "Trusted Circle",
  createdBy: group.createdBy ?? "",
  ownerId: group.ownerId ?? group.createdBy ?? "",
  createdAt: group.createdAt ?? nowIso(),
  inviteCode: group.inviteCode ?? "",
  membersCount: Number(group.membersCount ?? 0),
  memberRole,
  region: group.region ?? "PH",
});

const generateUniqueInviteCode = async (reservedCodes = new Set<string>()) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const inviteCode = `${Math.floor(Math.random() * 900000 + 100000)}`;
    if (reservedCodes.has(inviteCode)) {
      continue;
    }

    const existing = await adminDb.collection("groups").where("inviteCode", "==", inviteCode).limit(1).get();
    if (existing.empty) {
      return inviteCode;
    }
  }

  throw new HttpsError("resource-exhausted", "Unable to generate a unique circle code right now.");
};

const resolveLegacyInviteCodeForGroup = async (groupId: string, reservedCodes = new Set<string>()) => {
  const legacyInvites = await toGroupRef(groupId)
    .collection("invites")
    .orderBy("createdAt", "desc")
    .get()
    .catch(() => null);

  if (legacyInvites) {
    for (const inviteDoc of legacyInvites.docs) {
      const inviteCode = sanitizeInviteCode(inviteDoc.data().inviteCode);
      if (CIRCLE_CODE_REGEX.test(inviteCode) && !reservedCodes.has(inviteCode)) {
        const conflict = await adminDb.collection("groups").where("inviteCode", "==", inviteCode).limit(1).get();
        if (conflict.empty) {
          return inviteCode;
        }
      }
    }
  }

  return generateUniqueInviteCode(reservedCodes);
};

const ensurePermanentGroupFields = async (groupId: string, group: GroupRecord) => {
  const updates: Partial<GroupRecord> = {};

  if (!group.ownerId && group.createdBy) {
    updates.ownerId = group.createdBy;
  }

  if (!group.inviteCode) {
    updates.inviteCode = await resolveLegacyInviteCodeForGroup(groupId);
  }

  if (!Object.keys(updates).length) {
    return { ...group, ...updates };
  }

  await toGroupRef(groupId).set(updates, { merge: true });
  return { ...group, ...updates };
};

const getGroupAndMember = async (groupId: string, userId: string) => {
  const [groupSnapshot, memberSnapshot] = await Promise.all([toGroupRef(groupId).get(), toMemberRef(groupId, userId).get()]);

  if (!groupSnapshot.exists) {
    throw new HttpsError("not-found", "Trusted circle not found.");
  }

  if (!memberSnapshot.exists) {
    throw new HttpsError("permission-denied", "You are not a member of this trusted circle.");
  }

  const group = await ensurePermanentGroupFields(groupId, groupSnapshot.data() as GroupRecord);
  const membership = memberSnapshot.data() as MembershipRecord;

  return {
    group,
    membership,
    isOwner: (group.ownerId ?? group.createdBy) === userId,
  };
};

const decrementMembersCount = async (groupId: string) => {
  await toGroupRef(groupId).set({ membersCount: FieldValue.increment(-1) }, { merge: true });
};

export const createCircle = onCall<{ name?: string; displayName?: string }, Promise<ReturnType<typeof toGroupPayload>>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const name = normalizeGroupName(String(request.data?.name ?? ""));
    const displayName = normalizeDisplayName(String(request.data?.displayName ?? "")) || "Responder";

    if (name.length < 3 || name.length > GROUP_NAME_MAX_LENGTH) {
      throw new HttpsError("invalid-argument", "Circle name must be between 3 and 80 characters.");
    }

    if (displayName.length > NAME_MAX_LENGTH) {
      throw new HttpsError("invalid-argument", "Display name is too long.");
    }

    const groupRef = adminDb.collection("groups").doc();
    const createdAt = nowIso();
    const inviteCode = await generateUniqueInviteCode();
    const group = {
      groupId: groupRef.id,
      name,
      createdBy: userId,
      ownerId: userId,
      createdAt,
      inviteCode,
      membersCount: 1,
      region: "PH",
    };

    const batch = adminDb.batch();
    batch.set(groupRef, group);
    batch.set(toMemberRef(groupRef.id, userId), {
      userId,
      displayName,
      role: "admin",
      joinedAt: createdAt,
    });
    await batch.commit();

    return toGroupPayload(groupRef.id, group, "admin");
  },
);

export const joinCircleByCode = onCall<{ inviteCode?: string; displayName?: string }, Promise<{ alreadyMember: boolean; group: ReturnType<typeof toGroupPayload> }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const inviteCode = sanitizeInviteCode(request.data?.inviteCode);
    const displayName = normalizeDisplayName(String(request.data?.displayName ?? "")) || "Responder";

    if (!CIRCLE_CODE_REGEX.test(inviteCode)) {
      throw new HttpsError("invalid-argument", "Enter a valid 6-digit circle code.");
    }

    if (displayName.length > NAME_MAX_LENGTH) {
      throw new HttpsError("invalid-argument", "Display name is too long.");
    }

    let groupSnapshot = await adminDb.collection("groups").where("inviteCode", "==", inviteCode).limit(1).get();

    if (groupSnapshot.empty) {
      const legacyInviteSnapshot = await adminDb.collectionGroup("invites").where("inviteCode", "==", inviteCode).limit(1).get();
      if (legacyInviteSnapshot.empty) {
        throw new HttpsError("not-found", "Circle code not found.");
      }

      const legacyInvite = legacyInviteSnapshot.docs[0].data() as { groupId?: string };
      if (!legacyInvite.groupId) {
        throw new HttpsError("not-found", "Circle code is no longer valid.");
      }

      const legacyGroupRef = toGroupRef(legacyInvite.groupId);
      const legacyGroupDoc = await legacyGroupRef.get();
      if (!legacyGroupDoc.exists) {
        throw new HttpsError("not-found", "Trusted circle not found.");
      }

      await legacyGroupRef.set({ inviteCode }, { merge: true });
      groupSnapshot = await adminDb.collection("groups").where("inviteCode", "==", inviteCode).limit(1).get();
    }

    const groupDoc = groupSnapshot.docs[0];
    const groupId = groupDoc.id;
    const group = await ensurePermanentGroupFields(groupId, groupDoc.data() as GroupRecord);
    const memberRef = toMemberRef(groupId, userId);
    const memberSnapshot = await memberRef.get();

    if (!memberSnapshot.exists) {
      const joinedAt = nowIso();
      const batch = adminDb.batch();
      batch.set(memberRef, {
        userId,
        displayName,
        role: "member",
        joinedAt,
      });
      batch.set(toGroupRef(groupId), { membersCount: FieldValue.increment(1) }, { merge: true });
      await batch.commit();

      return {
        alreadyMember: false,
        group: toGroupPayload(groupId, { ...group, membersCount: Number(group.membersCount ?? 0) + 1 }, "member"),
      };
    }

    const membership = memberSnapshot.data() as MembershipRecord;
    return {
      alreadyMember: true,
      group: toGroupPayload(groupId, group, membership.role ?? "member"),
    };
  },
);

export const updateCircleMemberRole = onCall<{ groupId?: string; nextRole?: "admin" | "member"; targetUserId?: string }, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const groupId = String(request.data?.groupId ?? "").trim();
    const targetUserId = String(request.data?.targetUserId ?? "").trim();
    const nextRole = request.data?.nextRole;

    if (!groupId || !targetUserId || (nextRole !== "admin" && nextRole !== "member")) {
      throw new HttpsError("invalid-argument", "groupId, targetUserId, and nextRole are required.");
    }

    const { group, isOwner } = await getGroupAndMember(groupId, userId);
    if (!isOwner) {
      throw new HttpsError("permission-denied", "Only the circle owner can change member permissions.");
    }

    if ((group.ownerId ?? group.createdBy) === targetUserId) {
      throw new HttpsError("failed-precondition", "Transfer ownership before changing the owner's role.");
    }

    const targetMemberRef = toMemberRef(groupId, targetUserId);
    const targetMember = await targetMemberRef.get();
    if (!targetMember.exists) {
      throw new HttpsError("not-found", "Circle member not found.");
    }

    await targetMemberRef.set({ role: nextRole }, { merge: true });
    return { success: true };
  },
);

export const transferCircleOwnership = onCall<{ groupId?: string; nextOwnerUserId?: string }, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const groupId = String(request.data?.groupId ?? "").trim();
    const nextOwnerUserId = String(request.data?.nextOwnerUserId ?? "").trim();

    if (!groupId || !nextOwnerUserId) {
      throw new HttpsError("invalid-argument", "groupId and nextOwnerUserId are required.");
    }

    const { isOwner } = await getGroupAndMember(groupId, userId);
    if (!isOwner) {
      throw new HttpsError("permission-denied", "Only the current owner can transfer circle ownership.");
    }

    if (nextOwnerUserId === userId) {
      throw new HttpsError("failed-precondition", "Choose another member before transferring ownership.");
    }

    const nextOwnerRef = toMemberRef(groupId, nextOwnerUserId);
    const nextOwnerSnapshot = await nextOwnerRef.get();
    if (!nextOwnerSnapshot.exists) {
      throw new HttpsError("not-found", "The next owner must already be a circle member.");
    }

    const batch = adminDb.batch();
    batch.set(toGroupRef(groupId), { ownerId: nextOwnerUserId }, { merge: true });
    batch.set(nextOwnerRef, { role: "admin" }, { merge: true });
    await batch.commit();

    return { success: true };
  },
);

export const removeCircleMember = onCall<{ groupId?: string; targetUserId?: string }, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const groupId = String(request.data?.groupId ?? "").trim();
    const targetUserId = String(request.data?.targetUserId ?? "").trim();

    if (!groupId || !targetUserId) {
      throw new HttpsError("invalid-argument", "groupId and targetUserId are required.");
    }

    if (targetUserId === userId) {
      throw new HttpsError("failed-precondition", "Use leave circle to remove yourself.");
    }

    const { group, isOwner, membership } = await getGroupAndMember(groupId, userId);
    const targetMemberRef = toMemberRef(groupId, targetUserId);
    const targetMemberSnapshot = await targetMemberRef.get();
    if (!targetMemberSnapshot.exists) {
      throw new HttpsError("not-found", "Circle member not found.");
    }

    const targetMembership = targetMemberSnapshot.data() as MembershipRecord;
    const targetIsOwner = (group.ownerId ?? group.createdBy) === targetUserId;
    const requesterIsAdmin = membership.role === "admin";

    if (targetIsOwner) {
      throw new HttpsError("failed-precondition", "Transfer ownership before removing the owner.");
    }

    if (!isOwner) {
      if (!requesterIsAdmin || targetMembership.role === "admin") {
        throw new HttpsError("permission-denied", "Only the owner can remove admins. Admins can remove members only.");
      }
    }

    const batch = adminDb.batch();
    batch.delete(targetMemberRef);
    batch.delete(toLocationRef(groupId, targetUserId));
    batch.set(toGroupRef(groupId), { membersCount: FieldValue.increment(-1) }, { merge: true });
    await batch.commit();

    return { success: true };
  },
);

export const leaveCircle = onCall<{ groupId?: string }, Promise<{ deletedGroup: boolean; success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const groupId = String(request.data?.groupId ?? "").trim();

    if (!groupId) {
      throw new HttpsError("invalid-argument", "groupId is required.");
    }

    const { group, isOwner } = await getGroupAndMember(groupId, userId);
    const membersCount = Number(group.membersCount ?? 1);

    if (isOwner && membersCount > 1) {
      throw new HttpsError("failed-precondition", "Transfer ownership before leaving a circle with other members.");
    }

    const batch = adminDb.batch();
    batch.delete(toMemberRef(groupId, userId));
    batch.delete(toLocationRef(groupId, userId));

    if (membersCount <= 1) {
      batch.delete(toGroupRef(groupId));
      await batch.commit();
      return { deletedGroup: true, success: true };
    }

    batch.set(toGroupRef(groupId), { membersCount: FieldValue.increment(-1) }, { merge: true });
    await batch.commit();
    return { deletedGroup: false, success: true };
  },
);

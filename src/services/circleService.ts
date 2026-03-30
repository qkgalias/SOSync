/** Purpose: Route circle creation, joins, and membership changes through authenticated Cloud Functions. */
import { httpsCallable } from "@react-native-firebase/functions";

import type { Group, GroupRole } from "@/types";
import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { hasFirebaseApp } from "@/services/firebase";
import { firebaseFunctions } from "@/services/firebase";
import { normalizeDisplayName, normalizeGroupName, sanitizeInviteCode } from "@/utils/input";

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());

const callCircleFunction = async <RequestData, ResponseData>(name: string, payload: RequestData) => {
  const callable = httpsCallable<RequestData, ResponseData>(firebaseFunctions(), name, { timeout: 12_000 });
  const result = await callable(payload);
  return result.data;
};

export const circleService = {
  async createCircle(input: { name: string; displayName?: string }) {
    const normalizedInput = {
      name: normalizeGroupName(input.name),
      displayName: input.displayName ? normalizeDisplayName(input.displayName) : undefined,
    };

    if (getClientMode() === "demo") {
      return {
        groupId: `demo-group-${Date.now()}`,
        name: normalizedInput.name,
        createdBy: "demo-user",
        ownerId: "demo-user",
        createdAt: new Date().toISOString(),
        inviteCode: "742104",
        membersCount: 1,
        memberRole: "admin" as const,
        region: "PH",
      } satisfies Group;
    }

    return callCircleFunction<typeof normalizedInput, Group>("createCircle", normalizedInput);
  },

  async joinCircleByCode(input: { inviteCode: string; displayName?: string }) {
    const normalizedInput = {
      inviteCode: sanitizeInviteCode(input.inviteCode),
      displayName: input.displayName ? normalizeDisplayName(input.displayName) : undefined,
    };

    if (getClientMode() === "demo") {
      return {
        alreadyMember: false,
        group: {
          groupId: "demo-group",
          name: "Family Response Circle",
          createdBy: "demo-user",
          ownerId: "demo-user",
          createdAt: new Date().toISOString(),
          inviteCode: normalizedInput.inviteCode,
          membersCount: 4,
          memberRole: "member" as const,
          region: "PH",
        },
      };
    }

    return callCircleFunction<typeof normalizedInput, { alreadyMember: boolean; group: Group }>(
      "joinCircleByCode",
      normalizedInput,
    );
  },

  async updateMemberRole(input: { groupId: string; targetUserId: string; nextRole: GroupRole }) {
    if (getClientMode() === "demo") {
      return { success: true };
    }

    return callCircleFunction<typeof input, { success: boolean }>("updateCircleMemberRole", input);
  },

  async transferOwnership(input: { groupId: string; nextOwnerUserId: string }) {
    if (getClientMode() === "demo") {
      return { success: true };
    }

    return callCircleFunction<typeof input, { success: boolean }>("transferCircleOwnership", input);
  },

  async removeMember(input: { groupId: string; targetUserId: string }) {
    if (getClientMode() === "demo") {
      return { success: true };
    }

    return callCircleFunction<typeof input, { success: boolean }>("removeCircleMember", input);
  },

  async leaveCircle(input: { groupId: string }) {
    if (getClientMode() === "demo") {
      return { deletedGroup: false, success: true };
    }

    return callCircleFunction<typeof input, { deletedGroup: boolean; success: boolean }>("leaveCircle", input);
  },
};

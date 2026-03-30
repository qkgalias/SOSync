/** Purpose: Keep Firestore service membership transformations deterministic and testable. */
import type { Group } from "@/types";

type MembershipEntry = {
  groupId: string | null;
  role?: Group["memberRole"];
};

type GroupSnapshotPayload = {
  id: string;
  exists: boolean;
  data?: Record<string, unknown>;
} | null;

export const resolveGroupsFromMemberships = async (
  memberships: MembershipEntry[],
  loadGroup: (groupId: string) => Promise<GroupSnapshotPayload>,
  onError: (groupId: string, error: unknown) => void = () => undefined,
) => {
  const groups = await Promise.all(
    memberships.map(async (membership) => {
      if (!membership.groupId) {
        return null;
      }

      try {
        const groupDoc = await loadGroup(membership.groupId);
        if (!groupDoc?.exists || !groupDoc.data) {
          return null;
        }

        return {
          groupId: groupDoc.id,
          ...groupDoc.data,
          memberRole: membership.role,
        } as Group;
      } catch (error) {
        onError(membership.groupId, error);
        return null;
      }
    }),
  );

  return groups.filter(Boolean) as Group[];
};

/** Purpose: Verify group membership hydration stays resilient when parent group docs fail to load. */
import { resolveGroupsFromMemberships } from "@/services/firestoreService.helpers";

describe("resolveGroupsFromMemberships", () => {
  it("skips unreadable groups and continues resolving the rest", async () => {
    const onError = jest.fn();
    const groups = await resolveGroupsFromMemberships(
      [
        { groupId: "group-1", role: "admin" },
        { groupId: "group-2", role: "member" },
        { groupId: null, role: "member" },
      ],
      async (groupId) => {
        if (groupId === "group-2") {
          throw new Error("permission-denied");
        }

        return {
          id: groupId,
          exists: true,
          data: {
            name: "Circle One",
            createdBy: "admin-1",
            ownerId: "admin-1",
            createdAt: "2026-03-23T00:00:00.000Z",
            inviteCode: "123456",
            membersCount: 1,
            region: "PH",
          },
        };
      },
      onError,
    );

    expect(groups).toEqual([
      {
        groupId: "group-1",
        name: "Circle One",
        createdBy: "admin-1",
        ownerId: "admin-1",
        createdAt: "2026-03-23T00:00:00.000Z",
        inviteCode: "123456",
        membersCount: 1,
        region: "PH",
        memberRole: "admin",
      },
    ]);
    expect(onError).toHaveBeenCalledWith("group-2", expect.any(Error));
  });
});

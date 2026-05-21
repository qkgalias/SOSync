/** Purpose: Verify custom-claim role gates for admin back-office functions. */
import { extractAdminRole, resolveAdminContext } from "../functions/src/adminAuthorization";

const contentRoles = new Set(["content_admin", "super_admin"] as const);
const supportRoles = new Set(["support_admin", "super_admin"] as const);

describe("functions admin back office authorization", () => {
  it("extracts only supported SOSync admin roles", () => {
    expect(extractAdminRole({ uid: "u1", token: { sosyncRole: "super_admin" } })).toBe("super_admin");
    expect(extractAdminRole({ uid: "u1", token: { sosyncRole: "member" } })).toBeNull();
    expect(extractAdminRole({ uid: "u1", token: {} })).toBeNull();
  });

  it("rejects unauthenticated callers", () => {
    expect(resolveAdminContext(undefined, contentRoles).code).toBe("unauthenticated");
  });

  it("rejects signed-in users without an admin claim", () => {
    expect(resolveAdminContext({ uid: "u1", token: {} }, contentRoles).code).toBe("permission-denied");
  });

  it("allows content admins to manage content but not support reports", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "content_admin" } }, contentRoles).context).toEqual({
      role: "content_admin",
      uid: "u1",
    });
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "content_admin" } }, supportRoles).code).toBe(
      "permission-denied",
    );
  });

  it("allows support admins to review support but not manage content", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "support_admin" } }, supportRoles).context).toEqual({
      role: "support_admin",
      uid: "u1",
    });
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "support_admin" } }, contentRoles).code).toBe(
      "permission-denied",
    );
  });

  it("allows super admins everywhere", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "super_admin" } }, contentRoles).context?.role).toBe(
      "super_admin",
    );
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "super_admin" } }, supportRoles).context?.role).toBe(
      "super_admin",
    );
  });
});

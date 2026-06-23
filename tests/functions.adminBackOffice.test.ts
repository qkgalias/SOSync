/** Purpose: Verify custom-claim role gates for admin back-office functions. */
import { extractAdminRole, resolveAdminContext } from "../functions/src/adminAuthorization";

const contentRoles = new Set(["admin", "operator", "superadmin"] as const);
const supportRoles = new Set(["admin", "superadmin"] as const);
const superAdminRoles = new Set(["superadmin"] as const);

describe("functions admin back office authorization", () => {
  it("extracts only supported SOSync admin roles", () => {
    expect(extractAdminRole({ uid: "u1", token: { sosyncRole: "super_admin" } })).toBe("superadmin");
    expect(extractAdminRole({ uid: "u1", token: { sosyncRole: "member" } })).toBeNull();
    expect(extractAdminRole({ uid: "u1", token: {} })).toBeNull();
  });

  it("rejects unauthenticated callers", () => {
    expect(resolveAdminContext(undefined, contentRoles).code).toBe("unauthenticated");
  });

  it("rejects signed-in users without an admin claim", () => {
    expect(resolveAdminContext({ uid: "u1", token: {} }, contentRoles).code).toBe("permission-denied");
  });

  it("allows admins to manage content", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "admin" } }, contentRoles).context).toEqual({
      role: "admin",
      uid: "u1",
    });
  });

  it("allows operators to manage content", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "operator" } }, contentRoles).context).toEqual({
      role: "operator",
      uid: "u1",
    });
  });

  it("keeps operators out of support report review", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "operator" } }, supportRoles).code).toBe(
      "permission-denied",
    );
  });

  it("allows super admins everywhere", () => {
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "superadmin" } }, contentRoles).context?.role).toBe(
      "superadmin",
    );
    expect(resolveAdminContext({ uid: "u1", token: { sosyncRole: "superadmin" } }, superAdminRoles).context?.role).toBe(
      "superadmin",
    );
  });
});

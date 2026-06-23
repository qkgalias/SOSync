/** Purpose: Keep SOSync admin custom-claim role checks testable without Functions runtime imports. */
export type AdminRole = "admin" | "operator" | "superadmin";
export type LegacyAdminRole = "content_admin" | "support_admin" | "super_admin";
export type AnyAdminRole = AdminRole | LegacyAdminRole;

export const ADMIN_ROLES = new Set<AnyAdminRole>(["admin", "operator", "superadmin", "content_admin", "support_admin", "super_admin"]);
export const CONTENT_ROLES = new Set<AnyAdminRole>(["admin", "operator", "superadmin", "content_admin", "support_admin", "super_admin"]);
export const SUPPORT_ROLES = new Set<AnyAdminRole>(["admin", "superadmin", "content_admin", "support_admin", "super_admin"]);
export const SUPERADMIN_ROLES = new Set<AnyAdminRole>(["superadmin", "super_admin"]);

export type CallableAuthLike = {
  token?: Record<string, unknown>;
  uid?: string;
};

export type AdminContext = {
  role: AdminRole;
  uid: string;
};

export const normalizeAdminRole = (role: string | null | undefined): AdminRole | null => {
  if (role === "superadmin" || role === "super_admin") {
    return "superadmin";
  }
  if (role === "admin" || role === "content_admin") {
    return "admin";
  }
  if (role === "operator" || role === "support_admin") {
    return "operator";
  }
  return null;
};

export const extractAdminRole = (auth?: CallableAuthLike): AdminRole | null => {
  const role = auth?.token?.sosyncRole;
  return typeof role === "string" ? normalizeAdminRole(role) : null;
};

export const resolveAdminContext = (auth: CallableAuthLike | undefined, allowedRoles: Set<AnyAdminRole>) => {
  if (!auth?.uid) {
    return { code: "unauthenticated" as const, context: null };
  }

  const role = extractAdminRole(auth);
  if (!role || !allowedRoles.has(role)) {
    return { code: "permission-denied" as const, context: null };
  }

  return { code: "ok" as const, context: { role, uid: auth.uid } satisfies AdminContext };
};

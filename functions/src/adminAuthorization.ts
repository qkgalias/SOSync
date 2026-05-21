/** Purpose: Keep SOSync admin custom-claim role checks testable without Functions runtime imports. */
export type AdminRole = "content_admin" | "support_admin" | "super_admin";

export const ADMIN_ROLES = new Set<AdminRole>(["content_admin", "support_admin", "super_admin"]);
export const CONTENT_ROLES = new Set<AdminRole>(["content_admin", "super_admin"]);
export const SUPPORT_ROLES = new Set<AdminRole>(["support_admin", "super_admin"]);

export type CallableAuthLike = {
  token?: Record<string, unknown>;
  uid?: string;
};

export type AdminContext = {
  role: AdminRole;
  uid: string;
};

export const extractAdminRole = (auth?: CallableAuthLike): AdminRole | null => {
  const role = auth?.token?.sosyncRole;
  return typeof role === "string" && ADMIN_ROLES.has(role as AdminRole) ? (role as AdminRole) : null;
};

export const resolveAdminContext = (auth: CallableAuthLike | undefined, allowedRoles: Set<AdminRole>) => {
  if (!auth?.uid) {
    return { code: "unauthenticated" as const, context: null };
  }

  const role = extractAdminRole(auth);
  if (!role || !allowedRoles.has(role)) {
    return { code: "permission-denied" as const, context: null };
  }

  return { code: "ok" as const, context: { role, uid: auth.uid } satisfies AdminContext };
};

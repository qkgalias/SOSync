import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import {
  defaultProjectId,
  getStringArg,
  parseArgs,
  requireStringArg,
  withScriptErrorBoundary,
} from "./_shared.mjs";

const allowedRoles = new Set(["admin", "operator", "superadmin", "content_admin", "support_admin", "super_admin"]);
const roleAliases = {
  content_admin: "admin",
  support_admin: "operator",
  super_admin: "superadmin",
};

const defaultAssignments = [
  ["galiaskarlos09@gmail.com", "superadmin"],
  ["sosyncapp@gmail.com", "admin"],
  ["techhub.adv@gmail.com", "operator"],
];

const usage = `Usage:
  npm --prefix functions run set:admin-claim -- --email=admin@example.com
  npm --prefix functions run set:admin-claim -- --uid=<firebase-uid> --role=admin
  npm --prefix functions run set:admin-claim -- --seed-sosync-admins

Roles:
  superadmin, admin, operator`;

const normalizeRole = (role) => roleAliases[role] ?? role;

const assignRole = async ({ auth, db, email, role, uid }) => {
  const normalizedRole = normalizeRole(role);
  const user = uid ? await auth.getUser(uid) : await auth.getUserByEmail(email);
  const existingClaims = user.customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, {
    ...existingClaims,
    sosyncRole: normalizedRole,
  });

  await db.collection("admin_access").doc(user.uid).set(
    {
      email: user.email ?? email,
      role: normalizedRole,
      status: "active",
      uid: user.uid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "setAdminClaim",
      ...(user.metadata.lastSignInTime ? { lastSignInAt: user.metadata.lastSignInTime } : {}),
    },
    { merge: true },
  );

  return { email: user.email ?? email, role: normalizedRole, uid: user.uid };
};

withScriptErrorBoundary(async () => {
  const args = parseArgs();
  const projectId = getStringArg(args, "projectId", defaultProjectId);
  const uidArg = getStringArg(args, "uid");
  const emailArg = getStringArg(args, "email");
  const role = getStringArg(args, "role", "superadmin");
  const shouldSeedSosyncAdmins = args["seed-sosync-admins"] === true;

  if (!allowedRoles.has(role)) {
    throw new Error(`Invalid --role=${role}.\n\n${usage}`);
  }

  if (!shouldSeedSosyncAdmins && !uidArg && !emailArg) {
    throw new Error(`Provide --uid or --email.\n\n${usage}`);
  }

  if (!getApps().length) {
    initializeApp({ projectId });
  }

  const auth = getAuth();
  const db = getFirestore();
  const assignments = shouldSeedSosyncAdmins ? defaultAssignments : [[emailArg, role]];

  for (const [assignmentEmail, assignmentRole] of assignments) {
    const result = await assignRole({
      auth,
      db,
      email: assignmentEmail,
      role: assignmentRole,
      uid: shouldSeedSosyncAdmins ? undefined : uidArg ? requireStringArg(args, "uid") : undefined,
    });
    console.log(`Assigned sosyncRole=${result.role} to ${result.email ?? result.uid} (${result.uid}) in ${projectId}.`);
  }

  console.log("The admin must sign out and sign back in before the new claim appears in their ID token.");
});

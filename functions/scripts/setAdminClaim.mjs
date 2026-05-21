import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import {
  defaultProjectId,
  getStringArg,
  parseArgs,
  requireStringArg,
  withScriptErrorBoundary,
} from "./_shared.mjs";

const allowedRoles = new Set(["content_admin", "support_admin", "super_admin"]);

const usage = `Usage:
  npm --prefix functions run set:admin-claim -- --email=admin@example.com
  npm --prefix functions run set:admin-claim -- --uid=<firebase-uid> --role=content_admin

Roles:
  super_admin, content_admin, support_admin`;

withScriptErrorBoundary(async () => {
  const args = parseArgs();
  const projectId = getStringArg(args, "projectId", defaultProjectId);
  const uidArg = getStringArg(args, "uid");
  const emailArg = getStringArg(args, "email");
  const role = getStringArg(args, "role", "super_admin");

  if (!allowedRoles.has(role)) {
    throw new Error(`Invalid --role=${role}.\n\n${usage}`);
  }

  if (!uidArg && !emailArg) {
    throw new Error(`Provide --uid or --email.\n\n${usage}`);
  }

  if (!getApps().length) {
    initializeApp({ projectId });
  }

  const auth = getAuth();
  const user = uidArg ? await auth.getUser(requireStringArg(args, "uid")) : await auth.getUserByEmail(emailArg);
  const existingClaims = user.customClaims ?? {};
  await auth.setCustomUserClaims(user.uid, {
    ...existingClaims,
    sosyncRole: role,
  });

  console.log(`Assigned sosyncRole=${role} to ${user.email ?? user.uid} (${user.uid}) in ${projectId}.`);
  console.log("The admin must sign out and sign back in before the new claim appears in their ID token.");
});

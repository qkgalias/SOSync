import { defaultProjectId, getFirestoreForLiveProject, getStringArg, parseArgs, withScriptErrorBoundary } from "./_shared.mjs";

const CIRCLE_CODE_REGEX = /^\d{6}$/;

const sanitizeInviteCode = (value) => String(value ?? "").replace(/\D/g, "").slice(0, 6);

const generateRandomInviteCode = () => `${Math.floor(Math.random() * 900000 + 100000)}`;

const resolveOwnerFromMembers = async (db, groupId) => {
  const membersSnapshot = await db.collection("groups").doc(groupId).collection("members").get();
  const adminMember = membersSnapshot.docs.find((memberDoc) => memberDoc.data().role === "admin");

  return adminMember?.id ?? membersSnapshot.docs[0]?.id ?? null;
};

const resolveLegacyInviteCode = async (db, groupId, inviteCodeOwners) => {
  const invitesSnapshot = await db
    .collection("groups")
    .doc(groupId)
    .collection("invites")
    .orderBy("createdAt", "desc")
    .get()
    .catch(() => null);

  if (!invitesSnapshot) {
    return null;
  }

  for (const inviteDoc of invitesSnapshot.docs) {
    const inviteCode = sanitizeInviteCode(inviteDoc.data().inviteCode);
    const existingOwner = inviteCodeOwners.get(inviteCode);

    if (CIRCLE_CODE_REGEX.test(inviteCode) && (!existingOwner || existingOwner === groupId)) {
      return inviteCode;
    }
  }

  return null;
};

const generateUniqueInviteCode = async (inviteCodeOwners) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const inviteCode = generateRandomInviteCode();
    if (!inviteCodeOwners.has(inviteCode)) {
      return inviteCode;
    }
  }

  throw new Error("Unable to generate a unique permanent invite code.");
};

const run = async () => {
  const args = parseArgs();
  const projectId = getStringArg(args, "projectId", defaultProjectId);
  const dryRun = args["dry-run"] === true;
  const db = getFirestoreForLiveProject(projectId);

  const groupsSnapshot = await db.collection("groups").get();
  const inviteCodeOwners = new Map();

  for (const groupDoc of groupsSnapshot.docs) {
    const inviteCode = sanitizeInviteCode(groupDoc.data().inviteCode);
    if (CIRCLE_CODE_REGEX.test(inviteCode)) {
      inviteCodeOwners.set(inviteCode, groupDoc.id);
    }
  }

  let updatedGroups = 0;
  let backfilledOwners = 0;
  let backfilledCodes = 0;

  for (const groupDoc of groupsSnapshot.docs) {
    const groupId = groupDoc.id;
    const group = groupDoc.data();
    const updates = {};

    const currentOwnerId =
      typeof group.ownerId === "string" && group.ownerId.trim()
        ? group.ownerId.trim()
        : typeof group.createdBy === "string" && group.createdBy.trim()
          ? group.createdBy.trim()
          : await resolveOwnerFromMembers(db, groupId);

    if (currentOwnerId && currentOwnerId !== group.ownerId) {
      updates.ownerId = currentOwnerId;
      backfilledOwners += 1;
    }

    const currentInviteCode = sanitizeInviteCode(group.inviteCode);
    if (!CIRCLE_CODE_REGEX.test(currentInviteCode)) {
      const legacyInviteCode = await resolveLegacyInviteCode(db, groupId, inviteCodeOwners);
      const inviteCode = legacyInviteCode ?? (await generateUniqueInviteCode(inviteCodeOwners));

      updates.inviteCode = inviteCode;
      inviteCodeOwners.set(inviteCode, groupId);
      backfilledCodes += 1;
    }

    if (!Object.keys(updates).length) {
      continue;
    }

    updatedGroups += 1;
    if (dryRun) {
      console.log(`[dry-run] groups/${groupId}`, updates);
      continue;
    }

    await groupDoc.ref.set(updates, { merge: true });
    console.log(`Updated groups/${groupId}`, updates);
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        groupsScanned: groupsSnapshot.size,
        updatedGroups,
        backfilledOwners,
        backfilledCodes,
      },
      null,
      2,
    ),
  );
};

await withScriptErrorBoundary(run);

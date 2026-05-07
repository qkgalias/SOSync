import { defaultProjectId, getFirestoreForLiveProject, getStringArg, parseArgs, withScriptErrorBoundary } from "./_shared.mjs";

const CIRCLE_CODE_REGEX = /^\d{6}$/;

const run = async () => {
  const args = parseArgs();
  const projectId = getStringArg(args, "projectId", defaultProjectId);
  const db = getFirestoreForLiveProject(projectId);
  const groupsSnapshot = await db.collection("groups").get();

  const issues = [];
  let validGroups = 0;

  for (const groupDoc of groupsSnapshot.docs) {
    const group = groupDoc.data();
    const groupId = groupDoc.id;
    const membersSnapshot = await groupDoc.ref.collection("members").get();
    const ownerId = typeof group.ownerId === "string" && group.ownerId.trim() ? group.ownerId.trim() : "";
    const inviteCode = String(group.inviteCode ?? "").trim();
    const ownerMember = ownerId ? membersSnapshot.docs.find((memberDoc) => memberDoc.id === ownerId) : null;
    const ownerRole = ownerMember?.data().role;

    const groupIssues = [];
    if (!ownerId) {
      groupIssues.push("missing ownerId");
    }

    if (!CIRCLE_CODE_REGEX.test(inviteCode)) {
      groupIssues.push("missing permanent 6-digit inviteCode");
    }

    if (!membersSnapshot.size) {
      groupIssues.push("has no member documents");
    }

    if (ownerId && !ownerMember) {
      groupIssues.push("ownerId does not have a matching member document");
    }

    if (ownerMember && ownerRole !== "admin") {
      groupIssues.push("owner member is not admin");
    }

    for (const memberDoc of membersSnapshot.docs) {
      const member = memberDoc.data();
      if (member.userId && member.userId !== memberDoc.id) {
        groupIssues.push(`member ${memberDoc.id} has mismatched userId`);
      }

      if (member.role !== "admin" && member.role !== "member") {
        groupIssues.push(`member ${memberDoc.id} has invalid role`);
      }
    }

    if (groupIssues.length) {
      issues.push({ groupId, issues: groupIssues });
    } else {
      validGroups += 1;
    }
  }

  console.log(JSON.stringify(
    {
      groupsScanned: groupsSnapshot.size,
      validGroups,
      groupsWithIssues: issues.length,
      issues,
    },
    null,
    2,
  ));

  if (issues.length) {
    process.exitCode = 1;
  }
};

await withScriptErrorBoundary(run);

/** Purpose: Resolve invite codes into group membership updates with admin-safe checks. */
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";

import { adminDb } from "./admin.js";
import { functionsRegion, googleDirectionsApiKey } from "./config.js";
import { nowIso } from "./helpers.js";

export const resolveInvite = onRequest({ region: functionsRegion, secrets: [googleDirectionsApiKey] }, async (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");

  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  const { displayName, groupId, inviteCode, userId } = request.body as {
    displayName?: string;
    groupId?: string;
    inviteCode?: string;
    userId?: string;
  };

  if (!groupId || !inviteCode || !userId) {
    response.status(400).json({ error: "groupId, inviteCode, and userId are required." });
    return;
  }

  const inviteSnapshot = await adminDb
    .collection("groups")
    .doc(groupId)
    .collection("invites")
    .where("inviteCode", "==", inviteCode)
    .where("status", "==", "pending")
    .limit(1)
    .get();

  if (inviteSnapshot.empty) {
    response.status(404).json({ error: "Invite not found or already claimed." });
    return;
  }

  const inviteDoc = inviteSnapshot.docs[0];
  const invite = inviteDoc.data() as { expiresAt: string };
  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    response.status(410).json({ error: "Invite has expired." });
    return;
  }

  const batch = adminDb.batch();
  const groupRef = adminDb.collection("groups").doc(groupId);
  batch.set(groupRef.collection("members").doc(userId), {
    userId,
    displayName: displayName ?? "Responder",
    role: "member",
    joinedAt: nowIso(),
  });
  batch.update(groupRef, { membersCount: FieldValue.increment(1) });
  batch.update(inviteDoc.ref, { status: "accepted" });
  await batch.commit();

  response.json({ success: true });
});

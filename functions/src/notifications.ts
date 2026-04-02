/** Purpose: Fan out group-scoped push notifications for disaster alerts and SOS events. */
import { onDocumentCreated } from "firebase-functions/v2/firestore";

import { adminDb, adminMessaging } from "./admin.js";
import { functionsRegion } from "./config.js";

type StoredPushToken = {
  platform?: "android" | "ios";
  token?: string;
  tokenId: string;
  userId: string;
  ref: FirebaseFirestore.DocumentReference;
};

const staleTokenErrorCodes = new Set(["messaging/invalid-registration-token", "messaging/registration-token-not-registered"]);

const usersAreBlocked = async (leftUserId: string, rightUserId: string) => {
  const [leftBlocksRight, rightBlocksLeft] = await Promise.all([
    adminDb.collection("users").doc(leftUserId).collection("blockedUsers").doc(rightUserId).get(),
    adminDb.collection("users").doc(rightUserId).collection("blockedUsers").doc(leftUserId).get(),
  ]);

  return leftBlocksRight.exists || rightBlocksLeft.exists;
};

const getGroupTokens = async (groupId: string, excludeUserId?: string, actorUserId?: string) => {
  const members = await adminDb.collection("groups").doc(groupId).collection("members").get();
  const tokenGroups = await Promise.all(
    members.docs
      .filter((member) => member.id !== excludeUserId)
      .map(async (member) => {
        if (actorUserId && member.id !== actorUserId && await usersAreBlocked(actorUserId, member.id)) {
          return [];
        }

        const snapshot = await adminDb.collection("users").doc(member.id).collection("pushTokens").get();
        return snapshot.docs.map((doc) => ({
          ref: doc.ref,
          tokenId: doc.id,
          userId: member.id,
          ...(doc.data() as Omit<StoredPushToken, "ref" | "tokenId" | "userId">),
        }));
      }),
  );

  return tokenGroups.flat().filter((entry): entry is StoredPushToken => Boolean(entry.token));
};

const sendGroupNotification = async (
  groupId: string,
  payload: { title: string; body: string; data: Record<string, string> },
  excludeUserId?: string,
  actorUserId?: string,
) => {
  const tokens = await getGroupTokens(groupId, excludeUserId, actorUserId);
  const androidTokens = tokens.filter((entry) => entry.platform === "android");
  const deferredIosCount = tokens.length - androidTokens.length;

  if (deferredIosCount) {
    console.info("Skipping iOS remote notification delivery until APNs is configured.", {
      deferredIosCount,
      groupId,
      type: payload.data.type,
    });
  }

  if (!androidTokens.length) {
    return;
  }

  const response = await adminMessaging.sendEachForMulticast({
    tokens: androidTokens.map((entry) => entry.token as string),
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    android: {
      priority: "high",
      notification: {
        channelId: "sosync-alerts",
      },
    },
  });

  const staleTokens = response.responses.flatMap((result, index) => {
    const tokenEntry = androidTokens[index];
    if (result.success || !tokenEntry || !staleTokenErrorCodes.has(result.error?.code ?? "")) {
      return [];
    }

    return [tokenEntry];
  });

  if (staleTokens.length) {
    await Promise.all(staleTokens.map((entry) => entry.ref.delete().catch(() => undefined)));
  }

  const failedCount = response.responses.filter((result) => !result.success).length;
  if (failedCount) {
    console.warn("Push delivery completed with partial failures.", {
      failedCount,
      groupId,
      type: payload.data.type,
    });
  }
};

export const fanOutSosEvent = onDocumentCreated(
  { document: "sos_events/{eventId}", region: functionsRegion },
  async (event) => {
    const data = event.data?.data() as { createdAt: string; groupId: string; message: string; senderId: string } | undefined;
    if (!data) {
      return;
    }

    await sendGroupNotification(
      data.groupId,
      {
        title: "Trusted circle SOS",
        body: data.message,
        data: {
          createdAt: data.createdAt,
          eventId: event.params.eventId,
          groupId: data.groupId,
          senderId: data.senderId,
          targetRoute: "/notifications",
          type: "sos_alert",
        },
      },
      data.senderId,
      data.senderId,
    );
  },
);

export const fanOutDisasterAlert = onDocumentCreated(
  { document: "alerts/{alertId}", region: functionsRegion },
  async (event) => {
    const data = event.data?.data() as { createdAt: string; groupId: string; message: string; title: string } | undefined;
    if (!data) {
      return;
    }

    await sendGroupNotification(data.groupId, {
      title: data.title,
      body: data.message,
      data: {
        alertId: event.params.alertId,
        createdAt: data.createdAt,
        groupId: data.groupId,
        targetRoute: `/alerts/${event.params.alertId}`,
        type: "disaster_alert",
      },
    });
  },
);

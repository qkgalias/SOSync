/** Purpose: Encapsulate SOSync Firestore reads and writes with local fallback seed data. */
import firestore from "@react-native-firebase/firestore";

import type {
  DisasterAlert,
  EvacuationCenter,
  Group,
  GroupInvite,
  GroupLocation,
  PushToken,
  SosEvent,
  UserProfile,
} from "@/types";
import { hasFirebaseApp } from "@/services/firebase";
import { ALERT_SEED, EVACUATION_CENTER_SEED, GROUP_SEED, PHILIPPINE_HOTLINE_SEED, USER_SEED } from "@/utils/constants";
import { toLocationId } from "@/utils/helpers";

type Hotline = (typeof PHILIPPINE_HOTLINE_SEED)[number];

const db = () => firestore();
const isoNow = () => new Date().toISOString();

const withFallback = <T>(value: T, callback: (payload: T) => void) => {
  callback(value);
  return () => undefined;
};

export const firestoreService = {
  listenToProfile(userId: string, callback: (profile: UserProfile | null) => void) {
    if (!hasFirebaseApp()) {
      return withFallback({ ...USER_SEED, userId }, callback);
    }

    return db()
      .collection("users")
      .doc(userId)
      .onSnapshot((snapshot) => {
        callback(snapshot.exists() ? ({ userId: snapshot.id, ...snapshot.data() } as UserProfile) : null);
      });
  },

  async saveProfile(profile: UserProfile) {
    if (!hasFirebaseApp()) {
      return profile;
    }

    await db().collection("users").doc(profile.userId).set(profile, { merge: true });
    return profile;
  },

  listenToGroups(userId: string, callback: (groups: Group[]) => void) {
    if (!hasFirebaseApp()) {
      return withFallback(GROUP_SEED, callback);
    }

    return db()
      .collectionGroup("members")
      .where("userId", "==", userId)
      .onSnapshot(async (snapshot) => {
        const groups = await Promise.all(
          snapshot.docs.map(async (doc) => {
            const groupDoc = await doc.ref.parent.parent?.get();
            return groupDoc?.exists()
              ? ({
                  groupId: groupDoc.id,
                  ...groupDoc.data(),
                  memberRole: doc.data().role,
                } as Group)
              : null;
          }),
        );
        callback(groups.filter(Boolean) as Group[]);
      });
  },

  async createGroup(userId: string, name: string) {
    const group: Group = {
      groupId: db().collection("groups").doc().id,
      name,
      createdBy: userId,
      createdAt: isoNow(),
      groupCode: `SOS-${Math.floor(Math.random() * 9000 + 1000)}`,
      membersCount: 1,
      memberRole: "admin",
      region: "PH",
    };

    if (!hasFirebaseApp()) {
      return group;
    }

    const batch = db().batch();
    const groupRef = db().collection("groups").doc(group.groupId);
    batch.set(groupRef, group);
    batch.set(groupRef.collection("members").doc(userId), {
      userId,
      role: "admin",
      joinedAt: isoNow(),
      displayName: "Responder",
    });
    await batch.commit();
    return group;
  },

  async createInvite(groupId: string, createdBy: string, contact: string, channel: GroupInvite["channel"]) {
    const invite: GroupInvite = {
      inviteId: db().collection("groups").doc(groupId).collection("invites").doc().id,
      groupId,
      createdBy,
      inviteCode: `INV-${Math.floor(Math.random() * 900000 + 100000)}`,
      channel,
      contact,
      status: "pending",
      createdAt: isoNow(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    };

    if (!hasFirebaseApp()) {
      return invite;
    }

    await db().collection("groups").doc(groupId).collection("invites").doc(invite.inviteId).set(invite);
    return invite;
  },

  listenToAlerts(groupId: string, callback: (alerts: DisasterAlert[]) => void) {
    if (!hasFirebaseApp()) {
      return withFallback(ALERT_SEED.filter((alert) => alert.groupId === groupId), callback);
    }

    return db()
      .collection("alerts")
      .where("groupId", "==", groupId)
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        callback(snapshot.docs.map((doc) => ({ alertId: doc.id, ...doc.data() }) as DisasterAlert));
      });
  },

  listenToLocations(groupId: string, callback: (locations: GroupLocation[]) => void) {
    if (!hasFirebaseApp()) {
      return withFallback([], callback);
    }

    return db()
      .collection("locations")
      .where("groupId", "==", groupId)
      .orderBy("updatedAt", "desc")
      .onSnapshot((snapshot) => {
        callback(snapshot.docs.map((doc) => ({ locationId: doc.id, ...doc.data() }) as GroupLocation));
      });
  },

  async upsertLocation(location: Omit<GroupLocation, "locationId" | "updatedAt">) {
    const payload: GroupLocation = {
      ...location,
      locationId: toLocationId(location.groupId, location.userId),
      updatedAt: isoNow(),
    };

    if (!hasFirebaseApp()) {
      return payload;
    }

    await db().collection("locations").doc(payload.locationId).set(payload, { merge: true });
    return payload;
  },

  async listEvacuationCenters(region: string) {
    if (!hasFirebaseApp()) {
      return EVACUATION_CENTER_SEED.filter((center) => center.region === region);
    }

    const snapshot = await db().collection("evacuation_centers").where("region", "==", region).get();
    return snapshot.docs.map((doc) => ({ centerId: doc.id, ...doc.data() }) as EvacuationCenter);
  },

  listenToHotlines(region: string, callback: (hotlines: Hotline[]) => void) {
    if (!hasFirebaseApp()) {
      return withFallback(PHILIPPINE_HOTLINE_SEED.filter((hotline) => hotline.region === region), callback);
    }

    return db()
      .collection("emergency_hotlines")
      .where("region", "==", region)
      .orderBy("name", "asc")
      .onSnapshot((snapshot) => {
        callback(snapshot.docs.map((doc) => ({ hotlineId: doc.id, ...doc.data() }) as Hotline));
      });
  },

  async createSosEvent(event: Omit<SosEvent, "eventId" | "createdAt" | "status">) {
    const sosEvent: SosEvent = {
      ...event,
      eventId: db().collection("sos_events").doc().id,
      createdAt: isoNow(),
      status: "active",
    };

    if (!hasFirebaseApp()) {
      return sosEvent;
    }

    await db().collection("sos_events").doc(sosEvent.eventId).set(sosEvent);
    return sosEvent;
  },

  listenToSosEvents(groupId: string, callback: (events: SosEvent[]) => void) {
    if (!hasFirebaseApp()) {
      return withFallback([], callback);
    }

    return db()
      .collection("sos_events")
      .where("groupId", "==", groupId)
      .orderBy("createdAt", "desc")
      .onSnapshot((snapshot) => {
        callback(snapshot.docs.map((doc) => ({ eventId: doc.id, ...doc.data() }) as SosEvent));
      });
  },

  async savePushToken(userId: string, token: PushToken) {
    if (!hasFirebaseApp()) {
      return token;
    }

    await db().collection("users").doc(userId).collection("pushTokens").doc(token.tokenId).set(token, { merge: true });
    return token;
  },

  async removePushToken(userId: string, tokenId: string) {
    if (!hasFirebaseApp()) {
      return;
    }

    await db().collection("users").doc(userId).collection("pushTokens").doc(tokenId).delete();
  },
};

/** Purpose: Encapsulate SOSync Firestore reads and writes with explicit demo fallback only. */
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from "@react-native-firebase/firestore";

import type {
  BlockedUser,
  DisasterAlert,
  EmergencyHotline,
  EvacuationCenter,
  Group,
  GroupMember,
  GroupPreferences,
  GroupLocation,
  NotificationReadReceipt,
  PushToken,
  SosEvent,
  UserProfile,
} from "@/types";
import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { firebaseAuth, hasFirebaseApp } from "@/services/firebase";
import { resolveGroupsFromMemberships } from "@/services/firestoreService.helpers";
import { ALERT_SEED, EVACUATION_CENTER_SEED, GROUP_SEED, PHILIPPINE_HOTLINE_SEED, USER_SEED } from "@/utils/constants";
import { sanitizeForFirestore } from "@/utils/firestore";
import { toLocationId } from "@/utils/helpers";

type Hotline = EmergencyHotline;

const db = () => getFirestore();
const isoNow = () => new Date().toISOString();
const FIRESTORE_OPERATION_TIMEOUT_MS = 12_000;
const FIRESTORE_TIMEOUT_MESSAGE =
  "Firestore did not respond in time. Confirm this Firebase project has a default Cloud Firestore database and that the app has network access.";
const FIRESTORE_AUTH_RETRY_DELAY_MS = 300;

const withFallback = <T>(value: T, callback: (payload: T) => void) => {
  callback(value);
  return () => undefined;
};

const emptyGroupPreferences = (groupId: string): GroupPreferences => ({
  groupId,
  primaryContactIds: [],
});

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());

const withFirestoreTimeout = async <T>(operation: Promise<T>) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      operation,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(FIRESTORE_TIMEOUT_MESSAGE)), FIRESTORE_OPERATION_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const extractFirestoreCode = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return "";
  }

  const candidate = "code" in error ? error.code : "";
  return typeof candidate === "string" ? candidate : "";
};

const waitForFirestoreAuthRetry = async () => {
  const currentUser = firebaseAuth().currentUser;
  if (!currentUser) {
    return false;
  }

  await currentUser.getIdToken(true);
  await new Promise((resolve) => setTimeout(resolve, FIRESTORE_AUTH_RETRY_DELAY_MS));
  return true;
};

export const firestoreService = {
  listenToProfile(userId: string, callback: (profile: UserProfile | null) => void) {
    if (getClientMode() === "demo") {
      return withFallback({ ...USER_SEED, userId }, callback);
    }

    return onSnapshot(
      doc(db(), "users", userId),
      (snapshot) => {
        if (!snapshot) {
          callback(null);
          return;
        }

        callback(snapshot.exists() ? ({ userId: snapshot.id, ...snapshot.data() } as UserProfile) : null);
      },
      (error) => {
        console.warn("listenToProfile failed.", error);
        callback(null);
      },
    );
  },

  async saveProfile(profile: UserProfile) {
    if (getClientMode() === "demo") {
      return profile;
    }

    const profileWrite = () =>
      withFirestoreTimeout(setDoc(doc(db(), "users", profile.userId), sanitizeForFirestore(profile), { merge: true }));

    try {
      await profileWrite();
    } catch (error) {
      if (extractFirestoreCode(error) !== "firestore/permission-denied" || !(await waitForFirestoreAuthRetry())) {
        throw error;
      }

      await profileWrite();
    }

    return profile;
  },

  async syncGroupMemberProfile(userId: string, groups: Group[], profile: UserProfile) {
    if (getClientMode() === "demo") {
      return;
    }

    await Promise.all(
      groups.map((group) =>
        withFirestoreTimeout(
          setDoc(
            doc(db(), "groups", group.groupId, "members", userId),
            sanitizeForFirestore({
              userId,
              groupId: group.groupId,
              displayName: profile.name,
              email: profile.email ?? null,
              phoneNumber: profile.phoneNumber ?? null,
              photoURL: profile.photoURL ?? null,
            }),
            { merge: true },
          ),
        ),
      ),
    );
  },

  listenToGroups(userId: string, callback: (groups: Group[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback(GROUP_SEED, callback);
    }

    const handleMembershipSnapshot = async (snapshot: any) => {
        if (!snapshot) {
          callback([]);
          return;
        }

        const groups = await resolveGroupsFromMemberships(
          snapshot.docs.map((memberDoc: any) => ({
            groupId: memberDoc.ref.parent.parent?.id ?? null,
            role: memberDoc.data().role,
          })),
          async (groupId) => {
            const groupDoc = await getDoc(doc(db(), "groups", groupId));
            return groupDoc
              ? {
                  id: groupDoc.id,
                  exists: groupDoc.exists(),
                  data: groupDoc.data() as Record<string, unknown> | undefined,
                }
              : null;
          },
          (groupId, error) => {
            console.warn(`listenToGroups skipped unreadable group ${groupId}.`, error);
          },
        );

        callback(groups.filter(Boolean) as Group[]);
    };

    return onSnapshot(query(collectionGroup(db(), "members"), where("userId", "==", userId)), (snapshot) => {
        void handleMembershipSnapshot(snapshot).catch((error) => {
          console.warn("listenToGroups snapshot handling failed.", error);
          callback([]);
        });
    }, (error) => {
        console.warn("listenToGroups failed.", error);
        callback([]);
    });
  },

  async createGroup(userId: string, name: string) {
    if (getClientMode() === "demo") {
      return {
        groupId: `demo-group-${Date.now()}`,
        name,
        createdBy: userId,
        ownerId: userId,
        createdAt: isoNow(),
        inviteCode: `${Math.floor(Math.random() * 900000 + 100000)}`,
        membersCount: 1,
        memberRole: "admin",
        region: "PH",
      } satisfies Group;
    }

    const groupRef = doc(collection(db(), "groups"));
    const group: Group = {
      groupId: groupRef.id,
      name,
      createdBy: userId,
      ownerId: userId,
      createdAt: isoNow(),
      inviteCode: `${Math.floor(Math.random() * 900000 + 100000)}`,
      membersCount: 1,
      memberRole: "admin",
      region: "PH",
    };

    const batch = writeBatch(db());
    batch.set(groupRef, sanitizeForFirestore(group));
    batch.set(
      doc(collection(groupRef, "members"), userId),
      sanitizeForFirestore({
        userId,
        role: "admin",
        joinedAt: isoNow(),
        displayName: "Responder",
      }),
    );
    await withFirestoreTimeout(batch.commit());
    return group;
  },

  listenToAlerts(groupId: string, callback: (alerts: DisasterAlert[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback(ALERT_SEED.filter((alert) => alert.groupId === groupId), callback);
    }

    return onSnapshot(
      query(collection(db(), "alerts"), where("groupId", "==", groupId), orderBy("createdAt", "desc")),
      (snapshot) => {
        callback(snapshot ? snapshot.docs.map((doc: any) => ({ alertId: doc.id, ...doc.data() }) as DisasterAlert) : []);
      },
      (error) => {
        console.warn("listenToAlerts failed.", error);
        callback([]);
      },
    );
  },

  listenToLocations(groupId: string, callback: (locations: GroupLocation[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback([], callback);
    }

    return onSnapshot(
      query(collection(db(), "locations"), where("groupId", "==", groupId), orderBy("updatedAt", "desc")),
      (snapshot) => {
        callback(snapshot ? snapshot.docs.map((doc: any) => ({ locationId: doc.id, ...doc.data() }) as GroupLocation) : []);
      },
      (error) => {
        console.warn("listenToLocations failed.", error);
        callback([]);
      },
    );
  },

  async upsertLocation(location: Omit<GroupLocation, "locationId" | "updatedAt">) {
    const payload: GroupLocation = {
      ...location,
      locationId: toLocationId(location.groupId, location.userId),
      updatedAt: isoNow(),
    };

    if (getClientMode() === "demo") {
      return payload;
    }

    await withFirestoreTimeout(
      setDoc(doc(db(), "locations", payload.locationId), sanitizeForFirestore(payload), { merge: true }),
    );
    return payload;
  },

  async listEvacuationCenters(region: string) {
    if (getClientMode() === "demo") {
      return EVACUATION_CENTER_SEED.filter((center) => center.region === region);
    }

    const snapshot = await withFirestoreTimeout(
      getDocs(query(collection(db(), "evacuation_centers"), where("region", "==", region))),
    );
    return snapshot.docs.map((doc: any) => ({ centerId: doc.id, ...doc.data() }) as EvacuationCenter);
  },

  listenToHotlines(region: string, callback: (hotlines: Hotline[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback(PHILIPPINE_HOTLINE_SEED.filter((hotline) => hotline.region === region), callback);
    }

    return onSnapshot(
      query(collection(db(), "emergency_hotlines"), where("region", "==", region), orderBy("name", "asc")),
      (snapshot) => {
        callback(snapshot ? snapshot.docs.map((doc: any) => ({ hotlineId: doc.id, ...doc.data() }) as Hotline) : []);
      },
      (error) => {
        console.warn("listenToHotlines failed.", error);
        callback([]);
      },
    );
  },

  async createSosEvent(event: Omit<SosEvent, "eventId" | "createdAt" | "status">) {
    if (getClientMode() === "demo") {
      return {
        ...event,
        eventId: `demo-sos-${Date.now()}`,
        createdAt: isoNow(),
        status: "active",
      } satisfies SosEvent;
    }

    const eventRef = doc(collection(db(), "sos_events"));
    const sosEvent: SosEvent = {
      ...event,
      eventId: eventRef.id,
      createdAt: isoNow(),
      status: "active",
    };

    await withFirestoreTimeout(setDoc(eventRef, sanitizeForFirestore(sosEvent)));
    return sosEvent;
  },

  listenToSosEvents(groupId: string, callback: (events: SosEvent[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback([], callback);
    }

    return onSnapshot(
      query(collection(db(), "sos_events"), where("groupId", "==", groupId), orderBy("createdAt", "desc")),
      (snapshot) => {
        callback(snapshot ? snapshot.docs.map((doc: any) => ({ eventId: doc.id, ...doc.data() }) as SosEvent) : []);
      },
      (error) => {
        console.warn("listenToSosEvents failed.", error);
        callback([]);
      },
    );
  },

  async savePushToken(userId: string, token: PushToken) {
    if (getClientMode() === "demo") {
      return token;
    }

    await withFirestoreTimeout(
      setDoc(
        doc(db(), "users", userId, "pushTokens", token.tokenId),
        sanitizeForFirestore(token),
        { merge: true },
      ),
    );
    return token;
  },

  async removePushToken(userId: string, tokenId: string) {
    if (getClientMode() === "demo") {
      return;
    }

    await withFirestoreTimeout(deleteDoc(doc(db(), "users", userId, "pushTokens", tokenId)));
  },

  listenToGroupMembers(groupId: string, callback: (members: GroupMember[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback(
        [
          {
            userId: USER_SEED.userId,
            groupId,
            displayName: USER_SEED.name,
            role: "admin",
            joinedAt: USER_SEED.createdAt,
            phoneNumber: USER_SEED.phoneNumber,
            email: USER_SEED.email,
            photoURL: USER_SEED.photoURL,
          },
        ],
        callback,
      );
    }

    return onSnapshot(
      query(collection(db(), "groups", groupId, "members"), orderBy("displayName", "asc")),
      (snapshot) => {
        callback(snapshot ? snapshot.docs.map((member: any) => ({ ...(member.data() as GroupMember), groupId })) : []);
      },
      (error) => {
        console.warn("listenToGroupMembers failed.", error);
        callback([]);
      },
    );
  },

  listenToGroupPreferences(userId: string, groupId: string, callback: (preferences: GroupPreferences) => void) {
    if (getClientMode() === "demo") {
      return withFallback(emptyGroupPreferences(groupId), callback);
    }

    return onSnapshot(
      doc(db(), "users", userId, "groupPreferences", groupId),
      (snapshot) => {
        callback(
          snapshot?.exists()
            ? ({ ...(snapshot.data() as Omit<GroupPreferences, "groupId">), groupId })
            : emptyGroupPreferences(groupId),
        );
      },
      (error) => {
        console.warn("listenToGroupPreferences failed.", error);
        callback(emptyGroupPreferences(groupId));
      },
    );
  },

  async saveGroupPreferences(userId: string, preferences: GroupPreferences) {
    if (getClientMode() === "demo") {
      return preferences;
    }

    await withFirestoreTimeout(
      setDoc(
        doc(db(), "users", userId, "groupPreferences", preferences.groupId),
        sanitizeForFirestore(preferences),
        { merge: true },
      ),
    );
    return preferences;
  },

  listenToBlockedUsers(userId: string, callback: (entries: BlockedUser[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback([], callback);
    }

    return onSnapshot(
      query(collection(db(), "users", userId, "blockedUsers"), orderBy("createdAt", "desc")),
      (snapshot) => {
        callback(
          snapshot
            ? snapshot.docs.map((entry: any) => ({
                ...(entry.data() as Omit<BlockedUser, "blockedUserId">),
                blockedUserId: entry.id,
              }))
            : [],
        );
      },
      (error) => {
        console.warn("listenToBlockedUsers failed.", error);
        callback([]);
      },
    );
  },

  async blockUser(userId: string, blockedUserId: string) {
    const entry: BlockedUser = {
      blockedUserId,
      createdAt: isoNow(),
    };

    if (getClientMode() === "demo") {
      return entry;
    }

    await withFirestoreTimeout(
      setDoc(doc(db(), "users", userId, "blockedUsers", blockedUserId), sanitizeForFirestore(entry), { merge: true }),
    );
    return entry;
  },

  async unblockUser(userId: string, blockedUserId: string) {
    if (getClientMode() === "demo") {
      return;
    }

    await withFirestoreTimeout(deleteDoc(doc(db(), "users", userId, "blockedUsers", blockedUserId)));
  },

  listenToNotificationReads(userId: string, callback: (entries: NotificationReadReceipt[]) => void) {
    if (getClientMode() === "demo") {
      return withFallback([], callback);
    }

    return onSnapshot(
      query(collection(db(), "users", userId, "notificationReads"), orderBy("readAt", "desc")),
      (snapshot) => {
        callback(
          snapshot
            ? snapshot.docs.map((entry: any) => ({
                ...(entry.data() as Omit<NotificationReadReceipt, "feedItemId">),
                feedItemId: entry.id,
              }))
            : [],
        );
      },
      (error) => {
        console.warn("listenToNotificationReads failed.", error);
        callback([]);
      },
    );
  },

  async markNotificationRead(userId: string, feedItemId: string) {
    const entry: NotificationReadReceipt = {
      feedItemId,
      readAt: isoNow(),
    };

    if (getClientMode() === "demo") {
      return entry;
    }

    await withFirestoreTimeout(
      setDoc(
        doc(db(), "users", userId, "notificationReads", feedItemId),
        sanitizeForFirestore(entry),
        { merge: true },
      ),
    );
    return entry;
  },

  async deleteAccountData(userId: string, groupIds: string[]) {
    if (getClientMode() === "demo") {
      return;
    }

    const batch = writeBatch(db());
    const deleteCollection = async (path: [string, ...string[]]) => {
      const snapshot = await withFirestoreTimeout(getDocs(collection(db(), ...path)));
      snapshot.docs.forEach((entry: any) => batch.delete(entry.ref));
    };

    await deleteCollection(["users", userId, "pushTokens"]);
    await deleteCollection(["users", userId, "groupPreferences"]);
    await deleteCollection(["users", userId, "blockedUsers"]);
    await deleteCollection(["users", userId, "notificationReads"]);

    groupIds.forEach((groupId) => {
      batch.delete(doc(db(), "groups", groupId, "members", userId));
      batch.delete(doc(db(), "locations", toLocationId(groupId, userId)));
    });

    batch.delete(doc(db(), "users", userId));
    await withFirestoreTimeout(batch.commit());
  },
};

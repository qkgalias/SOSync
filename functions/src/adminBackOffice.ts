/** Purpose: Provide custom-claim protected admin back-office functions. */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { createHash } from "node:crypto";

import { adminAuth, adminDb, adminStorage } from "./admin.js";
import {
  ADMIN_ROLES,
  AdminRole,
  CONTENT_ROLES,
  SUPPORT_ROLES,
  SUPERADMIN_ROLES,
  normalizeAdminRole,
  resolveAdminContext,
} from "./adminAuthorization.js";
import { functionsRegion } from "./config.js";
import {
  deriveEvacuationCenterGeography,
  isValidEvacuationCenterContact,
  normalizeLocationText,
} from "./evacuationCenterHelpers.js";
import { resolveHotlineCityArea, serializeHotlineDoc, type HotlineInput } from "./hotlineHelpers.js";

export type SupportReportStatus = "dismissed" | "new" | "resolved" | "reviewing";
export type AdminAccessStatus = "active" | "disabled";
export type AdminPermission = "manage_centers" | "manage_hotlines" | "manage_reports" | "manage_access" | "view_audit_logs";

const SUPPORT_STATUSES = new Set<SupportReportStatus>(["dismissed", "new", "resolved", "reviewing"]);
const MAX_PAGE_SIZE = 100;
const ADMIN_ACCESS_COLLECTION = "admin_access";
const ADMIN_ROLES_COLLECTION = "admin_roles";
const ADMIN_AUDIT_COLLECTION = "admin_audit_logs";
const ADMIN_NOTIFICATION_STATE_COLLECTION = "admin_notification_state";

const DEFAULT_ROLE_DEFINITIONS: Array<{
  description: string;
  label: string;
  permissions: AdminPermission[];
  role: AdminRole;
}> = [
  {
    description: "Full access to all features, roles, access management, and audit logs.",
    label: "Super Admin",
    permissions: ["manage_access", "manage_centers", "manage_hotlines", "manage_reports", "view_audit_logs"],
    role: "superadmin",
  },
  {
    description: "Manage evacuation centers, reports, hotlines, and operational settings.",
    label: "Admin",
    permissions: ["manage_centers", "manage_hotlines", "manage_reports"],
    role: "admin",
  },
  {
    description: "Manage evacuation centers and hotlines.",
    label: "Operator",
    permissions: ["manage_centers", "manage_hotlines"],
    role: "operator",
  },
];

type ListInput = {
  limit?: unknown;
  status?: unknown;
  kind?: unknown;
};

type ListLogsInput = {
  limit?: unknown;
  actorRole?: unknown;
  action?: unknown;
  targetType?: unknown;
};

type RoleInput = {
  description?: unknown;
  label?: unknown;
  permissions?: unknown;
  role?: unknown;
};

type AccessInput = {
  email?: unknown;
  role?: unknown;
  uid?: unknown;
  status?: unknown;
};

type EvacuationCenterInput = {
  address?: unknown;
  capacity?: unknown;
  centerId?: unknown;
  city?: unknown;
  contact?: unknown;
  countryCode?: unknown;
  disabled?: unknown;
  islandGroup?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  name?: unknown;
  province?: unknown;
  region?: unknown;
  regionCode?: unknown;
  serviceRadiusKm?: unknown;
};

type IdInput = {
  centerId?: unknown;
  hotlineId?: unknown;
  reportId?: unknown;
  status?: unknown;
};

type AdminNotificationItem = {
  createdAt?: string;
  id: string;
  kind: "evacuation_center" | "hotline" | "support_report";
  message: string;
  sourceLabel: string;
  tab: "centers" | "hotlines" | "reports";
  targetId: string;
  targetLabel: string;
  title: string;
};

type NotificationInput = {
  notificationId?: unknown;
};

const toOptionalString = (value: unknown, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const toRequiredString = (value: unknown, fieldName: string, maxLength = 240) => {
  const normalized = toOptionalString(value, maxLength);
  if (!normalized) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }
  return normalized;
};

const toFiniteNumber = (value: unknown, fieldName: string) => {
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new HttpsError("invalid-argument", `${fieldName} must be a valid number.`);
  }
  return numberValue;
};

const toOptionalFiniteNumber = (value: unknown, fieldName: string) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return toFiniteNumber(value, fieldName);
};

const toBoolean = (value: unknown) => value === true || String(value).toLowerCase() === "true";
const toArrayOfStrings = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => toOptionalString(item, 120)).filter(Boolean) : [];

const toPageSize = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(MAX_PAGE_SIZE, Math.floor(parsed))) : 50;
};

const toDocumentId = (value: unknown, fieldName: string) => {
  const id = toOptionalString(value, 120);
  if (!/^[a-zA-Z0-9_-]{3,120}$/.test(id)) {
    throw new HttpsError("invalid-argument", `${fieldName} is not valid.`);
  }
  return id;
};

const serializeValue = (value: unknown): unknown => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, serializeValue(entry)]));
  }
  return value;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const serializeDoc = (idField: string) => (snapshot: FirebaseFirestore.QueryDocumentSnapshot) => ({
  [idField]: snapshot.id,
  ...asRecord(serializeValue(snapshot.data())),
});

const serializeDocs = (idField: string, snapshots: FirebaseFirestore.QuerySnapshot) =>
  snapshots.docs.map(serializeDoc(idField));

const toAdminUid = (value: unknown) => {
  const uid = toOptionalString(value, 128);
  if (!uid) {
    throw new HttpsError("invalid-argument", "User ID is not valid.");
  }
  return uid;
};

const SIGNED_MEDIA_URL_TTL_MS = 15 * 60 * 1000;

const getMediaPreviewType = (contentType: string) => {
  if (contentType.startsWith("image/")) {
    return "image";
  }
  if (contentType.startsWith("video/")) {
    return "video";
  }
  return "file";
};

const enrichSupportReportMedia = async (report: Record<string, unknown>) => {
  const mediaFiles = Array.isArray(report.mediaFiles) ? report.mediaFiles : [];
  if (!mediaFiles.length) {
    return report;
  }

  const reportId = toOptionalString(report.reportId, 120);
  const submittedBy = toOptionalString(report.submittedBy, 120);
  const expectedPrefix = reportId && submittedBy ? `supportReports/${submittedBy}/${reportId}/` : "";
  const bucket = adminStorage.bucket();
  const enrichedMediaFiles = await Promise.all(
    mediaFiles.map(async (media) => {
      const mediaRecord = asRecord(media);
      const storagePath = toOptionalString(mediaRecord.storagePath, 500);
      const contentType = toOptionalString(mediaRecord.contentType, 120);
      const previewType = getMediaPreviewType(contentType);

      if (!storagePath) {
        return {
          ...mediaRecord,
          ...(contentType ? { previewType } : {}),
          previewStatus: "unavailable",
        };
      }

      if (!expectedPrefix || !storagePath.startsWith(expectedPrefix)) {
        logger.warn("Support report media path failed ownership validation.", {
          reportId,
          storagePath,
        });
        return {
          ...mediaRecord,
          previewStatus: "unavailable",
          previewType,
        };
      }

      try {
        const file = bucket.file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
          logger.warn("Support report media object is missing.", { reportId, storagePath });
          return {
            ...mediaRecord,
            previewStatus: "missing",
            previewType,
          };
        }

        const [downloadUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + SIGNED_MEDIA_URL_TTL_MS,
        });
        return {
          ...mediaRecord,
          downloadUrl,
          previewStatus: "ready",
          previewType,
        };
      } catch (error) {
        logger.error("Support report media URL generation failed.", {
          errorCode: asRecord(error).code,
          errorMessage: error instanceof Error ? error.message : "Unknown media signing error",
          reportId,
          storagePath,
        });
        return {
          ...mediaRecord,
          previewStatus: "unavailable",
          previewType,
        };
      }
    }),
  );

  return {
    ...report,
    mediaFiles: enrichedMediaFiles,
  };
};

const deleteSupportReportMedia = async (report: Record<string, unknown>) => {
  const mediaFiles = Array.isArray(report.mediaFiles) ? report.mediaFiles : [];
  const storagePaths = Array.from(
    new Set(
      mediaFiles
        .map((media) => toOptionalString(asRecord(media).storagePath, 500))
        .filter((storagePath) => storagePath.length > 0),
    ),
  );

  if (!storagePaths.length) {
    return;
  }

  const bucket = adminStorage.bucket();
  await Promise.all(
    storagePaths.map(async (storagePath) => {
      try {
        await bucket.file(storagePath).delete();
      } catch {
        // Storage cleanup is best-effort so an already-missing file does not block ticket deletion.
      }
    }),
  );
};

const enrichSupportReportIdentity = async (report: Record<string, unknown>) => {
  const submittedBy = toOptionalString(report.submittedBy, 120);
  if (!submittedBy) {
    return report;
  }

  const userSnapshot = await adminDb.collection("users").doc(submittedBy).get();
  const userProfile = asRecord(serializeValue(userSnapshot.data() ?? {}));
  const profileSecurity = asRecord(userProfile.security);

  let authUser: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null;
  const shouldFetchAuthUser = !userProfile.email || !userProfile.name || !userProfile.phoneNumber;
  if (shouldFetchAuthUser) {
    try {
      authUser = await adminAuth.getUser(submittedBy);
    } catch {
      authUser = null;
    }
  }

  const reporterName = toOptionalString(userProfile.name, 160) || toOptionalString(authUser?.displayName, 160);
  const reporterEmail = toOptionalString(userProfile.email, 240) || toOptionalString(authUser?.email, 240);
  const reporterPhoneNumber = toOptionalString(userProfile.phoneNumber, 80) || toOptionalString(authUser?.phoneNumber, 80);
  const profileEmailVerified = profileSecurity.emailVerified;
  const reporterEmailVerified =
    typeof profileEmailVerified === "boolean" ? profileEmailVerified : authUser?.emailVerified;

  return {
    ...report,
    ...(reporterName ? { reporterName } : {}),
    ...(reporterEmail ? { reporterEmail } : {}),
    ...(reporterPhoneNumber ? { reporterPhoneNumber } : {}),
    ...(typeof reporterEmailVerified === "boolean" ? { reporterEmailVerified } : {}),
  };
};

const enrichSupportReport = async (report: Record<string, unknown>) => {
  const withIdentity = await enrichSupportReportIdentity(report);
  return enrichSupportReportMedia(withIdentity);
};

const enrichSupportReports = async (reports: Array<Record<string, unknown>>) =>
  Promise.all(reports.map(enrichSupportReportIdentity));

const withAdminMetadata = (uid: string) => ({
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: uid,
});

const logAdminAction = async (actor: { role: AdminRole; uid: string }, action: string, targetType: string, targetId: string, details?: Record<string, unknown>) => {
  await adminDb.collection(ADMIN_AUDIT_COLLECTION).add({
    action,
    actorRole: actor.role,
    actorUid: actor.uid,
    createdAt: FieldValue.serverTimestamp(),
    details: details ?? {},
    targetId,
    targetType,
  });
};

const ensureRoleDefinitions = async () => {
  const snapshots = await Promise.all(
    DEFAULT_ROLE_DEFINITIONS.map(async (definition) => {
      const ref = adminDb.collection(ADMIN_ROLES_COLLECTION).doc(definition.role);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        await ref.set(
          {
            ...definition,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: "system",
          },
          { merge: true },
        );
      }
      return ref.get();
    }),
  );
  return snapshots;
};

const getAccessRecord = async (uid: string) => {
  const snapshot = await adminDb.collection(ADMIN_ACCESS_COLLECTION).doc(uid).get();
  return snapshot.exists ? asRecord(snapshot.data() ?? {}) : null;
};

const toShortRef = (value: string) => `${value.slice(0, 10)}...`;

const getAdminActorLabel = async (uid: unknown) => {
  const normalizedUid = toOptionalString(uid, 128);
  if (!normalizedUid) {
    return "Unknown admin";
  }

  const accessRecord = await getAccessRecord(normalizedUid);
  const accessEmail = toOptionalString(accessRecord?.email, 240);
  if (accessEmail) {
    return accessEmail;
  }

  try {
    const user = await adminAuth.getUser(normalizedUid);
    return user.email ?? user.displayName ?? toShortRef(normalizedUid);
  } catch {
    return toShortRef(normalizedUid);
  }
};

const getReporterSourceLabel = (report: Record<string, unknown>) => {
  const reporterEmail = toOptionalString(report.reporterEmail, 240);
  const reporterName = toOptionalString(report.reporterName, 160);
  const reporterPhoneNumber = toOptionalString(report.reporterPhoneNumber, 80);
  const submittedBy = toOptionalString(report.submittedBy, 120);
  return reporterEmail || reporterName || reporterPhoneNumber || (submittedBy ? toShortRef(submittedBy) : "Unknown reporter");
};

const getReportPreview = (report: Record<string, unknown>) => {
  const message = toOptionalString(report.message, 500) || "No message provided.";
  return message.length > 90 ? `${message.slice(0, 90)}...` : message;
};

const getRecordTimestamp = (record: Record<string, unknown>) =>
  toOptionalString(record.updatedAt, 80) || toOptionalString(record.createdAt, 80);

const getCenterLocationLabel = (center: Record<string, unknown>) =>
  [toOptionalString(center.city, 120), toOptionalString(center.region, 80)]
    .filter(Boolean)
    .join(", ") || "Location unavailable";

const getHotlineLocationLabel = (hotline: Record<string, unknown>) =>
  [toOptionalString(hotline.cityArea, 120), toOptionalString(hotline.region, 40)].filter(Boolean).join(", ") ||
  "Area unavailable";

const notificationTime = (value?: string) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
};

const sortNotifications = (notifications: AdminNotificationItem[]) =>
  notifications.sort((first, second) => {
    const firstTime = notificationTime(first.createdAt);
    const secondTime = notificationTime(second.createdAt);
    const timeDifference = secondTime - firstTime;
    return timeDifference === 0 || Number.isNaN(timeDifference) ? first.id.localeCompare(second.id) : timeDifference;
  });

const notificationVersion = (record: Record<string, unknown>) => getRecordTimestamp(record) || "unknown";
const notificationId = (kind: AdminNotificationItem["kind"], targetId: string, version: string) =>
  `${kind}:${targetId}:${version}`;
const notificationDismissalId = (id: string) => createHash("sha256").update(id).digest("hex");

const getVisibleAdminNotifications = async (uid: string, notifications: AdminNotificationItem[]) => {
  const stateRef = adminDb.collection(ADMIN_NOTIFICATION_STATE_COLLECTION).doc(uid);
  const [stateSnapshot, dismissalsSnapshot] = await Promise.all([
    stateRef.get(),
    stateRef.collection("dismissals").get(),
  ]);
  const clearedThroughValue = stateSnapshot.data()?.clearedThrough;
  const clearedThrough = clearedThroughValue instanceof Timestamp ? clearedThroughValue.toMillis() : null;
  const dismissedIds = new Set(
    dismissalsSnapshot.docs.map((snapshot) => toOptionalString(snapshot.data().notificationId, 500)).filter(Boolean),
  );

  return notifications.filter((notification) => {
    if (dismissedIds.has(notification.id)) {
      return false;
    }
    if (clearedThrough === null) {
      return true;
    }
    const createdAt = notification.createdAt ? Date.parse(notification.createdAt) : Number.NaN;
    return Number.isFinite(createdAt) && createdAt > clearedThrough;
  });
};

const assertAdminRole = async (auth: unknown, allowedRoles: Set<AdminRole | "content_admin" | "support_admin" | "super_admin">) => {
  const result = resolveAdminContext(auth as { token?: Record<string, unknown>; uid?: string } | undefined, allowedRoles);
  if (result.code === "unauthenticated") {
    throw new HttpsError("unauthenticated", "Sign in before opening the SOSync admin portal.");
  }
  if (result.code === "permission-denied" || !result.context) {
    throw new HttpsError("permission-denied", "Your account is not allowed to use this admin tool.");
  }

  const accessRecord = await getAccessRecord(result.context.uid);
  if (accessRecord && toOptionalString(accessRecord.status, 20) === "disabled") {
    throw new HttpsError("permission-denied", "Your admin access has been disabled.");
  }

  return result.context;
};

const normalizeEvacuationCenterPayload = (data: EvacuationCenterInput, uid: string) => {
  const serviceRadiusKm = toOptionalFiniteNumber(data.serviceRadiusKm, "Service radius");
  const geography = deriveEvacuationCenterGeography(data.regionCode);
  const name = normalizeLocationText(data.name);
  const address = normalizeLocationText(data.address);
  const city = normalizeLocationText(data.city);
  const contact = normalizeLocationText(data.contact);
  const capacity = toFiniteNumber(data.capacity, "Capacity");
  const latitude = toFiniteNumber(data.latitude, "Latitude");
  const longitude = toFiniteNumber(data.longitude, "Longitude");

  if (name.length < 2 || name.length > 160) throw new HttpsError("invalid-argument", "Center name must be 2 to 160 characters.");
  if (address.length < 5 || address.length > 300) throw new HttpsError("invalid-argument", "Address must be 5 to 300 characters.");
  if (!city || city.length > 120) throw new HttpsError("invalid-argument", "City or municipality is required.");
  if (!isValidEvacuationCenterContact(contact)) {
    throw new HttpsError("invalid-argument", "Contact must contain 7 to 11 digits.");
  }
  if (!geography) throw new HttpsError("invalid-argument", "Select a valid Philippine region.");
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 1_000_000) {
    throw new HttpsError("invalid-argument", "Capacity must be a whole number from 0 to 1,000,000.");
  }
  if (latitude < 4 || latitude > 22.5 || longitude < 114 || longitude > 128) {
    throw new HttpsError("invalid-argument", "Coordinates must be within the Philippines.");
  }
  if (serviceRadiusKm === null || serviceRadiusKm < 0.1 || serviceRadiusKm > 75) {
    throw new HttpsError("invalid-argument", "Service radius must be between 0.1 and 75 km.");
  }
  return {
    address,
    capacity,
    city,
    contact,
    disabled: toBoolean(data.disabled),
    ...geography,
    latitude,
    longitude,
    name,
    serviceRadiusKm,
    ...withAdminMetadata(uid),
  };
};

export const getAdminBootstrap = onCall<Record<string, never>, Promise<{ role: AdminRole; uid: string }>>(
  { region: functionsRegion },
  async (request) => await assertAdminRole(request.auth, ADMIN_ROLES),
);

export const listAdminNotifications = onCall<{ limit?: unknown }, Promise<{ notifications: AdminNotificationItem[] }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, ADMIN_ROLES);
    const limit = toPageSize(request.data?.limit);
    const notifications: AdminNotificationItem[] = [];

    const [centersSnapshot, hotlinesSnapshot, reportsSnapshot] = await Promise.all([
      adminDb.collection("evacuation_centers").where("disabled", "==", true).limit(limit).get(),
      adminDb.collection("emergency_hotlines").where("disabled", "==", true).limit(limit).get(),
      SUPPORT_ROLES.has(admin.role)
        ? adminDb.collection("support_reports").orderBy("createdAt", "desc").limit(MAX_PAGE_SIZE).get()
        : Promise.resolve(null),
    ]);

    const centerItems = await Promise.all(
      centersSnapshot.docs.map(async (snapshot) => {
        const center = serializeDoc("centerId")(snapshot);
        const name = toOptionalString(center.name, 160) || "Unnamed evacuation center";
        const sourceLabel = await getAdminActorLabel(center.updatedBy);
        return {
          createdAt: getRecordTimestamp(center),
          id: notificationId("evacuation_center", snapshot.id, notificationVersion(center)),
          kind: "evacuation_center" as const,
          message: `${getCenterLocationLabel(center)}. Last updated by ${sourceLabel}.`,
          sourceLabel,
          tab: "centers" as const,
          targetId: snapshot.id,
          targetLabel: name,
          title: `${name} is disabled`,
        };
      }),
    );

    const hotlineItems = await Promise.all(
      hotlinesSnapshot.docs.map(async (snapshot) => {
        const hotline = serializeHotlineDoc(snapshot) as Record<string, unknown>;
        const name = toOptionalString(hotline.name, 160) || "Unnamed hotline";
        const phone = toOptionalString(hotline.phone, 80);
        const sourceLabel = await getAdminActorLabel(hotline.updatedBy);
        return {
          createdAt: getRecordTimestamp(hotline),
          id: notificationId("hotline", snapshot.id, notificationVersion(hotline)),
          kind: "hotline" as const,
          message: `${phone ? `${phone}. ` : ""}${getHotlineLocationLabel(hotline)}. Last updated by ${sourceLabel}.`,
          sourceLabel,
          tab: "hotlines" as const,
          targetId: snapshot.id,
          targetLabel: name,
          title: `${name} is disabled`,
        };
      }),
    );

    notifications.push(...centerItems, ...hotlineItems);

    if (reportsSnapshot) {
      const reports = await enrichSupportReports(
        reportsSnapshot.docs
          .map(serializeDoc("reportId"))
          .filter((report) => {
            const status = toOptionalString(report.status, 40);
            return !status || status === "new";
          })
          .slice(0, limit),
      );
      reports.forEach((report) => {
        const category = toOptionalString(report.category, 140) || (report.kind === "problem" ? "Problem report" : "Support request");
        const sourceLabel = getReporterSourceLabel(report);
        notifications.push({
          createdAt: toOptionalString(report.createdAt, 80),
          id: notificationId(
            "support_report",
            toOptionalString(report.reportId, 120),
            toOptionalString(report.createdAt, 80) || "unknown",
          ),
          kind: "support_report",
          message: `${category}: ${getReportPreview(report)}`,
          sourceLabel,
          tab: "reports",
          targetId: toOptionalString(report.reportId, 120),
          targetLabel: category,
          title: `New support report from ${sourceLabel}`,
        });
      });
    }

    const visibleNotifications = await getVisibleAdminNotifications(admin.uid, notifications);
    return { notifications: sortNotifications(visibleNotifications).slice(0, limit) };
  },
);

export const dismissAdminNotification = onCall<NotificationInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, ADMIN_ROLES);
    const id = toRequiredString(request.data?.notificationId, "Notification ID", 500);
    await adminDb
      .collection(ADMIN_NOTIFICATION_STATE_COLLECTION)
      .doc(admin.uid)
      .collection("dismissals")
      .doc(notificationDismissalId(id))
      .set({ createdAt: FieldValue.serverTimestamp(), notificationId: id });
    return { success: true };
  },
);

export const clearAdminNotifications = onCall<Record<string, never>, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, ADMIN_ROLES);
    const stateRef = adminDb.collection(ADMIN_NOTIFICATION_STATE_COLLECTION).doc(admin.uid);
    const dismissalsSnapshot = await stateRef.collection("dismissals").limit(400).get();
    const batch = adminDb.batch();
    batch.set(stateRef, { clearedThrough: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    dismissalsSnapshot.docs.forEach((snapshot) => batch.delete(snapshot.ref));
    await batch.commit();
    return { success: true };
  },
);

export const listAdminRoles = onCall<Record<string, never>, Promise<{ roles: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    await ensureRoleDefinitions();
    const [rolesSnapshot, accessSnapshot] = await Promise.all([
      adminDb.collection(ADMIN_ROLES_COLLECTION).orderBy("label", "asc").get(),
      adminDb.collection(ADMIN_ACCESS_COLLECTION).get(),
    ]);
    const userCountByRole = accessSnapshot.docs.reduce<Record<string, number>>((counts, snapshot) => {
      const role = normalizeAdminRole(asRecord(snapshot.data()).role as string | undefined);
      if (role) {
        counts[role] = (counts[role] ?? 0) + 1;
      }
      return counts;
    }, {});
    return {
      roles: serializeDocs("role", rolesSnapshot).map((role) => {
        const entry = role as { permissions?: unknown[]; role?: string };
        return {
          ...role,
          userCount: entry.role ? userCountByRole[entry.role] ?? 0 : 0,
        };
      }),
    };
  },
);

export const upsertAdminRole = onCall<RoleInput, Promise<{ role: AdminRole }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    const requestedRole = normalizeAdminRole(request.data?.role as string | undefined);
    if (!requestedRole) {
      throw new HttpsError("invalid-argument", "Choose a valid role.");
    }

    const label = toRequiredString(request.data?.label, "Role name", 80);
    const description = toRequiredString(request.data?.description, "Role description", 220);
    const permissions = toArrayOfStrings(request.data?.permissions).filter((permission) =>
      ["manage_access", "manage_centers", "manage_hotlines", "manage_reports", "view_audit_logs"].includes(permission),
    ) as AdminPermission[];

    await adminDb.collection(ADMIN_ROLES_COLLECTION).doc(requestedRole).set(
      {
        description,
        label,
        permissions,
        role: requestedRole,
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    return { role: requestedRole };
  },
);

export const listAdminAccess = onCall<{ limit?: unknown }, Promise<{ users: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    const snapshot = await adminDb.collection(ADMIN_ACCESS_COLLECTION).orderBy("updatedAt", "desc").limit(toPageSize(request.data?.limit)).get();
    return { users: serializeDocs("uid", snapshot) };
  },
);

export const upsertAdminAccess = onCall<AccessInput, Promise<{ uid: string }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    const email = toRequiredString(request.data?.email, "Email", 240).toLowerCase();
    const role = normalizeAdminRole(request.data?.role as string | undefined);
    if (!role) {
      throw new HttpsError("invalid-argument", "Choose a valid role.");
    }

    let user;
    try {
      user = await adminAuth.getUserByEmail(email);
    } catch {
      throw new HttpsError("not-found", "Create the Firebase account for this email before granting admin access.");
    }

    await adminAuth.setCustomUserClaims(user.uid, {
      ...(user.customClaims ?? {}),
      sosyncRole: role,
    });

    const status = toOptionalString(request.data?.status, 40) === "disabled" ? "disabled" : "active";
    await adminDb.collection(ADMIN_ACCESS_COLLECTION).doc(user.uid).set(
      {
        email: user.email ?? email,
        role,
        status,
        uid: user.uid,
        ...withAdminMetadata(admin.uid),
        ...(user.metadata.lastSignInTime ? { lastSignInAt: user.metadata.lastSignInTime } : {}),
      },
      { merge: true },
    );
    return { uid: user.uid };
  },
);

export const revokeAdminAccess = onCall<{ uid?: unknown }, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    const uid = toAdminUid(request.data?.uid);
    const accessRef = adminDb.collection(ADMIN_ACCESS_COLLECTION).doc(uid);
    const accessSnapshot = await accessRef.get();
    if (!accessSnapshot.exists) {
      throw new HttpsError("not-found", "Admin access record was not found.");
    }

    const accessData = asRecord(accessSnapshot.data() ?? {});
    let existingClaims: Record<string, unknown> = {};
    try {
      existingClaims = (await adminAuth.getUser(uid)).customClaims ?? {};
    } catch {
      existingClaims = {};
    }
    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      sosyncRole: "operator",
    });
    await accessRef.set(
      {
        ...accessData,
        status: "disabled",
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    return { success: true };
  },
);

export const listAuditLogs = onCall<ListLogsInput, Promise<{ logs: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, SUPERADMIN_ROLES);
    const limit = toPageSize(request.data?.limit);
    const snapshot = await adminDb.collection(ADMIN_AUDIT_COLLECTION).orderBy("createdAt", "desc").limit(limit).get();
    const actorRole = normalizeAdminRole(request.data?.actorRole as string | undefined);
    const action = toOptionalString(request.data?.action, 120);
    const targetType = toOptionalString(request.data?.targetType, 120);
    const logs = serializeDocs("logId", snapshot).filter((log) => {
      const entry = log as { action?: string; actorRole?: string; targetType?: string };
      return (
        (!actorRole || entry.actorRole === actorRole) &&
        (!action || String(entry.action ?? "").includes(action)) &&
        (!targetType || entry.targetType === targetType)
      );
    });
    return { logs };
  },
);

export const listHotlines = onCall<ListInput, Promise<{ hotlines: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, CONTENT_ROLES);
    const snapshot = await adminDb
      .collection("emergency_hotlines")
      .orderBy("name", "asc")
      .limit(toPageSize(request.data?.limit))
      .get();
    return { hotlines: snapshot.docs.map(serializeHotlineDoc) };
  },
);

export const upsertHotline = onCall<HotlineInput, Promise<{ hotlineId: string }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, CONTENT_ROLES);
    const requestedId = toOptionalString(request.data?.hotlineId, 120);
    const hotlineRef = requestedId
      ? adminDb.collection("emergency_hotlines").doc(toDocumentId(requestedId, "Hotline ID"))
      : adminDb.collection("emergency_hotlines").doc();
    const existing = await hotlineRef.get();
    const existingData = (existing.data() as Record<string, unknown> | undefined) ?? {};
    const resolvedCityArea =
      toOptionalString(request.data?.cityArea, 120) ||
      resolveHotlineCityArea({
        cityArea: existingData.cityArea,
        hotlineId: hotlineRef.id,
        name: existingData.name,
        region: existingData.region,
      });

    if (!resolvedCityArea) {
      throw new HttpsError("invalid-argument", "City / Area is required.");
    }

    const normalizedName = toRequiredString(request.data?.name, "Hotline name", 120);
    const normalizedPhone = toRequiredString(request.data?.phone, "Hotline phone", 80);
    const normalizedDescription = toOptionalString(request.data?.description, 500);
    const normalizedDisabled = toBoolean(request.data?.disabled);

    await hotlineRef.set(
      {
        cityArea: resolvedCityArea,
        description: normalizedDescription,
        disabled: normalizedDisabled,
        name: normalizedName,
        phone: normalizedPhone,
        region: "PH",
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    await logAdminAction(admin, "hotlines.upsert", "emergency_hotlines", hotlineRef.id, {
      disabled: normalizedDisabled,
      name: normalizedName,
    });

    return { hotlineId: hotlineRef.id };
  },
);

export const deleteHotline = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, CONTENT_ROLES);
    const hotlineId = toDocumentId(request.data?.hotlineId, "Hotline ID");
    await adminDb.collection("emergency_hotlines").doc(hotlineId).delete();
    await logAdminAction(admin, "hotlines.delete", "emergency_hotlines", hotlineId);
    return { success: true };
  },
);

export const listEvacuationCenters = onCall<ListInput, Promise<{ centers: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, CONTENT_ROLES);
    const snapshot = await adminDb
      .collection("evacuation_centers")
      .orderBy("name", "asc")
      .limit(toPageSize(request.data?.limit))
      .get();
    return { centers: snapshot.docs.map(serializeDoc("centerId")) };
  },
);

export const upsertEvacuationCenter = onCall<EvacuationCenterInput, Promise<{ centerId: string }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, CONTENT_ROLES);
    const requestedId = toOptionalString(request.data?.centerId, 120);
    const centerRef = requestedId
      ? adminDb.collection("evacuation_centers").doc(toDocumentId(requestedId, "Center ID"))
      : adminDb.collection("evacuation_centers").doc();
    const existing = await centerRef.get();

    await centerRef.set(
      {
        ...normalizeEvacuationCenterPayload(request.data ?? {}, admin.uid),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );
    await logAdminAction(admin, "centers.upsert", "evacuation_centers", centerRef.id, {
      disabled: toBoolean(request.data?.disabled),
      name: toOptionalString(request.data?.name, 160),
    });

    return { centerId: centerRef.id };
  },
);

export const deleteEvacuationCenter = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, CONTENT_ROLES);
    const centerId = toDocumentId(request.data?.centerId, "Center ID");
    await adminDb.collection("evacuation_centers").doc(centerId).delete();
    await logAdminAction(admin, "centers.delete", "evacuation_centers", centerId);
    return { success: true };
  },
);

export const listSupportReports = onCall<ListInput, Promise<{ reports: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, SUPPORT_ROLES);
    const status = toOptionalString(request.data?.status, 40);
    const kind = toOptionalString(request.data?.kind, 40);
    const snapshot = await adminDb
      .collection("support_reports")
      .orderBy("createdAt", "desc")
      .limit(MAX_PAGE_SIZE)
      .get();
    const reports = snapshot.docs
      .map(serializeDoc("reportId"))
      .filter((report) => {
        const entry = report as { kind?: unknown; status?: unknown };
        return (!status || entry.status === status) && (!kind || entry.kind === kind);
      })
      .slice(0, toPageSize(request.data?.limit));
    return { reports: await enrichSupportReports(reports) };
  },
);

export const getSupportReport = onCall<IdInput, Promise<{ report: unknown }>>(
  { region: functionsRegion },
  async (request) => {
    await assertAdminRole(request.auth, SUPPORT_ROLES);
    const reportId = toDocumentId(request.data?.reportId, "Report ID");
    const snapshot = await adminDb.collection("support_reports").doc(reportId).get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Support report was not found.");
    }
    const report = { reportId: snapshot.id, ...asRecord(serializeValue(snapshot.data() ?? {})) };
    return { report: await enrichSupportReport(report) };
  },
);

export const deleteSupportReport = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, SUPPORT_ROLES);
    const reportId = toDocumentId(request.data?.reportId, "Report ID");
    const reportRef = adminDb.collection("support_reports").doc(reportId);
    const snapshot = await reportRef.get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Support report was not found.");
    }

    await deleteSupportReportMedia(asRecord(serializeValue(snapshot.data() ?? {})));
    await reportRef.delete();
    await logAdminAction(admin, "reports.delete", "support_reports", reportId);

    return { success: true };
  },
);

export const updateSupportReportStatus = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = await assertAdminRole(request.auth, SUPPORT_ROLES);
    const reportId = toDocumentId(request.data?.reportId, "Report ID");
    const status = toOptionalString(request.data?.status, 40);
    if (!SUPPORT_STATUSES.has(status as SupportReportStatus)) {
      throw new HttpsError("invalid-argument", "Choose a valid report status.");
    }

    await adminDb.collection("support_reports").doc(reportId).set(
      {
        status,
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    await logAdminAction(admin, "reports.status", "support_reports", reportId, { status });

    return { success: true };
  },
);

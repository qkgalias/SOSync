/** Purpose: Provide custom-claim protected admin back-office functions. */
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminAuth, adminDb, adminStorage } from "./admin.js";
import {
  ADMIN_ROLES,
  AdminRole,
  CONTENT_ROLES,
  SUPPORT_ROLES,
  resolveAdminContext,
} from "./adminAuthorization.js";
import { functionsRegion } from "./config.js";

export type SupportReportStatus = "dismissed" | "new" | "resolved" | "reviewing";

const SUPPORT_STATUSES = new Set<SupportReportStatus>(["dismissed", "new", "resolved", "reviewing"]);
const MAX_PAGE_SIZE = 100;

type ListInput = {
  limit?: unknown;
  status?: unknown;
  kind?: unknown;
};

type HotlineInput = {
  description?: unknown;
  disabled?: unknown;
  hotlineId?: unknown;
  name?: unknown;
  phone?: unknown;
  region?: unknown;
};

type EvacuationCenterInput = {
  address?: unknown;
  capacity?: unknown;
  centerId?: unknown;
  city?: unknown;
  contact?: unknown;
  disabled?: unknown;
  islandGroup?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  name?: unknown;
  province?: unknown;
  region?: unknown;
  serviceRadiusKm?: unknown;
};

type IdInput = {
  centerId?: unknown;
  hotlineId?: unknown;
  reportId?: unknown;
  status?: unknown;
};

const assertAdminRole = (auth: unknown, allowedRoles: Set<AdminRole>) => {
  const result = resolveAdminContext(auth as { token?: Record<string, unknown>; uid?: string } | undefined, allowedRoles);
  if (result.code === "unauthenticated") {
    throw new HttpsError("unauthenticated", "Sign in before opening the SOSync admin portal.");
  }
  if (result.code === "permission-denied" || !result.context) {
    throw new HttpsError("permission-denied", "Your account is not allowed to use this admin tool.");
  }
  return result.context;
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
        };
      }

      try {
        const [downloadUrl] = await bucket.file(storagePath).getSignedUrl({
          action: "read",
          expires: Date.now() + SIGNED_MEDIA_URL_TTL_MS,
        });
        return {
          ...mediaRecord,
          downloadUrl,
          previewType,
        };
      } catch {
        return {
          ...mediaRecord,
          ...(contentType ? { previewType } : {}),
        };
      }
    }),
  );

  return {
    ...report,
    mediaFiles: enrichedMediaFiles,
  };
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

const enrichSupportReports = async (reports: Array<Record<string, unknown>>) => Promise.all(reports.map(enrichSupportReport));

const withAdminMetadata = (uid: string) => ({
  updatedAt: FieldValue.serverTimestamp(),
  updatedBy: uid,
});

const normalizeHotlinePayload = (data: HotlineInput, uid: string) => ({
  description: toOptionalString(data.description, 500),
  disabled: toBoolean(data.disabled),
  name: toRequiredString(data.name, "Hotline name", 120),
  phone: toRequiredString(data.phone, "Hotline phone", 80),
  region: toRequiredString(data.region, "Region", 40).toUpperCase(),
  ...withAdminMetadata(uid),
});

const normalizeEvacuationCenterPayload = (data: EvacuationCenterInput, uid: string) => {
  const serviceRadiusKm = toOptionalFiniteNumber(data.serviceRadiusKm, "Service radius");
  return {
    address: toRequiredString(data.address, "Address", 300),
    capacity: Math.max(0, Math.floor(toFiniteNumber(data.capacity, "Capacity"))),
    city: toOptionalString(data.city, 120),
    contact: toRequiredString(data.contact, "Contact", 120),
    disabled: toBoolean(data.disabled),
    islandGroup: toOptionalString(data.islandGroup, 80),
    latitude: toFiniteNumber(data.latitude, "Latitude"),
    longitude: toFiniteNumber(data.longitude, "Longitude"),
    name: toRequiredString(data.name, "Center name", 160),
    province: toOptionalString(data.province, 120),
    region: toRequiredString(data.region, "Region", 40).toUpperCase(),
    ...(serviceRadiusKm === null ? {} : { serviceRadiusKm }),
    ...withAdminMetadata(uid),
  };
};

export const getAdminBootstrap = onCall<Record<string, never>, Promise<{ role: AdminRole; uid: string }>>(
  { region: functionsRegion },
  async (request) => assertAdminRole(request.auth, ADMIN_ROLES),
);

export const listHotlines = onCall<ListInput, Promise<{ hotlines: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    assertAdminRole(request.auth, CONTENT_ROLES);
    const snapshot = await adminDb
      .collection("emergency_hotlines")
      .orderBy("name", "asc")
      .limit(toPageSize(request.data?.limit))
      .get();
    return { hotlines: snapshot.docs.map(serializeDoc("hotlineId")) };
  },
);

export const upsertHotline = onCall<HotlineInput, Promise<{ hotlineId: string }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = assertAdminRole(request.auth, CONTENT_ROLES);
    const requestedId = toOptionalString(request.data?.hotlineId, 120);
    const hotlineRef = requestedId
      ? adminDb.collection("emergency_hotlines").doc(toDocumentId(requestedId, "Hotline ID"))
      : adminDb.collection("emergency_hotlines").doc();
    const existing = await hotlineRef.get();

    await hotlineRef.set(
      {
        ...normalizeHotlinePayload(request.data ?? {}, admin.uid),
        ...(existing.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

    return { hotlineId: hotlineRef.id };
  },
);

export const deleteHotline = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = assertAdminRole(request.auth, CONTENT_ROLES);
    const hotlineId = toDocumentId(request.data?.hotlineId, "Hotline ID");
    await adminDb.collection("emergency_hotlines").doc(hotlineId).set(
      {
        disabled: true,
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    return { success: true };
  },
);

export const listEvacuationCenters = onCall<ListInput, Promise<{ centers: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    assertAdminRole(request.auth, CONTENT_ROLES);
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
    const admin = assertAdminRole(request.auth, CONTENT_ROLES);
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

    return { centerId: centerRef.id };
  },
);

export const deleteEvacuationCenter = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = assertAdminRole(request.auth, CONTENT_ROLES);
    const centerId = toDocumentId(request.data?.centerId, "Center ID");
    await adminDb.collection("evacuation_centers").doc(centerId).set(
      {
        disabled: true,
        ...withAdminMetadata(admin.uid),
      },
      { merge: true },
    );
    return { success: true };
  },
);

export const listSupportReports = onCall<ListInput, Promise<{ reports: unknown[] }>>(
  { region: functionsRegion },
  async (request) => {
    assertAdminRole(request.auth, SUPPORT_ROLES);
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
    assertAdminRole(request.auth, SUPPORT_ROLES);
    const reportId = toDocumentId(request.data?.reportId, "Report ID");
    const snapshot = await adminDb.collection("support_reports").doc(reportId).get();
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Support report was not found.");
    }
    const report = { reportId: snapshot.id, ...asRecord(serializeValue(snapshot.data() ?? {})) };
    return { report: await enrichSupportReport(report) };
  },
);

export const updateSupportReportStatus = onCall<IdInput, Promise<{ success: true }>>(
  { region: functionsRegion },
  async (request) => {
    const admin = assertAdminRole(request.auth, SUPPORT_ROLES);
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

    return { success: true };
  },
);

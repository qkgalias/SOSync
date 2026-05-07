/** Purpose: Persist support and problem-report submissions for admin review. */
import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

import { adminDb } from "./admin.js";
import { functionsRegion } from "./config.js";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_MEDIA_FILES = 3;
const REPORT_ID_REGEX = /^[a-zA-Z0-9_-]{8,120}$/;
const REPORT_CATEGORIES = new Set([
  "SOS Alert Failure",
  "Crash or Freeze",
  "Location Issues",
  "Notifications Failure",
  "UI/Text Glitches",
  "Other",
]);

type MediaFileInput = {
  contentType?: unknown;
  fileName?: unknown;
  storagePath?: unknown;
};

type SubmitSupportRequestInput = {
  appVersion?: unknown;
  buildLabel?: unknown;
  deviceModel?: unknown;
  message?: unknown;
};

type SubmitProblemReportInput = SubmitSupportRequestInput & {
  category?: unknown;
  mediaFiles?: unknown;
  otherReason?: unknown;
  reportId?: unknown;
};

const assertAuthenticated = (uid?: string) => {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Sign in before submitting a support request.");
  }

  return uid;
};

const normalizeOptionalString = (value: unknown, maxLength = 240) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

const normalizeRequiredMessage = (value: unknown) => {
  const message = normalizeOptionalString(value, MAX_MESSAGE_LENGTH);
  if (!message) {
    throw new HttpsError("invalid-argument", "Message is required.");
  }

  return message;
};

const normalizeMediaFiles = (value: unknown, userId: string, reportId: string) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, MAX_MEDIA_FILES).map((entry) => {
    const media = entry as MediaFileInput;
    const storagePath = normalizeOptionalString(media.storagePath, 500);
    if (!storagePath.startsWith(`supportReports/${userId}/${reportId}/`)) {
      throw new HttpsError("invalid-argument", "Report media path is not valid for this user.");
    }

    return {
      contentType: normalizeOptionalString(media.contentType, 120),
      fileName: normalizeOptionalString(media.fileName, 240),
      storagePath,
    };
  });
};

const buildBaseReport = (userId: string, data: SubmitSupportRequestInput) => ({
  appVersion: normalizeOptionalString(data.appVersion, 80) || "unknown",
  buildLabel: normalizeOptionalString(data.buildLabel, 80) || "unknown",
  createdAt: FieldValue.serverTimestamp(),
  deviceModel: normalizeOptionalString(data.deviceModel, 160) || "unknown",
  status: "new",
  submittedBy: userId,
  updatedAt: FieldValue.serverTimestamp(),
});

export const submitSupportRequest = onCall<SubmitSupportRequestInput, Promise<{ requestId: string }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const message = normalizeRequiredMessage(request.data?.message);
    const requestRef = adminDb.collection("support_reports").doc();

    await requestRef.set({
      ...buildBaseReport(userId, request.data ?? {}),
      kind: "support",
      message,
    });

    return { requestId: requestRef.id };
  },
);

export const submitProblemReport = onCall<SubmitProblemReportInput, Promise<{ reportId: string }>>(
  { region: functionsRegion },
  async (request) => {
    const userId = assertAuthenticated(request.auth?.uid);
    const data = request.data ?? {};
    const category = normalizeOptionalString(data.category, 120);
    if (!REPORT_CATEGORIES.has(category)) {
      throw new HttpsError("invalid-argument", "Choose a valid issue category.");
    }

    const message = normalizeRequiredMessage(data.message);
    const otherReason = normalizeOptionalString(data.otherReason, 500);
    if (category === "Other" && !otherReason) {
      throw new HttpsError("invalid-argument", "Other reason is required.");
    }

    const requestedReportId = normalizeOptionalString(data.reportId, 120);
    if (requestedReportId && !REPORT_ID_REGEX.test(requestedReportId)) {
      throw new HttpsError("invalid-argument", "Report reference is not valid.");
    }

    const reportRef = requestedReportId
      ? adminDb.collection("support_reports").doc(requestedReportId)
      : adminDb.collection("support_reports").doc();

    await reportRef.set({
      ...buildBaseReport(userId, data),
      category,
      kind: "problem",
      mediaFiles: normalizeMediaFiles(data.mediaFiles, userId, reportRef.id),
      message,
      otherReason,
    });

    return { reportId: reportRef.id };
  },
);

/** Purpose: Submit support and problem reports through the backend, with report media in Storage. */
import { httpsCallable } from "@react-native-firebase/functions";

import { resolveActiveFirebaseClientMode } from "@/config/backendRuntime";
import { firebaseFunctions, firebaseStorage, hasFirebaseApp } from "@/services/firebase";

type SupportMetadata = {
  appVersion: string;
  buildLabel: string;
  deviceModel?: string;
};

type ReportMedia = {
  fileName?: string | null;
  mimeType?: string | null;
  type?: string | null;
  uri: string;
};

type UploadedReportMedia = {
  contentType: string;
  fileName: string;
  storagePath: string;
};

const getClientMode = () => resolveActiveFirebaseClientMode(hasFirebaseApp());
const createId = () => `report-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const resolveMediaContentType = (media: ReportMedia) => {
  if (media.mimeType) {
    return media.mimeType;
  }

  return media.type === "video" ? "video/mp4" : "image/jpeg";
};

const resolveMediaFileName = (media: ReportMedia, index: number) => {
  if (media.fileName?.trim()) {
    return media.fileName.trim();
  }

  const extension = resolveMediaContentType(media).startsWith("video/") ? "mp4" : "jpg";
  return `attachment-${index + 1}.${extension}`;
};

const callSupportFunction = async <RequestData extends object, ResponseData>(name: string, payload: RequestData) => {
  const callable = httpsCallable<RequestData, ResponseData>(firebaseFunctions(), name, { timeout: 15_000 });
  const result = await callable(payload);
  return result.data;
};

export const supportService = {
  createReportId() {
    return createId();
  },

  async uploadReportMedia(userId: string, reportId: string, media: ReportMedia, index = 0): Promise<UploadedReportMedia> {
    if (getClientMode() === "demo") {
      return {
        contentType: resolveMediaContentType(media),
        fileName: resolveMediaFileName(media, index),
        storagePath: media.uri,
      };
    }

    const contentType = resolveMediaContentType(media);
    const fileName = resolveMediaFileName(media, index);
    const storagePath = `supportReports/${userId}/${reportId}/${Date.now()}-${fileName}`;
    const reference = firebaseStorage().ref(storagePath);

    await reference.putFile(media.uri, {
      contentType,
      customMetadata: {
        owner: userId,
        reportId,
      },
    });

    return { contentType, fileName, storagePath };
  },

  async submitSupportRequest(input: SupportMetadata & { message: string }) {
    if (getClientMode() === "demo") {
      return { requestId: createId() };
    }

    return callSupportFunction<typeof input, { requestId: string }>("submitSupportRequest", input);
  },

  async submitProblemReport(input: SupportMetadata & {
    category: string;
    mediaFiles: UploadedReportMedia[];
    message: string;
    otherReason?: string;
    reportId: string;
  }) {
    if (getClientMode() === "demo") {
      return { reportId: input.reportId };
    }

    return callSupportFunction<typeof input, { reportId: string }>("submitProblemReport", input);
  },
};

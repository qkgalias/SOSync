export type AdminRole = "content_admin" | "support_admin" | "super_admin";
export type AppTab = "centers" | "dashboard" | "hotlines" | "reports" | "settings" | "status";
export type ReportStatus = "dismissed" | "new" | "resolved" | "reviewing";

export type Bootstrap = {
  role: AdminRole;
  uid: string;
};

export type Hotline = {
  createdAt?: string;
  description?: string;
  disabled?: boolean;
  hotlineId: string;
  name: string;
  phone: string;
  region: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type EvacuationCenter = {
  address: string;
  capacity: number;
  centerId: string;
  city?: string;
  contact: string;
  createdAt?: string;
  disabled?: boolean;
  islandGroup?: string;
  latitude: number;
  longitude: number;
  name: string;
  province?: string;
  region: string;
  serviceRadiusKm?: number;
  updatedAt?: string;
  updatedBy?: string;
};

export type SupportReport = {
  appVersion?: string;
  buildLabel?: string;
  category?: string;
  createdAt?: string;
  deviceModel?: string;
  kind?: "problem" | "support";
  mediaFiles?: Array<{
    contentType?: string;
    downloadUrl?: string;
    fileName?: string;
    previewType?: "file" | "image" | "video";
    storagePath?: string;
  }>;
  message?: string;
  otherReason?: string;
  reportId: string;
  reporterEmail?: string;
  reporterEmailVerified?: boolean;
  reporterName?: string;
  reporterPhoneNumber?: string;
  status?: ReportStatus;
  submittedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type HotlineDraft = Omit<Hotline, "hotlineId"> & { hotlineId?: string };
export type EvacuationCenterDraft = Omit<EvacuationCenter, "centerId"> & { centerId?: string };

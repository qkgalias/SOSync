export type AdminRole = "admin" | "operator" | "superadmin";
export type AppTab = "centers" | "dashboard" | "hotlines" | "reports" | "settings" | "status";
export type ReportStatus = "dismissed" | "new" | "resolved" | "reviewing";
export type AdminNotificationKind = "evacuation_center" | "hotline" | "support_report";

export type Bootstrap = {
  role: AdminRole;
  uid: string;
};

export type Hotline = {
  createdAt?: string;
  cityArea?: string;
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
  countryCode?: string;
  createdAt?: string;
  disabled?: boolean;
  islandGroup?: string;
  latitude: number;
  longitude: number;
  name: string;
  province?: string;
  region: string;
  regionCode?: string;
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
    previewStatus?: "missing" | "ready" | "unavailable";
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

export type AdminPermission = "manage_access" | "manage_centers" | "manage_hotlines" | "manage_reports" | "view_audit_logs";

export type AdminRoleRecord = {
  description: string;
  label: string;
  permissions: AdminPermission[];
  role: AdminRole;
  updatedAt?: string;
  updatedBy?: string;
  userCount?: number;
};

export type AdminAccessRecord = {
  email: string;
  lastSignInAt?: string;
  role: AdminRole;
  status: "active" | "disabled";
  uid: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type AuditLogRecord = {
  action: string;
  actorRole: AdminRole;
  actorUid: string;
  createdAt?: string;
  details?: Record<string, unknown>;
  logId: string;
  targetId: string;
  targetType: string;
};

export type AdminNotificationItem = {
  createdAt?: string;
  id: string;
  kind: AdminNotificationKind;
  message: string;
  sourceLabel: string;
  tab: AppTab;
  targetId: string;
  targetLabel: string;
  title: string;
};

export type AdminNotificationTarget = Pick<AdminNotificationItem, "kind" | "tab" | "targetId">;

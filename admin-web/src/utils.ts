import type { AdminRole, AppTab, EvacuationCenter, Hotline, SupportReport } from "./types";

export const roleCanEditContent = (role?: AdminRole) => role === "admin" || role === "operator" || role === "superadmin";
export const roleCanReviewReports = (role?: AdminRole) => role === "admin" || role === "superadmin";
export const roleCanManageAccess = (role?: AdminRole) => role === "superadmin";

export const getVisibleTabs = (role: AdminRole): AppTab[] => {
  const tabs: AppTab[] = ["dashboard"];
  if (roleCanEditContent(role)) {
    tabs.push("centers", "hotlines");
  }
  if (roleCanReviewReports(role)) {
    tabs.push("reports");
  }
  tabs.push("status", "settings");
  return tabs;
};

export const pageTitles: Record<AppTab, { eyebrow: string; subtitle: string; title: string }> = {
  centers: { eyebrow: "Operations", subtitle: "Manage safety hubs and evacuation site availability.", title: "Evacuation Centers" },
  dashboard: {
    eyebrow: "Overview",
    subtitle: "Welcome back. Here is what is happening in your SOSync admin workspace today.",
    title: "Dashboard",
  },
  hotlines: { eyebrow: "Operations", subtitle: "Manage emergency contacts visible to signed-in users.", title: "Hotlines" },
  reports: { eyebrow: "Review", subtitle: "Review support reports and update operational status.", title: "Support Reports" },
  settings: { eyebrow: "System", subtitle: "Adjust admin workspace preferences and presentation settings.", title: "Settings" },
  status: { eyebrow: "System", subtitle: "Monitor admin workspace health and Firebase-backed data status.", title: "System Status" },
};

export const formatDate = (value?: string) => {
  if (!value) {
    return "Unknown";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const formatRole = (role: AdminRole) =>
  role === "superadmin" ? "Super Admin" : role === "admin" ? "Admin" : "Operator";

export const matchesSearch = (values: Array<number | string | undefined>, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return values.some((value) => String(value ?? "").toLowerCase().includes(normalizedQuery));
};

export const filterHotlines = (hotlines: Hotline[], query: string) =>
  hotlines.filter((hotline) =>
    matchesSearch(
      [hotline.name, hotline.phone, hotline.cityArea, hotline.region, hotline.description, hotline.disabled ? "disabled" : "active"],
      query,
    ),
  );

export const filterCenters = (centers: EvacuationCenter[], query: string) =>
  centers.filter((center) =>
    matchesSearch(
      [
        center.name,
        center.address,
        center.city,
        center.region,
        center.contact,
        center.capacity,
        center.disabled ? "disabled" : "active",
      ],
      query,
    ),
  );

export const filterReports = (reports: SupportReport[], query: string) =>
  reports.filter((report) =>
    matchesSearch(
      [
        report.reportId,
        report.kind,
        report.status,
        report.category,
        report.message,
        report.submittedBy,
        report.deviceModel,
        report.appVersion,
      ],
      query,
    ),
  );

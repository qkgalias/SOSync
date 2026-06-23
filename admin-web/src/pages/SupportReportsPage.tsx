import { useEffect, useMemo, useRef, useState } from "react";

import { EmptyState } from "../components/Ui";
import { getAdminActionErrorMessage } from "../errors";
import { callAdminFunction } from "../firebase";
import type { ReportStatus, SupportReport } from "../types";
import { matchesSearch } from "../utils";

type AttentionLevel = "high" | "low" | "medium";
type AttachmentFilter = "all" | "with" | "without";
type DateFilter = "all" | "today" | "week" | "month";
type KindFilter = "all" | NonNullable<SupportReport["kind"]>;
type SortMode = "attention" | "newest" | "oldest";

const PAGE_SIZE = 7;
const statusOptions: Array<ReportStatus | "all"> = ["all", "new", "reviewing", "resolved", "dismissed"];
const kindOptions: KindFilter[] = ["all", "problem", "support"];
const attachmentOptions: AttachmentFilter[] = ["all", "with", "without"];
const dateOptions: DateFilter[] = ["all", "today", "week", "month"];
const sortOptions: SortMode[] = ["attention", "newest", "oldest"];
const highAttentionCategories = new Set(["crash or freeze", "sos alert failure", "notifications failure", "location issues"]);
const browserPreviewableImageTypes = new Set([
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
]);

const statusLabels: Record<ReportStatus, string> = {
  dismissed: "Closed",
  new: "Open",
  resolved: "Resolved",
  reviewing: "In Progress",
};

const kindLabels: Record<NonNullable<SupportReport["kind"]>, string> = {
  problem: "Bug / App Issue",
  support: "Support Request",
};

const statusTone = (status?: ReportStatus) => {
  if (status === "new") {
    return "danger" as const;
  }
  if (status === "reviewing") {
    return "warning" as const;
  }
  if (status === "resolved") {
    return "success" as const;
  }
  return "neutral" as const;
};

const attentionTone = (level: AttentionLevel) => {
  if (level === "high") {
    return "danger" as const;
  }
  if (level === "medium") {
    return "warning" as const;
  }
  return "neutral" as const;
};

const attentionLabel = (level: AttentionLevel) => level.charAt(0).toUpperCase() + level.slice(1);

const getStatus = (report: SupportReport): ReportStatus => report.status ?? "new";

const getKindLabel = (report: SupportReport) => (report.kind ? kindLabels[report.kind] : "Support Report");

const getCategoryLabel = (report: SupportReport) =>
  report.category ?? (report.kind === "problem" ? "Problem report" : "General support");

const getReportTitle = (report: SupportReport) => {
  if (report.category) {
    return report.category;
  }
  if (report.otherReason) {
    return report.otherReason;
  }
  return report.kind === "problem" ? "Problem report" : "Support request";
};

const getReportPreview = (report: SupportReport) => {
  const message = report.message?.trim() || "No message provided.";
  return message.length > 84 ? `${message.slice(0, 84)}...` : message;
};

const getShortReportId = (reportId: string) => `#${reportId.slice(-8).toUpperCase()}`;

const getShortReporterRef = (value?: string) => (value ? `${value.slice(0, 10)}...` : "Unknown reporter");

const hasResolvedReporterIdentity = (report: SupportReport) =>
  Boolean(report.reporterName || report.reporterEmail || report.reporterPhoneNumber);

const getReporterPrimary = (report: SupportReport) =>
  report.reporterEmail || report.reporterName || report.reporterPhoneNumber || getShortReporterRef(report.submittedBy);

const getReporterSecondary = (report: SupportReport) => {
  if (report.reporterEmail) {
    return report.reporterEmailVerified === true
      ? "Verified email"
      : report.reporterEmailVerified === false
        ? "Unverified email"
        : "Email on file";
  }
  if (report.reporterName) {
    return "Profile name";
  }
  if (report.reporterPhoneNumber) {
    return report.reporterPhoneNumber;
  }
  return report.submittedBy ? "Reporter ref" : "Reporter unavailable";
};

const getMediaPreviewType = (media: NonNullable<SupportReport["mediaFiles"]>[number]) => {
  if (media.previewType) {
    return media.previewType;
  }
  if (media.contentType?.startsWith("image/")) {
    return "image";
  }
  if (media.contentType?.startsWith("video/")) {
    return "video";
  }
  return "file";
};

const canBrowserPreviewImage = (contentType?: string) =>
  Boolean(contentType && browserPreviewableImageTypes.has(contentType.toLowerCase()));

const parseDate = (value?: string) => {
  if (!value) {
    return 0;
  }
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatReportDateTime = (value?: string) => {
  if (!value) {
    return { date: "Unknown date", time: "Unknown time" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "" };
  }

  return {
    date: date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
};

const formatReportTableTimestamp = (value?: string) => {
  if (!value) {
    return { date: "Unknown date", time: "Unknown time" };
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: value, time: "" };
  }

  return {
    date: date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }),
    time: date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
  };
};

const withinDateFilter = (report: SupportReport, filter: DateFilter) => {
  if (filter === "all") {
    return true;
  }

  const createdAt = parseDate(report.createdAt);
  if (!createdAt) {
    return false;
  }

  const now = new Date();
  const start = new Date(now);
  if (filter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (filter === "week") {
    start.setDate(now.getDate() - 7);
  } else {
    start.setMonth(now.getMonth() - 1);
  }

  return createdAt >= start.getTime();
};

const getAttentionLevel = (report: SupportReport): AttentionLevel => {
  const status = getStatus(report);
  if (report.kind !== "problem" || status === "resolved" || status === "dismissed") {
    return "low";
  }

  const normalizedCategory = (report.category ?? "").toLowerCase();
  if (status === "new" && highAttentionCategories.has(normalizedCategory)) {
    return "high";
  }

  return status === "new" || status === "reviewing" ? "medium" : "low";
};

const getAttentionWeight = (report: SupportReport) => {
  const level = getAttentionLevel(report);
  if (level === "high") {
    return 3;
  }
  if (level === "medium") {
    return 2;
  }
  return 1;
};

const sortReports = (reports: SupportReport[], sortMode: SortMode) =>
  [...reports].sort((left, right) => {
    const leftDate = parseDate(left.createdAt);
    const rightDate = parseDate(right.createdAt);
    if (sortMode === "oldest") {
      return leftDate - rightDate;
    }
    if (sortMode === "attention") {
      const attentionDifference = getAttentionWeight(right) - getAttentionWeight(left);
      if (attentionDifference !== 0) {
        return attentionDifference;
      }
    }
    return rightDate - leftDate;
  });

const copyText = async (value: string) => {
  if (!navigator.clipboard) {
    return;
  }
  await navigator.clipboard.writeText(value);
};

export function SupportReportsPage({
  notificationTargetId,
  onConsumeNotificationTarget,
  onRefresh,
  reports,
}: {
  notificationTargetId: string;
  onConsumeNotificationTarget: (unavailableMessage?: string) => void;
  onRefresh: () => Promise<void>;
  reports: SupportReport[];
}) {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "all">("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [attachmentFilter, setAttachmentFilter] = useState<AttachmentFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("attention");
  const [query, setQuery] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyReportId, setBusyReportId] = useState("");
  const [deleteTargetReport, setDeleteTargetReport] = useState<SupportReport | null>(null);
  const [isReportDetailLoading, setIsReportDetailLoading] = useState(false);
  const [reportDetail, setReportDetail] = useState<SupportReport | null>(null);
  const [reportDetailError, setReportDetailError] = useState("");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [page, setPage] = useState(1);
  const detailRequestIdRef = useRef(0);

  const categories = useMemo(
    () => Array.from(new Set(reports.map((report) => report.category).filter(Boolean) as string[])).sort(),
    [reports],
  );
  const [categoryFilter, setCategoryFilter] = useState("all");

  const summary = useMemo(
    () => ({
      attached: reports.filter((report) => Boolean(report.mediaFiles?.length)).length,
      dismissed: reports.filter((report) => getStatus(report) === "dismissed").length,
      new: reports.filter((report) => getStatus(report) === "new").length,
      resolved: reports.filter((report) => getStatus(report) === "resolved").length,
      reviewing: reports.filter((report) => getStatus(report) === "reviewing").length,
      total: reports.length,
    }),
    [reports],
  );

  const visibleReports = useMemo(() => {
    const filtered = reports.filter((report) => {
      const hasMedia = Boolean(report.mediaFiles?.length);
      const matchesAttachment =
        attachmentFilter === "all" || (attachmentFilter === "with" ? hasMedia : !hasMedia);
      return (
        (statusFilter === "all" || getStatus(report) === statusFilter) &&
        (kindFilter === "all" || report.kind === kindFilter) &&
        (categoryFilter === "all" || report.category === categoryFilter) &&
        matchesAttachment &&
        withinDateFilter(report, dateFilter) &&
        matchesSearch(
          [
            report.reportId,
            getShortReportId(report.reportId),
            report.kind,
            getKindLabel(report),
            getStatus(report),
            statusLabels[getStatus(report)],
            report.category,
            report.message,
            report.otherReason,
            report.submittedBy,
            report.reporterName,
            report.reporterEmail,
            report.reporterPhoneNumber,
            report.deviceModel,
            report.appVersion,
            report.buildLabel,
          ],
          query,
        )
      );
    });
    return sortReports(filtered, sortMode);
  }, [attachmentFilter, categoryFilter, dateFilter, kindFilter, query, reports, sortMode, statusFilter]);

  const selectedListReport = useMemo(
    () => reports.find((report) => report.reportId === selectedReportId) ?? null,
    [reports, selectedReportId],
  );
  const selectedReport = reportDetail?.reportId === selectedReportId ? reportDetail : selectedListReport;

  const pageCount = Math.max(1, Math.ceil(visibleReports.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedReports = visibleReports.slice(pageStart, pageStart + PAGE_SIZE);
  const showingStart = visibleReports.length ? pageStart + 1 : 0;
  const showingEnd = Math.min(pageStart + paginatedReports.length, visibleReports.length);

  useEffect(() => {
    setPage(1);
  }, [attachmentFilter, categoryFilter, dateFilter, kindFilter, query, sortMode, statusFilter]);

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  const resetFilters = () => {
    setAttachmentFilter("all");
    setCategoryFilter("all");
    setDateFilter("all");
    setKindFilter("all");
    setQuery("");
    setSortMode("attention");
    setStatusFilter("all");
  };

  const updateStatus = async (reportId: string, status: ReportStatus) => {
    setActionError("");
    setBusyReportId(reportId);
    try {
      await callAdminFunction<{ reportId: string; status: ReportStatus }, { success: true }>("updateSupportReportStatus", {
        reportId,
        status,
      });
      setReportDetail((current) => current?.reportId === reportId ? { ...current, status } : current);
      await onRefresh();
    } catch (nextError) {
      setActionError(getAdminActionErrorMessage(nextError, "Unable to update this report status. Try again."));
    } finally {
      setBusyReportId("");
    }
  };

  const loadReportDetail = async (reportId: string) => {
    const requestId = detailRequestIdRef.current + 1;
    detailRequestIdRef.current = requestId;
    setIsReportDetailLoading(true);
    setReportDetailError("");
    try {
      const result = await callAdminFunction<{ reportId: string }, { report: SupportReport }>("getSupportReport", { reportId });
      if (detailRequestIdRef.current === requestId) {
        setReportDetail(result.report);
      }
    } catch (nextError) {
      if (detailRequestIdRef.current === requestId) {
        setReportDetailError(getAdminActionErrorMessage(nextError, "Unable to load secure attachment previews. Try again."));
      }
    } finally {
      if (detailRequestIdRef.current === requestId) {
        setIsReportDetailLoading(false);
      }
    }
  };

  const openReportDetail = (reportId: string) => {
    setSelectedReportId(reportId);
    setReportDetail(null);
    void loadReportDetail(reportId);
  };

  useEffect(() => {
    if (!notificationTargetId) return;
    const report = reports.find((item) => item.reportId === notificationTargetId);
    if (!report) {
      onConsumeNotificationTarget("This support report is no longer available.");
      return;
    }
    openReportDetail(report.reportId);
    onConsumeNotificationTarget();
  }, [notificationTargetId, onConsumeNotificationTarget, reports]);

  const closeReportDetail = () => {
    detailRequestIdRef.current += 1;
    setSelectedReportId("");
    setReportDetail(null);
    setReportDetailError("");
    setIsReportDetailLoading(false);
  };

  const deleteReport = async (reportId: string) => {
    setActionError("");
    setBusyReportId(reportId);
    try {
      await callAdminFunction<{ reportId: string }, { success: true }>("deleteSupportReport", { reportId });
      if (selectedReportId === reportId) {
        closeReportDetail();
      }
      setDeleteTargetReport(null);
      await onRefresh();
    } catch (nextError) {
      setDeleteTargetReport(null);
      setActionError(getAdminActionErrorMessage(nextError, "Unable to delete this support report. Try again."));
    } finally {
      setBusyReportId("");
    }
  };

  return (
    <div className="reports-console">
      <section className="report-summary-grid" aria-label="Support report summary">
        <ReportSummaryCard detail="All submitted reports" icon="clipboard" label="Total Reports" tone="neutral" value={summary.total} />
        <ReportSummaryCard detail="Needs first review" icon="alert" label="Open" tone="danger" value={summary.new} />
        <ReportSummaryCard detail="Being handled" icon="message" label="In Progress" tone="warning" value={summary.reviewing} />
        <ReportSummaryCard detail="Completed" icon="check" label="Resolved" tone="success" value={summary.resolved} />
        <ReportSummaryCard detail="Closed or archived" icon="archive" label="Closed" tone="neutral" value={summary.dismissed} />
        <ReportSummaryCard detail="With screenshots/video" icon="paperclip" label="Attachments" tone="warning" value={summary.attached} />
      </section>

      <section className="reports-table-card">
        <div className="reports-toolbar" aria-label="Support report filters">
          <label className="report-search">
            <span>Search reports</span>
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by ID, reporter, email, phone, category, message..."
              type="search"
              value={query}
            />
          </label>
          <select onChange={(event) => setStatusFilter(event.target.value as ReportStatus | "all")} value={statusFilter}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : statusLabels[status]}
              </option>
            ))}
          </select>
          <select onChange={(event) => setKindFilter(event.target.value as KindFilter)} value={kindFilter}>
            {kindOptions.map((kind) => (
              <option key={kind} value={kind}>
                {kind === "all" ? "All report types" : kindLabels[kind]}
              </option>
            ))}
          </select>
          <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <select onChange={(event) => setDateFilter(event.target.value as DateFilter)} value={dateFilter}>
            {dateOptions.map((dateOption) => (
              <option key={dateOption} value={dateOption}>
                {dateOption === "all" ? "Any date" : dateOption === "today" ? "Today" : `Last ${dateOption}`}
              </option>
            ))}
          </select>
          <select
            onChange={(event) => setAttachmentFilter(event.target.value as AttachmentFilter)}
            value={attachmentFilter}
          >
            {attachmentOptions.map((attachmentOption) => (
              <option key={attachmentOption} value={attachmentOption}>
                {attachmentOption === "all"
                  ? "Any attachment"
                  : attachmentOption === "with"
                    ? "With attachment"
                    : "No attachment"}
              </option>
            ))}
          </select>
          <select onChange={(event) => setSortMode(event.target.value as SortMode)} value={sortMode}>
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {option === "attention" ? "Needs attention" : option === "newest" ? "Newest first" : "Oldest first"}
              </option>
            ))}
          </select>
          <button className="report-reset-button" onClick={resetFilters} type="button">
            Reset
          </button>
        </div>

        {actionError ? <p className="inline-form-error">{actionError}</p> : null}

        {visibleReports.length ? (
          <>
            <div className="reports-table-wrap">
              <table className="reports-table">
                <colgroup>
                  <col className="reports-col-report" />
                  <col className="reports-col-reporter" />
                  <col className="reports-col-type" />
                  <col className="reports-col-status" />
                  <col className="reports-col-attention" />
                  <col className="reports-col-submitted" />
                  <col className="reports-col-app" />
                  <col className="reports-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Reporter</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Attention</th>
                    <th>Submitted</th>
                    <th>App / Device</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedReports.map((report) => {
                    const status = getStatus(report);
                    const attention = getAttentionLevel(report);
                    const submittedAt = formatReportTableTimestamp(report.createdAt);
                    return (
                      <tr key={report.reportId}>
                        <td className="report-title-cell">
                          <strong>{getReportTitle(report)}</strong>
                          <span>{getReportPreview(report)}</span>
                          <small>
                            {getShortReportId(report.reportId)}
                            {report.mediaFiles?.length ? ` · ${report.mediaFiles.length} attachment(s)` : ""}
                          </small>
                        </td>
                        <td>
                          <strong className="report-user-id">{getReporterPrimary(report)}</strong>
                          <span>{getReporterSecondary(report)}</span>
                        </td>
                        <td>
                          <strong>{getKindLabel(report)}</strong>
                          <span>{getCategoryLabel(report)}</span>
                        </td>
                        <td>
                          <StatusText tone={statusTone(status)} value={statusLabels[status]} />
                        </td>
                        <td>
                          <StatusText tone={attentionTone(attention)} value={attentionLabel(attention)} />
                        </td>
                        <td className="report-date-cell">
                          <strong>{submittedAt.date}</strong>
                          <span>{submittedAt.time}</span>
                        </td>
                        <td>
                          <strong>{report.appVersion ?? "unknown"} / {report.buildLabel ?? "unknown"}</strong>
                          <span>{report.deviceModel ?? "Unknown device"}</span>
                        </td>
                        <td>
                          <div className="report-row-actions">
                            <button onClick={() => openReportDetail(report.reportId)} type="button">
                              View
                            </button>
                            <select
                              aria-label={`Update ${getShortReportId(report.reportId)} status`}
                              disabled={busyReportId === report.reportId}
                              onChange={(event) => void updateStatus(report.reportId, event.target.value as ReportStatus)}
                              value={status}
                            >
                              <option value="new">Open</option>
                              <option value="reviewing">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="dismissed">Closed</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <EmptyState message="No support reports match the current filters." />
        )}

        <footer className="reports-pagination hotlines-pagination">
          <span>
            Showing {showingStart} to {showingEnd} of {visibleReports.length} reports
          </span>
          <div>
            <button disabled={safePage <= 1} onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))} type="button">
              ‹
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={pageNumber === safePage ? "active" : ""}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button
              disabled={safePage >= pageCount}
              onClick={() => setPage((currentPage) => Math.min(pageCount, currentPage + 1))}
              type="button"
            >
              ›
            </button>
          </div>
        </footer>
      </section>

      {selectedReport ? (
        <ReportDetailModal
          busyReportId={busyReportId}
          isLoading={isReportDetailLoading}
          mediaError={reportDetailError}
          onClose={closeReportDetail}
          onDeleteRequest={setDeleteTargetReport}
          onRetryMedia={() => loadReportDetail(selectedReport.reportId)}
          onStatusChange={updateStatus}
          report={selectedReport}
        />
      ) : null}

      {deleteTargetReport ? (
        <DeleteReportConfirmationModal
          busy={busyReportId === deleteTargetReport.reportId}
          onCancel={() => setDeleteTargetReport(null)}
          onConfirm={() => void deleteReport(deleteTargetReport.reportId)}
          report={deleteTargetReport}
        />
      ) : null}
    </div>
  );
}

function ReportSummaryCard({
  detail,
  icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: "alert" | "archive" | "check" | "clipboard" | "message" | "paperclip";
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: number;
}) {
  return (
    <article className={`report-summary-card report-summary-card--${tone}`}>
      <span aria-hidden="true" className={`report-summary-card__icon report-summary-card__icon--${icon}`} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function StatusText({
  tone = "neutral",
  value,
}: {
  tone?: "danger" | "neutral" | "success" | "warning";
  value: string;
}) {
  return <span className={`status-text status-text--${tone}`}>{value}</span>;
}

function ReportDetailModal({
  busyReportId,
  isLoading,
  mediaError,
  onClose,
  onDeleteRequest,
  onRetryMedia,
  onStatusChange,
  report,
}: {
  busyReportId: string;
  isLoading: boolean;
  mediaError: string;
  onClose: () => void;
  onDeleteRequest: (report: SupportReport) => void;
  onRetryMedia: () => Promise<void>;
  onStatusChange: (reportId: string, status: ReportStatus) => Promise<void>;
  report: SupportReport;
}) {
  const status = getStatus(report);
  const attention = getAttentionLevel(report);
  const createdAt = formatReportDateTime(report.createdAt);
  const updatedAt = formatReportDateTime(report.updatedAt);
  const mediaFiles = report.mediaFiles ?? [];
  const [activeMediaIndex, setActiveMediaIndex] = useState<number | null>(null);
  const [failedMediaKeys, setFailedMediaKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setActiveMediaIndex(null);
    setFailedMediaKeys(new Set());
  }, [report.reportId, report.mediaFiles]);

  const markMediaFailed = (key: string) => {
    setFailedMediaKeys((current) => new Set(current).add(key));
  };

  const retryMedia = async () => {
    setFailedMediaKeys(new Set());
    await onRetryMedia();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-card report-detail-modal" role="dialog">
        <header className="modal-card__header">
          <div>
            <span className="report-modal-eyebrow">{getShortReportId(report.reportId)}</span>
            <h3>{getReportTitle(report)}</h3>
          </div>
          <button className="icon-button" onClick={onClose} type="button">
            x
          </button>
        </header>

        <div className="report-detail-status-row">
          <StatusText tone={statusTone(status)} value={statusLabels[status]} />
          <StatusText tone={attentionTone(attention)} value={`${attentionLabel(attention)} attention`} />
          <span>{getKindLabel(report)}</span>
        </div>

        <div className="report-copy-row">
          <code>{report.reportId}</code>
          <button onClick={() => void copyText(report.reportId)} type="button">
            Copy report ID
          </button>
        </div>

        <section className="report-detail-message">
          <h4>Report message</h4>
          <p>{report.message || "No message provided."}</p>
          {report.otherReason ? <p><strong>Other reason:</strong> {report.otherReason}</p> : null}
        </section>

        <dl className="report-detail-grid">
          <div>
            <dt>Reporter</dt>
            <dd>
              <strong>{getReporterPrimary(report)}</strong>
              <span>{getReporterSecondary(report)}</span>
            </dd>
          </div>
          {hasResolvedReporterIdentity(report) ? null : (
            <div>
              <dt>Reporter reference</dt>
              <dd>{report.submittedBy ?? "No reporter reference"}</dd>
            </div>
          )}
          <div>
            <dt>Category</dt>
            <dd>{getCategoryLabel(report)}</dd>
          </div>
          <div>
            <dt>App / build</dt>
            <dd>{report.appVersion ?? "unknown"} / {report.buildLabel ?? "unknown"}</dd>
          </div>
          <div>
            <dt>Device</dt>
            <dd>{report.deviceModel ?? "Unknown device"}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>
              <strong>{createdAt.date}</strong>
              <span>{createdAt.time}</span>
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>
              <strong>{updatedAt.date}</strong>
              <span>{updatedAt.time}</span>
            </dd>
          </div>
        </dl>

        <section className="report-media-panel">
          <div className="report-media-panel__heading">
            <h4>Attachments</h4>
            {!isLoading && (mediaError || mediaFiles.some((media) => media.previewStatus === "unavailable")) ? (
              <button onClick={() => void retryMedia()} type="button">Retry previews</button>
            ) : null}
          </div>
          {isLoading ? (
            <p className="report-media-state">Loading secure previews...</p>
          ) : mediaError ? (
            <div className="report-media-error" role="alert">
              <span>{mediaError}</span>
              <button onClick={() => void retryMedia()} type="button">Retry preview</button>
            </div>
          ) : mediaFiles.length ? (
            <ul className="report-media-list">
              {mediaFiles.map((media, mediaIndex) => {
                const previewType = getMediaPreviewType(media);
                const mediaKey = media.storagePath ?? media.downloadUrl ?? media.fileName ?? `attachment-${mediaIndex}`;
                const previewFailed = failedMediaKeys.has(mediaKey);
                const canPreviewImage = previewType === "image" && canBrowserPreviewImage(media.contentType);
                const canOpenViewer = Boolean(media.downloadUrl && (canPreviewImage || previewType === "video"));
                return (
                  <li key={mediaKey}>
                    <button
                      aria-label={canOpenViewer ? `Enlarge ${media.fileName ?? "attachment"}` : undefined}
                      className="report-media-preview report-media-preview-button"
                      disabled={!canOpenViewer || previewFailed}
                      onClick={() => setActiveMediaIndex(mediaIndex)}
                      type="button"
                    >
                      {canPreviewImage && media.downloadUrl && !previewFailed ? (
                        <img
                          alt={media.fileName ?? "Support report attachment"}
                          onError={() => markMediaFailed(mediaKey)}
                          src={media.downloadUrl}
                        />
                      ) : previewType === "video" && media.downloadUrl && !previewFailed ? (
                        <video muted onError={() => markMediaFailed(mediaKey)} preload="metadata" src={media.downloadUrl} />
                      ) : media.previewStatus === "missing" ? (
                        <span>File missing from Storage</span>
                      ) : previewFailed ? (
                        <span>Preview expired or failed</span>
                      ) : previewType === "image" && !canPreviewImage && media.downloadUrl ? (
                        <span>This image format cannot be previewed in this browser</span>
                      ) : (
                        <span>Secure preview unavailable</span>
                      )}
                    </button>
                    <div className="report-media-meta">
                      <strong>{media.fileName ?? "Attachment"}</strong>
                      <span>{media.contentType ?? "Unknown type"}</span>
                      <code>{media.storagePath ?? "No storage path"}</code>
                    </div>
                    <div className="report-media-actions">
                      {canOpenViewer ? (
                        <button onClick={() => setActiveMediaIndex(mediaIndex)} type="button">View full screen</button>
                      ) : media.downloadUrl ? (
                        <a download={media.fileName} href={media.downloadUrl} rel="noreferrer" target="_blank">
                          Download original
                        </a>
                      ) : previewFailed || media.previewStatus === "unavailable" ? (
                        <button onClick={() => void retryMedia()} type="button">Retry preview</button>
                      ) : null}
                      {media.storagePath ? (
                        <button onClick={() => void copyText(media.storagePath ?? "")} type="button">
                          Copy path
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted">No screenshots or videos were attached to this report.</p>
          )}
        </section>

        {activeMediaIndex !== null && mediaFiles[activeMediaIndex] ? (
          <AttachmentViewer
            activeIndex={activeMediaIndex}
            mediaFiles={mediaFiles}
            onChange={setActiveMediaIndex}
            onClose={() => setActiveMediaIndex(null)}
            onPreviewError={() => {
              const activeMedia = mediaFiles[activeMediaIndex];
              if (activeMedia) {
                markMediaFailed(
                  activeMedia.storagePath ?? activeMedia.downloadUrl ?? activeMedia.fileName ?? `attachment-${activeMediaIndex}`,
                );
              }
              setActiveMediaIndex(null);
            }}
          />
        ) : null}

        <div className="report-detail-actions">
          <button
            className="danger-outline-button report-detail-delete-button"
            disabled={busyReportId === report.reportId}
            onClick={() => onDeleteRequest(report)}
            type="button"
          >
            Delete report
          </button>
          <select
            disabled={busyReportId === report.reportId}
            onChange={(event) => void onStatusChange(report.reportId, event.target.value as ReportStatus)}
            value={status}
          >
            <option value="new">Open</option>
            <option value="reviewing">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Closed</option>
          </select>
          <button className="primary-button" onClick={onClose} type="button">
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

function AttachmentViewer({
  activeIndex,
  mediaFiles,
  onChange,
  onClose,
  onPreviewError,
}: {
  activeIndex: number;
  mediaFiles: NonNullable<SupportReport["mediaFiles"]>;
  onChange: (index: number) => void;
  onClose: () => void;
  onPreviewError: () => void;
}) {
  const media = mediaFiles[activeIndex];
  const previewType = getMediaPreviewType(media);
  const canPreviewImage = previewType === "image" && canBrowserPreviewImage(media.contentType);
  const hasMultiple = mediaFiles.length > 1;
  const showPrevious = () => onChange((activeIndex - 1 + mediaFiles.length) % mediaFiles.length);
  const showNext = () => onChange((activeIndex + 1) % mediaFiles.length);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowLeft" && hasMultiple) {
        showPrevious();
      } else if (event.key === "ArrowRight" && hasMultiple) {
        showNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, hasMultiple, mediaFiles.length, onClose]);

  return (
    <div
      className="report-media-viewer-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={`Attachment ${activeIndex + 1} of ${mediaFiles.length}`}
        aria-modal="true"
        className="report-media-viewer"
        role="dialog"
      >
        <header>
          <div>
            <strong>{media.fileName ?? "Support report attachment"}</strong>
            <span>{activeIndex + 1} of {mediaFiles.length}</span>
          </div>
          <button aria-label="Close attachment viewer" className="icon-button" onClick={onClose} type="button">x</button>
        </header>

        <div className="report-media-viewer__stage">
          {canPreviewImage && media.downloadUrl ? (
            <img alt={media.fileName ?? "Support report attachment"} onError={onPreviewError} src={media.downloadUrl} />
          ) : previewType === "video" && media.downloadUrl ? (
            <video autoPlay controls onError={onPreviewError} preload="metadata" src={media.downloadUrl} />
          ) : (
            <div className="report-media-viewer__unsupported">
              <strong>Preview is not supported for this file format.</strong>
              <span>{media.contentType ?? "Unknown file type"}</span>
              {media.downloadUrl ? (
                <a download={media.fileName} href={media.downloadUrl} rel="noreferrer" target="_blank">
                  Download original
                </a>
              ) : null}
            </div>
          )}
        </div>

        <footer>
          <button disabled={!hasMultiple} onClick={showPrevious} type="button">Previous</button>
          <span>{media.contentType ?? "Unknown type"}</span>
          <button disabled={!hasMultiple} onClick={showNext} type="button">Next</button>
        </footer>
      </section>
    </div>
  );
}

function DeleteReportConfirmationModal({
  busy,
  onCancel,
  onConfirm,
  report,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  report: SupportReport;
}) {
  const attachmentCount = report.mediaFiles?.length ?? 0;

  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-labelledby="delete-support-report-title" aria-modal="true" className="modal-card" role="dialog">
        <header className="modal-card__header">
          <h3 id="delete-support-report-title">Delete support report?</h3>
          <button className="icon-button" disabled={busy} onClick={onCancel} type="button">
            x
          </button>
        </header>
        <div className="confirmation-modal">
          <p>
            This will permanently delete the ticket
            {" "}
            <strong>{getShortReportId(report.reportId)}</strong>
            {attachmentCount ? ` and ${attachmentCount} attached file${attachmentCount === 1 ? "" : "s"}` : ""}.
          </p>
          <p>This action cannot be undone.</p>
          <div className="modal-actions">
            <button disabled={busy} onClick={onCancel} type="button">
              Cancel
            </button>
            <button className="danger-button" disabled={busy} onClick={onConfirm} type="button">
              {busy ? "Deleting..." : "Delete report"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

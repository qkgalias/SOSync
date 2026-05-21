import { useEffect, useMemo, useState } from "react";

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
  onRefresh,
  reports,
}: {
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
  const [selectedReportId, setSelectedReportId] = useState("");
  const [page, setPage] = useState(1);

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

  const selectedReport = useMemo(
    () => reports.find((report) => report.reportId === selectedReportId) ?? null,
    [reports, selectedReportId],
  );

  const pageCount = Math.max(1, Math.ceil(visibleReports.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedReports = visibleReports.slice(pageStart, pageStart + PAGE_SIZE);
  const showingStart = visibleReports.length ? pageStart + 1 : 0;
  const showingEnd = Math.min(pageStart + paginatedReports.length, visibleReports.length);

  useEffect(() => {
    setPage(1);
  }, [attachmentFilter, categoryFilter, dateFilter, kindFilter, query, sortMode, statusFilter]);

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
      await onRefresh();
    } catch (nextError) {
      setActionError(getAdminActionErrorMessage(nextError, "Unable to update this report status. Try again."));
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
                            <button onClick={() => setSelectedReportId(report.reportId)} type="button">
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
          onClose={() => setSelectedReportId("")}
          onStatusChange={updateStatus}
          report={selectedReport}
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
  onClose,
  onStatusChange,
  report,
}: {
  busyReportId: string;
  onClose: () => void;
  onStatusChange: (reportId: string, status: ReportStatus) => Promise<void>;
  report: SupportReport;
}) {
  const status = getStatus(report);
  const attention = getAttentionLevel(report);
  const createdAt = formatReportDateTime(report.createdAt);
  const updatedAt = formatReportDateTime(report.updatedAt);

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
          <h4>Attachments</h4>
          {report.mediaFiles?.length ? (
            <ul className="report-media-list">
              {report.mediaFiles.map((media) => {
                const previewType = getMediaPreviewType(media);
                const mediaKey = media.storagePath ?? media.downloadUrl ?? media.fileName;
                return (
                  <li key={mediaKey}>
                    <div className="report-media-preview">
                      {previewType === "image" && media.downloadUrl ? (
                        <img alt={media.fileName ?? "Support report attachment"} src={media.downloadUrl} />
                      ) : previewType === "video" && media.downloadUrl ? (
                        <video controls preload="metadata" src={media.downloadUrl} />
                      ) : (
                        <span>Preview unavailable</span>
                      )}
                    </div>
                    <div className="report-media-meta">
                      <strong>{media.fileName ?? "Attachment"}</strong>
                      <span>{media.contentType ?? "Unknown type"}</span>
                      <code>{media.storagePath ?? "No storage path"}</code>
                    </div>
                    <div className="report-media-actions">
                      {media.downloadUrl ? (
                        <a href={media.downloadUrl} rel="noreferrer" target="_blank">
                          Open media
                        </a>
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

        <div className="report-detail-actions">
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

import type { CSSProperties, ReactNode } from "react";

import { GoogleMapPanel } from "../components/GoogleMapPanel";
import { Card, EmptyState, StatusBadge } from "../components/Ui";
import type { AdminRole, AppTab, EvacuationCenter, Hotline, ReportStatus, SupportReport } from "../types";
import { formatDate, getVisibleTabs } from "../utils";

type ReportBucket = {
  color: string;
  count: number;
  label: string;
  percent: number;
};

const statusTone: Record<ReportStatus, "danger" | "neutral" | "success" | "warning"> = {
  dismissed: "neutral",
  new: "danger",
  resolved: "success",
  reviewing: "warning",
};

function reportTimeValue(report: SupportReport) {
  const value = report.updatedAt ?? report.createdAt;
  if (!value) {
    return 0;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function percent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
}

function DashboardAction({
  children,
  isAllowed,
  onClick,
}: {
  children: string;
  isAllowed: boolean;
  onClick: () => void;
}) {
  if (!isAllowed) {
    return (
      <button className="dashboard-action dashboard-action--disabled" disabled type="button">
        Restricted by role
      </button>
    );
  }

  return (
    <button className="dashboard-action" onClick={onClick} type="button">
      {children}
      <span aria-hidden="true">{"->"}</span>
    </button>
  );
}

function KpiCard({
  detail,
  icon,
  label,
  tone,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  tone: "danger" | "neutral" | "success" | "warning";
  value: number | string;
}) {
  return (
    <article className={`dashboard-kpi dashboard-kpi--${tone}`}>
      <div className="dashboard-kpi__main">
        <span className="dashboard-kpi__icon" aria-hidden="true">
          {icon}
        </span>
        <div className="dashboard-kpi__content">
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{detail}</small>
        </div>
      </div>
    </article>
  );
}

function DashboardKpiIcon({ type }: { type: "centers" | "hotlines" | "reports" | "status" }) {
  if (type === "reports") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
        <path d="M14 2v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h4" />
        <path d="M9 9h1" />
      </svg>
    );
  }
  if (type === "centers") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M3 11 12 3l9 8" />
        <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
        <path d="M9 21v-7h6v7" />
        <path d="M15.5 6.5v-2h2v3.8" />
      </svg>
    );
  }
  if (type === "hotlines") {
    return (
      <svg viewBox="0 0 24 24">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.7 2.5a2 2 0 0 1-.4 2.1L8.1 9.6a16 16 0 0 0 6.3 6.3l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.6.6 2.5.7a2 2 0 0 1 1.7 2z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20 13c0 5-3.5 7.5-7.7 8.9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .7-1l7-2.5a1 1 0 0 1 .6 0l7 2.5a1 1 0 0 1 .7 1z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function DashboardPage({
  centers,
  hotlines,
  onNavigate,
  reports,
  role,
}: {
  centers: EvacuationCenter[];
  hotlines: Hotline[];
  onNavigate: (tab: AppTab) => void;
  reports: SupportReport[];
  role: AdminRole;
}) {
  const visibleTabs = getVisibleTabs(role);
  const canOpen = (tab: AppTab) => visibleTabs.includes(tab);
  const activeCenters = centers.filter((center) => !center.disabled);
  const disabledCenters = centers.filter((center) => center.disabled);
  const activeHotlines = hotlines.filter((hotline) => !hotline.disabled);
  const recentReports = [...reports].sort((first, second) => reportTimeValue(second) - reportTimeValue(first)).slice(0, 5);

  const newReports = reports.filter((report) => (report.status ?? "new") === "new");
  const reviewingReports = reports.filter((report) => report.status === "reviewing");
  const resolvedReports = reports.filter((report) => report.status === "resolved");
  const dismissedReports = reports.filter((report) => report.status === "dismissed");
  const reportBuckets: ReportBucket[] = [
    { color: "var(--danger)", count: newReports.length, label: "Open", percent: percent(newReports.length, reports.length) },
    {
      color: "#f97316",
      count: reviewingReports.length,
      label: "In Progress",
      percent: percent(reviewingReports.length, reports.length),
    },
    { color: "var(--success)", count: resolvedReports.length, label: "Resolved", percent: percent(resolvedReports.length, reports.length) },
    {
      color: "var(--muted-2)",
      count: dismissedReports.length,
      label: "Closed",
      percent: percent(dismissedReports.length, reports.length),
    },
  ];

  const donutStyle = {
    "--report-donut": reports.length
      ? `conic-gradient(var(--danger) 0 ${reportBuckets[0].percent}%, #f97316 ${reportBuckets[0].percent}% ${
          reportBuckets[0].percent + reportBuckets[1].percent
        }%, var(--success) ${reportBuckets[0].percent + reportBuckets[1].percent}% ${
          reportBuckets[0].percent + reportBuckets[1].percent + reportBuckets[2].percent
        }%, var(--muted-2) ${reportBuckets[0].percent + reportBuckets[1].percent + reportBuckets[2].percent}% 100%)`
      : `conic-gradient(var(--line) 0 100%)`,
  } as CSSProperties;

  return (
    <div className="dashboard-overview">
      <section className="dashboard-kpis" aria-label="Admin overview metrics">
        <KpiCard
          detail={`${newReports.length} new reports`}
          icon={<DashboardKpiIcon type="reports" />}
          label="Support Reports"
          tone="danger"
          value={reports.length}
        />
        <KpiCard
          detail={`${activeCenters.length} available`}
          icon={<DashboardKpiIcon type="centers" />}
          label="Evacuation Centers"
          tone="warning"
          value={activeCenters.length}
        />
        <KpiCard
          detail={`${activeHotlines.length} active contacts`}
          icon={<DashboardKpiIcon type="hotlines" />}
          label="Hotlines"
          tone="success"
          value={activeHotlines.length}
        />
        <KpiCard
          detail="All systems operational"
          icon={<DashboardKpiIcon type="status" />}
          label="System Status"
          tone="neutral"
          value="Live"
        />
      </section>

      <section className="dashboard-panels">
        <Card className="dashboard-panel dashboard-panel--wide">
          <div className="card-heading">
            <div>
              <h3>Support reports overview</h3>
              <p>Application-related reports by current review status.</p>
            </div>
            <DashboardAction isAllowed={canOpen("reports")} onClick={() => onNavigate("reports")}>View all reports</DashboardAction>
          </div>
          <div className="report-overview">
            <div className="report-donut" style={donutStyle}>
              <strong>{reports.length}</strong>
              <span>Total</span>
            </div>
            <div className="report-breakdown">
              {reportBuckets.map((bucket) => (
                <div className="breakdown-row" key={bucket.label}>
                  <span>
                    <i style={{ background: bucket.color }} />
                    {bucket.label}
                  </span>
                  <strong>{bucket.count}</strong>
                  <small>{bucket.percent}%</small>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="dashboard-panel">
          <div className="card-heading">
            <div>
              <h3>Evacuation center status</h3>
              <p>Current center availability snapshot.</p>
            </div>
            <DashboardAction isAllowed={canOpen("centers")} onClick={() => onNavigate("centers")}>View all centers</DashboardAction>
          </div>
          <div className="center-status-layout">
            <GoogleMapPanel centers={centers} compact variant="dashboard" />
            <div className="status-summary">
              <div>
                <span><i className="legend-dot legend-dot--green" />Available</span>
                <strong>{activeCenters.length}</strong>
                <small>{percent(activeCenters.length, centers.length)}%</small>
              </div>
              <div>
                <span><i className="legend-dot legend-dot--gray" />Disabled</span>
                <strong>{disabledCenters.length}</strong>
                <small>{percent(disabledCenters.length, centers.length)}%</small>
              </div>
              <div className="status-summary__total">
                <span>Total centers</span>
                <strong>{centers.length}</strong>
              </div>
            </div>
          </div>
        </Card>

        <Card className="dashboard-panel dashboard-panel--wide">
          <div className="card-heading">
            <div>
              <h3>Recent support reports</h3>
              <p>Latest application-related support reports.</p>
            </div>
            <DashboardAction isAllowed={canOpen("reports")} onClick={() => onNavigate("reports")}>View all reports</DashboardAction>
          </div>
          {recentReports.length ? (
            <div className="recent-report-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.map((report) => {
                    const status = report.status ?? "new";
                    const subject = report.message || report.otherReason || "No message provided";
                    return (
                      <tr key={report.reportId}>
                        <td>
                          <strong>#{report.reportId.slice(-8).toUpperCase()}</strong>
                        </td>
                        <td>{subject.length > 64 ? `${subject.slice(0, 64)}...` : subject}</td>
                        <td>{report.category ?? (report.kind === "problem" ? "Problem report" : "Support request")}</td>
                        <td><StatusBadge tone={statusTone[status]} value={status} /></td>
                        <td>{formatDate(report.updatedAt ?? report.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState message="No support reports match the current view." />
          )}
        </Card>

        <Card className="dashboard-panel">
          <div className="card-heading">
            <div>
              <h3>Hotline coverage</h3>
              <p>Emergency contacts available to signed-in users.</p>
            </div>
            <DashboardAction isAllowed={canOpen("hotlines")} onClick={() => onNavigate("hotlines")}>View all hotlines</DashboardAction>
          </div>
          {activeHotlines.length ? (
            <div className="hotline-list">
              {activeHotlines.slice(0, 6).map((hotline) => (
                <div className="hotline-row" key={hotline.hotlineId}>
                  <span>
                    <i aria-hidden="true">HL</i>
                    {hotline.name}
                  </span>
                  <strong>{hotline.phone}</strong>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No active hotlines loaded." />
          )}
        </Card>
      </section>
    </div>
  );
}

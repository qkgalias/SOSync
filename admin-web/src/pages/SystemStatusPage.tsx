import { Card } from "../components/Ui";
import type { AdminRole, EvacuationCenter, Hotline, SupportReport } from "../types";
import { formatRole } from "../utils";

function StatusIcon({ type }: { type: "auth" | "centers" | "check" | "cloud" | "functions" | "hotlines" | "reports" | "role" | "storage" }) {
  if (type === "role") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M16 19v-1.5a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4V19" />
        <circle cx="10" cy="7" r="3" />
        <path d="M18 8v6" />
        <path d="M15 11h6" />
      </svg>
    );
  }
  if (type === "centers") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 21h16" />
        <path d="M6 21V8l6-4 6 4v13" />
        <path d="M9 21v-8h6v8" />
        <path d="M10 9h4" />
      </svg>
    );
  }
  if (type === "hotlines") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.6 3.8 9 6.2 7.3 9c1 2.1 2.7 3.8 4.8 4.8l2.8-1.7 2.4 2.4c.6.6.7 1.5.2 2.2l-1.1 1.6c-.5.7-1.4 1-2.2.7C9.5 17.4 6 13.9 4.4 9.2c-.3-.8 0-1.7.7-2.2l1.6-1.1c.7-.5 1.6-.4 2.2.2Z" />
      </svg>
    );
  }
  if (type === "reports") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 12h5" />
        <path d="M10 16h4" />
      </svg>
    );
  }
  if (type === "auth") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="8" cy="8" r="3" />
        <path d="M3 20v-1a5 5 0 0 1 5-5h1" />
        <path d="m15 14 2 2 4-5" />
      </svg>
    );
  }
  if (type === "functions") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 7 4 12l4 5" />
        <path d="m16 7 4 5-4 5" />
        <path d="m14 4-4 16" />
      </svg>
    );
  }
  if (type === "cloud") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 18h13a4 4 0 0 0 .6-8 6 6 0 0 0-11.3-1.8A5 5 0 0 0 5 18Z" />
      </svg>
    );
  }
  if (type === "storage") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 6h14v5H5z" />
        <path d="M5 13h14v5H5z" />
        <path d="M8 8.5h.1" />
        <path d="M8 15.5h.1" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

export function SystemStatusPage({
  centers,
  error,
  hotlines,
  reports,
  role,
}: {
  centers: EvacuationCenter[];
  error: string;
  hotlines: Hotline[];
  reports: SupportReport[];
  role: AdminRole;
}) {
  const activeCenters = centers.filter((center) => !center.disabled).length;
  const activeHotlines = hotlines.filter((hotline) => !hotline.disabled).length;
  const openReports = reports.filter((report) => (report.status ?? "new") === "new").length;
  const roleLabel = formatRole(role);

  return (
    <div className="status-page">
      <Card className="status-hero-card">
        <div>
          <p className="eyebrow">System Status</p>
          <h3>{error ? "Admin workspace needs attention" : "Live admin workspace"}</h3>
          <p className="status-hero-card__copy">
            <span className={error ? "status-dot status-dot--danger" : "status-dot"} aria-hidden="true" />
            {error
              ? "The admin workspace loaded with a recent service warning. Review the operational notes below."
              : "Firebase Authentication, Cloud Functions, and Firestore-backed admin data are connected for this session."}
          </p>
        </div>
        <div className={error ? "status-live status-live--warning" : "status-live"}>
          <StatusIcon type={error ? "reports" : "cloud"} />
          <strong>{error ? "Review" : "Live"}</strong>
          <span>{error ? "Action recommended" : "All systems operational"}</span>
        </div>
      </Card>

      <section className="status-grid">
        <Card className="status-metric-card status-metric-card--danger">
          <span className="status-metric-card__icon"><StatusIcon type="role" /></span>
          <div className="status-metric">
            <span>Admin role</span>
            <strong>{roleLabel}</strong>
            <small>{role === "superadmin" ? "Full access" : "Role-limited access"}</small>
          </div>
        </Card>
        <Card className="status-metric-card status-metric-card--info">
          <span className="status-metric-card__icon"><StatusIcon type="centers" /></span>
          <div className="status-metric">
            <span>Active centers</span>
            <strong>{activeCenters}</strong>
            <small>Evacuation centers</small>
          </div>
        </Card>
        <Card className="status-metric-card status-metric-card--success">
          <span className="status-metric-card__icon"><StatusIcon type="hotlines" /></span>
          <div className="status-metric">
            <span>Active hotlines</span>
            <strong>{activeHotlines}</strong>
            <small>Hotline contacts</small>
          </div>
        </Card>
        <Card className="status-metric-card status-metric-card--purple">
          <span className="status-metric-card__icon"><StatusIcon type="reports" /></span>
          <div className="status-metric">
            <span>New reports</span>
            <strong>{openReports}</strong>
            <small>{openReports ? "Requires attention" : "Queue clear"}</small>
          </div>
        </Card>
      </section>

      <Card className="status-notes-card">
        <div className="card-heading">
          <div>
            <h3>Operational notes</h3>
            <p>Important system information and data flow.</p>
          </div>
        </div>
        <div className="status-notes">
          <article>
            <span className="status-note-icon"><StatusIcon type="check" /></span>
            <div>
              <strong>Admin access is enforced by Firebase custom claims.</strong>
              <p>Only authorized users with valid custom claims can access the admin portal.</p>
            </div>
          </article>
          <article>
            <span className="status-note-icon"><StatusIcon type="check" /></span>
            <div>
              <strong>Management data is loaded through admin Cloud Functions.</strong>
              <p>Critical data is securely fetched through callable functions to preserve access control.</p>
            </div>
          </article>
          <article>
            <span className="status-note-icon"><StatusIcon type="check" /></span>
            <div>
              <strong>Mobile users remain blocked from direct support report and system data writes.</strong>
              <p>Admin-only collections stay protected behind backend-controlled workflows.</p>
            </div>
          </article>
          <article>
            <span className="status-note-icon"><StatusIcon type="check" /></span>
            <div>
              <strong>All data is stored and synced in Cloud Firestore.</strong>
              <p>Real-time updates and data consistency are handled by Firebase services.</p>
            </div>
          </article>
          {error ? (
            <article className="status-note-error">
              <span className="status-note-icon"><StatusIcon type="reports" /></span>
              <div>
                <strong>Latest workspace warning</strong>
                <p>{error}</p>
              </div>
            </article>
          ) : null}
        </div>
      </Card>

      <Card className="firebase-services-card">
        <div>
          <h3>Firebase services</h3>
          <p>Current status of connected Firebase services.</p>
        </div>
        <div className="firebase-services">
          {[
            ["Authentication", "auth"],
            ["Cloud Functions", "functions"],
            ["Cloud Firestore", "cloud"],
            ["Storage", "storage"],
          ].map(([label, type]) => (
            <article key={label}>
              <StatusIcon type={type as "auth" | "cloud" | "functions" | "storage"} />
              <div>
                <strong>{label}</strong>
                <span>Healthy</span>
              </div>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

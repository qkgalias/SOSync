import { useState, type ReactNode } from "react";
import type { User } from "firebase/auth";
import { signOut } from "firebase/auth";

import type { ThemeMode } from "../App";
import type { EvacuationCenter, Hotline, SupportReport } from "../types";
import philippinesMap from "../assets/philippines-alert-map.png";
import { auth } from "../firebase";
import type { AdminRole, AppTab } from "../types";
import { formatRole, getVisibleTabs, pageTitles } from "../utils";
import { BrandLockup } from "./Brand";

const navLabels: Record<AppTab, string> = {
  centers: "Evacuation Centers",
  dashboard: "Dashboard",
  hotlines: "Hotlines",
  reports: "Support Reports",
  settings: "Settings",
  status: "System Status",
};

function SidebarIcon({ tab }: { tab: AppTab }) {
  if (tab === "dashboard") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 10.8 12 3l9 7.8" />
        <path d="M5.5 10.2V21h13V10.2" />
        <path d="M9.5 21v-6h5v6" />
      </svg>
    );
  }
  if (tab === "centers") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M3 11 12 3l9 8" />
        <path d="M5.5 10.5V21h13V10.5" />
        <path d="M9 21v-6h6v6" />
        <path d="M12 8v4" />
        <path d="M10 10h4" />
      </svg>
    );
  }
  if (tab === "hotlines") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6.6 3.8 9 6.2 7.3 9c1 2.1 2.7 3.8 4.8 4.8l2.8-1.7 2.4 2.4c.6.6.7 1.5.2 2.2l-1.1 1.6c-.5.7-1.4 1-2.2.7C9.5 17.4 6 13.9 4.4 9.2c-.3-.8 0-1.7.7-2.2l1.6-1.1c.7-.5 1.6-.4 2.2.2Z" />
      </svg>
    );
  }
  if (tab === "reports") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v5h5" />
        <path d="M10 12h6" />
        <path d="M10 16h4" />
        <path d="M5 7H4v14h10" />
      </svg>
    );
  }
  if (tab === "status") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3 20 6v5c0 5-3.2 8.2-8 10-4.8-1.8-8-5-8-10V6z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path d="M19 13.5v-3l-2.1-.4a6.7 6.7 0 0 0-.8-1.8l1.2-1.8-2.1-2.1-1.8 1.2a6.7 6.7 0 0 0-1.8-.8L11.2 2h-3l-.4 2.1a6.7 6.7 0 0 0-1.8.8L4.2 3.7 2.1 5.8l1.2 1.8a6.7 6.7 0 0 0-.8 1.8L.5 9.8v3l2 .4c.2.7.5 1.3.8 1.8l-1.2 1.8 2.1 2.1 1.8-1.2c.6.4 1.2.6 1.8.8l.4 2.1h3l.4-2.1c.7-.2 1.3-.5 1.8-.8l1.8 1.2 2.1-2.1-1.2-1.8c.4-.6.6-1.2.8-1.8z" />
    </svg>
  );
}

export function AppShell({
  activeTab,
  centers,
  children,
  error,
  hotlines,
  onRefresh,
  onTabChange,
  onToggleTheme,
  reports,
  role,
  theme,
  user,
}: {
  activeTab: AppTab;
  centers: EvacuationCenter[];
  children: ReactNode;
  error: string;
  hotlines: Hotline[];
  onRefresh: () => void;
  onTabChange: (tab: AppTab) => void;
  onToggleTheme: () => void;
  reports: SupportReport[];
  role: AdminRole;
  theme: ThemeMode;
  user: User;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const visibleTabs = getVisibleTabs(role);
  const title = pageTitles[activeTab];
  const newReports = reports.filter((report) => (report.status ?? "new") === "new").length;
  const disabledCenters = centers.filter((center) => center.disabled).length;
  const disabledHotlines = hotlines.filter((hotline) => hotline.disabled).length;
  const noticeCount = [newReports, disabledCenters, disabledHotlines].filter((count) => count > 0).length;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <BrandLockup inverse />
          <nav className="sidebar-nav">
            {visibleTabs.map((tab) => (
              <button className={activeTab === tab ? "active" : ""} key={tab} onClick={() => onTabChange(tab)} type="button">
                <span aria-hidden="true">
                  <SidebarIcon tab={tab} />
                </span>
                {navLabels[tab]}
              </button>
            ))}
          </nav>
        </div>
        <img alt="" aria-hidden="true" className="sidebar-map" src={philippinesMap} />
        <div className="sidebar-footer">
          <span className="country-dot" aria-hidden="true" />
          <div>
            <strong>Philippines-first</strong>
            <span>Emergency coordination for local communities.</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar__title">
            <p className="eyebrow">{title.eyebrow}</p>
            <h1>{title.title}</h1>
            <span>{title.subtitle}</span>
          </div>
          <div className="topbar__actions">
            <button className="theme-toggle" onClick={onToggleTheme} type="button">
              <span aria-hidden="true">{theme === "light" ? "☼" : "☾"}</span>
              {theme === "light" ? "Light" : "Dark"}
            </button>
            <div className="notification-menu">
              <button
                aria-expanded={showNotifications}
                aria-label="Admin notifications"
                className="icon-button icon-button--alert"
                data-count={noticeCount}
                onClick={() => setShowNotifications((isOpen) => !isOpen)}
                type="button"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <path d="M18 9a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
              </button>
              {showNotifications ? (
                <div className="notification-popover" role="status">
                  <div className="notification-popover__header">
                    <strong>Admin notifications</strong>
                    <button onClick={() => setShowNotifications(false)} type="button" aria-label="Close notifications">
                      ×
                    </button>
                  </div>
                  <div className="notification-list">
                    {newReports ? <span>{newReports} new support report{newReports === 1 ? "" : "s"} need review.</span> : null}
                    {disabledCenters ? <span>{disabledCenters} evacuation center{disabledCenters === 1 ? "" : "s"} disabled.</span> : null}
                    {disabledHotlines ? <span>{disabledHotlines} hotline{disabledHotlines === 1 ? "" : "s"} disabled.</span> : null}
                    {!noticeCount ? <span>All admin queues are clear.</span> : null}
                  </div>
                  <p>System live. Admin data loaded from Firebase Cloud Functions.</p>
                </div>
              ) : null}
            </div>
            <details className="admin-menu">
              <summary>
                <span className="admin-avatar">{(user.email?.[0] ?? "A").toUpperCase()}</span>
                <span>
                  <strong>Admin User</strong>
                  <small>{formatRole(role)}</small>
                </span>
              </summary>
              <div>
                <p>{user.email}</p>
                <button onClick={() => void signOut(auth)} type="button">
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>
        {error ? (
          <div className="inline-error">
            <span>{error}</span>
            <button onClick={onRefresh} type="button">
              Retry
            </button>
          </div>
        ) : null}
        {children}
      </section>
    </main>
  );
}

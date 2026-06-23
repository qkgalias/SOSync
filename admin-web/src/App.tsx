import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";

import { AppShell } from "./components/AppShell";
import { getAdminActionErrorMessage } from "./errors";
import { auth, callAdminFunction } from "./firebase";
import { DashboardPage } from "./pages/DashboardPage";
import { EvacuationCentersPage } from "./pages/EvacuationCentersPage";
import { HotlinesPage } from "./pages/HotlinesPage";
import { LoginScreen } from "./pages/LoginScreen";
import { PublicLegalPage } from "./pages/PublicLegalPage";
import { getPublicLegalRoute } from "./pages/publicLegalContent";
import { SettingsPage } from "./pages/SettingsPage";
import { SystemStatusPage } from "./pages/SystemStatusPage";
import { SupportReportsPage } from "./pages/SupportReportsPage";
import type { AdminNotificationItem, AdminNotificationTarget, AdminRole, AppTab, Bootstrap, EvacuationCenter, Hotline, SupportReport } from "./types";
import { getVisibleTabs, roleCanEditContent, roleCanReviewReports } from "./utils";

export type ThemeMode = "dark" | "light";

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { isLoading, user };
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  const storedTheme = window.localStorage.getItem("sosync-admin-theme");
  return storedTheme === "dark" ? "dark" : "light";
}

export function App() {
  const { isLoading: isAuthLoading, user } = useAuth();
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [hotlines, setHotlines] = useState<Hotline[]>([]);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [reports, setReports] = useState<SupportReport[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [notificationTarget, setNotificationTarget] = useState<AdminNotificationTarget | null>(null);
  const [error, setError] = useState("");
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => getInitialTheme());

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("sosync-admin-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  const publicLegalRoute = typeof window === "undefined" ? null : getPublicLegalRoute(window.location.pathname);

  const refresh = async (roleOverride?: AdminRole) => {
    const role = roleOverride ?? bootstrap?.role;
    setError("");
    if (!role) {
      return;
    }

    const jobs: Promise<void>[] = [];
    jobs.push(
      callAdminFunction<{ limit: number }, { notifications: AdminNotificationItem[] }>("listAdminNotifications", { limit: 50 }).then(
        (result) => setNotifications(result.notifications),
      ),
    );
    if (roleCanEditContent(role)) {
      jobs.push(
        callAdminFunction<Record<string, never>, { hotlines: Hotline[] }>("listHotlines", {}).then((result) =>
          setHotlines(result.hotlines),
        ),
      );
      jobs.push(
        callAdminFunction<Record<string, never>, { centers: EvacuationCenter[] }>("listEvacuationCenters", {}).then(
          (result) => setCenters(result.centers),
        ),
      );
    }
    if (roleCanReviewReports(role)) {
      jobs.push(
        callAdminFunction<{ limit: number }, { reports: SupportReport[] }>("listSupportReports", { limit: 100 }).then(
          (result) => setReports(result.reports),
        ),
      );
    }
    await Promise.all(jobs);
  };

  useEffect(() => {
    if (!user) {
      setBootstrap(null);
      setActiveTab("dashboard");
      setNotifications([]);
      setNotificationTarget(null);
      return;
    }

    let isMounted = true;
    const load = async () => {
      setIsWorkspaceLoading(true);
      setError("");
      try {
        const result = await callAdminFunction<Record<string, never>, Bootstrap>("getAdminBootstrap", {});
        if (!isMounted) {
          return;
        }
        setActiveTab("dashboard");
        setBootstrap(result);
        await refresh(result.role);
      } catch (nextError) {
        setError(getAdminActionErrorMessage(nextError, "Unable to load admin access. Try again."));
      } finally {
        if (isMounted) {
          setIsWorkspaceLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const selectTab = (tab: AppTab) => {
    setActiveTab(tab);
  };

  const openNotification = (notification: AdminNotificationItem) => {
    setNotificationTarget({ kind: notification.kind, tab: notification.tab, targetId: notification.targetId });
    setActiveTab(notification.tab);
  };

  const dismissNotification = async (notificationId: string) => {
    await callAdminFunction<{ notificationId: string }, { success: true }>("dismissAdminNotification", { notificationId });
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    await refresh();
  };

  const clearNotifications = async () => {
    await callAdminFunction<Record<string, never>, { success: true }>("clearAdminNotifications", {});
    setNotifications([]);
    await refresh();
  };

  const consumeNotificationTarget = (unavailableMessage?: string) => {
    setNotificationTarget(null);
    if (unavailableMessage) {
      setError(unavailableMessage);
    }
  };

  if (publicLegalRoute) {
    return <PublicLegalPage route={publicLegalRoute} />;
  }

  if (isAuthLoading) {
    return <main className="center-state">Loading...</main>;
  }

  if (!user) {
    return <LoginScreen onToggleTheme={toggleTheme} theme={theme} />;
  }

  if (isWorkspaceLoading) {
    return <main className="center-state">Loading admin workspace...</main>;
  }

  if (!bootstrap) {
    return (
      <main className="center-state">
        <h1>Access denied</h1>
        <p>{error || "This account does not have a SOSync admin role."}</p>
        <button onClick={() => void signOut(auth)} type="button">
          Sign out
        </button>
      </main>
    );
  }

  const visibleTabs = getVisibleTabs(bootstrap.role);
  const resolvedTab = visibleTabs.includes(activeTab) ? activeTab : "dashboard";

  return (
    <AppShell
      activeTab={resolvedTab}
      error={error}
      notifications={notifications}
      onClearNotifications={clearNotifications}
      onDismissNotification={dismissNotification}
      onOpenNotification={openNotification}
      onRefresh={() => void refresh()}
      onTabChange={selectTab}
      onToggleTheme={toggleTheme}
      role={bootstrap.role}
      theme={theme}
      user={user}
    >
      {resolvedTab === "dashboard" ? (
        <DashboardPage
          centers={centers}
          hotlines={hotlines}
          onNavigate={selectTab}
          reports={reports}
          role={bootstrap.role}
        />
      ) : null}
      {resolvedTab === "centers" && roleCanEditContent(bootstrap.role) ? (
        <EvacuationCentersPage
          centers={centers}
          notificationTargetId={notificationTarget?.kind === "evacuation_center" ? notificationTarget.targetId : ""}
          onConsumeNotificationTarget={consumeNotificationTarget}
          onRefresh={() => refresh()}
        />
      ) : null}
      {resolvedTab === "hotlines" && roleCanEditContent(bootstrap.role) ? (
        <HotlinesPage
          hotlines={hotlines}
          notificationTargetId={notificationTarget?.kind === "hotline" ? notificationTarget.targetId : ""}
          onConsumeNotificationTarget={consumeNotificationTarget}
          onRefresh={() => refresh()}
        />
      ) : null}
      {resolvedTab === "reports" && roleCanReviewReports(bootstrap.role) ? (
        <SupportReportsPage
          notificationTargetId={notificationTarget?.kind === "support_report" ? notificationTarget.targetId : ""}
          onConsumeNotificationTarget={consumeNotificationTarget}
          onRefresh={() => refresh()}
          reports={reports}
        />
      ) : null}
      {resolvedTab === "status" ? (
        <SystemStatusPage centers={centers} error={error} hotlines={hotlines} reports={reports} role={bootstrap.role} />
      ) : null}
      {resolvedTab === "settings" ? <SettingsPage role={bootstrap.role} user={user} /> : null}
    </AppShell>
  );
}

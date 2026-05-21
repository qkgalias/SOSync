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
import { SettingsPage } from "./pages/SettingsPage";
import { SystemStatusPage } from "./pages/SystemStatusPage";
import { SupportReportsPage } from "./pages/SupportReportsPage";
import type { AdminRole, AppTab, Bootstrap, EvacuationCenter, Hotline, SupportReport } from "./types";
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

  const refresh = async (roleOverride?: AdminRole) => {
    const role = roleOverride ?? bootstrap?.role;
    setError("");
    if (!role) {
      return;
    }

    const jobs: Promise<void>[] = [];
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
      centers={centers}
      error={error}
      hotlines={hotlines}
      onRefresh={() => void refresh()}
      onTabChange={selectTab}
      onToggleTheme={toggleTheme}
      reports={reports}
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
        <EvacuationCentersPage centers={centers} onRefresh={() => refresh()} />
      ) : null}
      {resolvedTab === "hotlines" && roleCanEditContent(bootstrap.role) ? (
        <HotlinesPage hotlines={hotlines} onRefresh={() => refresh()} />
      ) : null}
      {resolvedTab === "reports" && roleCanReviewReports(bootstrap.role) ? (
        <SupportReportsPage onRefresh={() => refresh()} reports={reports} />
      ) : null}
      {resolvedTab === "status" ? (
        <SystemStatusPage centers={centers} error={error} hotlines={hotlines} reports={reports} role={bootstrap.role} />
      ) : null}
      {resolvedTab === "settings" ? <SettingsPage role={bootstrap.role} user={user} /> : null}
    </AppShell>
  );
}

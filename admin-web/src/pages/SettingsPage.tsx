import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";

import { Card, EmptyState, Field, Modal, StatusBadge } from "../components/Ui";
import { callAdminFunction } from "../firebase";
import { getAdminActionErrorMessage } from "../errors";
import type { AdminAccessRecord, AdminPermission, AdminRole, AdminRoleRecord, AuditLogRecord } from "../types";
import { formatDate, formatRole } from "../utils";

type SectionId = "general" | "roles" | "access" | "audit";

type RoleFormState = {
  description: string;
  label: string;
  permissions: AdminPermission[];
  role: AdminRole;
};

type AccessFormState = {
  email: string;
  role: AdminRole;
  uid: string;
};

const PERMISSION_OPTIONS: Array<{ description: string; label: string; value: AdminPermission }> = [
  { description: "Manage evacuation centers and their availability.", label: "Manage centers", value: "manage_centers" },
  { description: "Manage hotline records shown in the admin portal.", label: "Manage hotlines", value: "manage_hotlines" },
  { description: "Review, update, and resolve support reports.", label: "Manage reports", value: "manage_reports" },
  { description: "Grant or revoke access to the admin portal.", label: "Manage access", value: "manage_access" },
  { description: "View read-only activity history for admin actions.", label: "Audit logs", value: "view_audit_logs" },
];

const DEFAULT_ROLE_COPY: Record<AdminRole, RoleFormState> = {
  admin: {
    description: "Manage evacuation centers, hotlines, and support reports.",
    label: "Admin",
    permissions: ["manage_centers", "manage_hotlines", "manage_reports"],
    role: "admin",
  },
  operator: {
    description: "Manage evacuation centers and hotlines.",
    label: "Operator",
    permissions: ["manage_centers", "manage_hotlines"],
    role: "operator",
  },
  superadmin: {
    description: "Full access to all admin portal functions, access management, and audit logs.",
    label: "Super Admin",
    permissions: ["manage_access", "manage_centers", "manage_hotlines", "manage_reports", "view_audit_logs"],
    role: "superadmin",
  },
};

const SECTION_COPY: Record<SectionId, { description: string; title: string }> = {
  access: {
    description: "Grant or revoke admin portal access by email and role.",
    title: "Access",
  },
  audit: {
    description: "Read-only history of admin actions and portal access changes.",
    title: "Audit Logs",
  },
  general: {
    description: "Workspace identity and your signed-in admin details.",
    title: "General",
  },
  roles: {
    description: "Manage role labels, descriptions, and permissions.",
    title: "Roles & Permissions",
  },
};

const ROLE_SEQUENCE: AdminRole[] = ["superadmin", "admin", "operator"];
const AUDIT_PAGE_SIZE = 7;

const hasPermission = (permissions: AdminPermission[], value: AdminPermission) => permissions.includes(value);

function SectionButton({
  active,
  description,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      aria-selected={active}
      className={["settings-rail__item", active ? "active" : ""].filter(Boolean).join(" ")}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m9 6 6 6-6 6" />
      </svg>
    </button>
  );
}

function PermissionPill({ enabled, label }: { enabled: boolean; label: string }) {
  return <span className={enabled ? "permission-pill permission-pill--on" : "permission-pill"}>{label}</span>;
}

export function SettingsPage({ role, user }: { role: AdminRole; user: User }) {
  const isSuperAdmin = role === "superadmin";
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [roles, setRoles] = useState<AdminRoleRecord[]>(ROLE_SEQUENCE.map((nextRole) => DEFAULT_ROLE_COPY[nextRole]));
  const [accessRecords, setAccessRecords] = useState<AdminAccessRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [roleModal, setRoleModal] = useState<AdminRoleRecord | null>(null);
  const [accessModal, setAccessModal] = useState<AccessFormState | null>(null);
  const [pendingAccessToggle, setPendingAccessToggle] = useState<AdminAccessRecord | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [togglingAccessUid, setTogglingAccessUid] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const visibleSections = useMemo(() => {
    const nextSections: SectionId[] = ["general"];
    if (isSuperAdmin) {
      nextSections.push("roles", "access", "audit");
    }
    return nextSections;
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!visibleSections.includes(activeSection)) {
      setActiveSection("general");
    }
  }, [activeSection, visibleSections]);

  useEffect(() => {
    if (activeSection !== "audit") {
      setAuditPage(1);
    }
    setSuccess("");
  }, [activeSection]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timerId = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timerId);
  }, [success]);

  useEffect(() => {
    if (!isSuperAdmin) {
      return;
    }

    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [rolesResult, accessResult, auditResult] = await Promise.all([
          callAdminFunction<Record<string, never>, { roles: AdminRoleRecord[] }>("listAdminRoles", {}),
          callAdminFunction<{ limit: number }, { users: AdminAccessRecord[] }>("listAdminAccess", { limit: 100 }),
          callAdminFunction<{ limit: number }, { logs: AuditLogRecord[] }>("listAuditLogs", { limit: 100 }),
        ]);
        if (!isMounted) {
          return;
        }
        setRoles(rolesResult.roles.length ? rolesResult.roles : ROLE_SEQUENCE.map((nextRole) => DEFAULT_ROLE_COPY[nextRole]));
        setAccessRecords(accessResult.users);
        setAuditLogs(auditResult.logs);
      } catch (nextError) {
        if (isMounted) {
          setError(getAdminActionErrorMessage(nextError, "Unable to load settings data. Try again."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [isSuperAdmin]);

  const refreshSuperAdminData = async () => {
    if (!isSuperAdmin) {
      return;
    }

    const [rolesResult, accessResult, auditResult] = await Promise.all([
      callAdminFunction<Record<string, never>, { roles: AdminRoleRecord[] }>("listAdminRoles", {}),
      callAdminFunction<{ limit: number }, { users: AdminAccessRecord[] }>("listAdminAccess", { limit: 100 }),
      callAdminFunction<{ limit: number }, { logs: AuditLogRecord[] }>("listAuditLogs", { limit: 100 }),
    ]);
    setRoles(rolesResult.roles.length ? rolesResult.roles : ROLE_SEQUENCE.map((nextRole) => DEFAULT_ROLE_COPY[nextRole]));
    setAccessRecords(accessResult.users);
    setAuditLogs(auditResult.logs);
  };

  const openRoleModal = (nextRole: AdminRoleRecord) => {
    setSuccess("");
    setError("");
    setRoleModal(nextRole);
  };

  const openAccessModal = (nextAccess?: Partial<AccessFormState>) => {
    setSuccess("");
    setError("");
    setAccessModal({
      email: nextAccess?.email ?? "",
      role: nextAccess?.role ?? "admin",
      uid: nextAccess?.uid ?? "",
    });
  };

  const saveRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roleModal) {
      return;
    }

    setRoleSaving(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const permissions = PERMISSION_OPTIONS.filter((option) => formData.get(option.value) === "on").map((option) => option.value);

    try {
      await callAdminFunction<
        { description: string; label: string; permissions: AdminPermission[]; role: AdminRole },
        { role: AdminRole }
      >("upsertAdminRole", {
        description: String(formData.get("description") ?? "").trim(),
        label: String(formData.get("label") ?? "").trim(),
        permissions,
        role: roleModal.role,
      });
      await refreshSuperAdminData();
      setSuccess(`${formatRole(roleModal.role)} updated.`);
      setRoleModal(null);
    } catch (nextError) {
      setError(getAdminActionErrorMessage(nextError, "Unable to save role. Try again."));
    } finally {
      setRoleSaving(false);
    }
  };

  const saveAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessModal) {
      return;
    }

    setAccessSaving(true);
    setError("");
    setSuccess("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const nextRole = String(formData.get("role") ?? "admin") as AdminRole;

    try {
      await callAdminFunction<{ email: string; role: AdminRole; status?: string }, { uid: string }>("upsertAdminAccess", {
        email,
        role: nextRole,
        status: "active",
      });
      await refreshSuperAdminData();
      setSuccess(accessModal.uid ? `${email} updated.` : `${email} added.`);
      setAccessModal(null);
    } catch (nextError) {
      setError(getAdminActionErrorMessage(nextError, "Unable to save access. Try again."));
    } finally {
      setAccessSaving(false);
    }
  };

  const toggleAccessStatus = async () => {
    if (!pendingAccessToggle) {
      return;
    }

    const isDisabled = pendingAccessToggle.status === "disabled";
    setTogglingAccessUid(pendingAccessToggle.uid);
    setError("");
    setSuccess("");
    try {
      if (isDisabled) {
        await callAdminFunction<{ email: string; role: AdminRole; status?: string }, { uid: string }>("upsertAdminAccess", {
          email: pendingAccessToggle.email,
          role: pendingAccessToggle.role,
          status: "active",
        });
      } else {
        await callAdminFunction<{ uid: string }, { success: true }>("revokeAdminAccess", { uid: pendingAccessToggle.uid });
      }
      await refreshSuperAdminData();
      setSuccess(`${pendingAccessToggle.email} access ${isDisabled ? "enabled" : "disabled"}.`);
      setPendingAccessToggle(null);
    } catch (nextError) {
      setError(getAdminActionErrorMessage(nextError, `Unable to ${isDisabled ? "enable" : "disable"} access. Try again.`));
    } finally {
      setTogglingAccessUid("");
    }
  };

  const userCountByRole = useMemo(
    () =>
      accessRecords.reduce<Record<string, number>>((counts, entry) => {
        counts[entry.role] = (counts[entry.role] ?? 0) + 1;
        return counts;
      }, {}),
    [accessRecords],
  );

  const supportedRoles = useMemo(
    () =>
      roles
        .filter((entry) => ROLE_SEQUENCE.includes(entry.role))
        .map((entry) => ({
          ...entry,
          userCount: userCountByRole[entry.role] ?? entry.userCount ?? 0,
        })),
    [roles, userCountByRole],
  );

  const totalAccessCount = accessRecords.length;
  const auditPageCount = Math.max(1, Math.ceil(auditLogs.length / AUDIT_PAGE_SIZE));
  const safeAuditPage = Math.min(auditPage, auditPageCount);
  const auditPageStart = (safeAuditPage - 1) * AUDIT_PAGE_SIZE;
  const pageAuditLogs = auditLogs.slice(auditPageStart, auditPageStart + AUDIT_PAGE_SIZE);
  const auditShowingStart = auditLogs.length ? auditPageStart + 1 : 0;
  const auditShowingEnd = Math.min(auditPageStart + AUDIT_PAGE_SIZE, auditLogs.length);

  useEffect(() => {
    if (auditPage > auditPageCount) {
      setAuditPage(auditPageCount);
    }
  }, [auditPage, auditPageCount]);

  return (
    <div className="settings-layout">
      <Card className="settings-rail">
        <div className="settings-rail__header">
          <p className="settings-rail__eyebrow">Sections</p>
          <span>Workspace preferences plus super-admin management tools.</span>
        </div>
        <div className="settings-rail__list" role="tablist" aria-label="Settings sections">
          {visibleSections.map((sectionId) => (
            <SectionButton
              active={activeSection === sectionId}
              description={SECTION_COPY[sectionId].description}
              key={sectionId}
              onClick={() => setActiveSection(sectionId)}
              title={SECTION_COPY[sectionId].title}
            />
          ))}
        </div>
      </Card>

      <Card className="settings-panel">
        <div className="card-heading settings-panel__heading">
          <div>
            <p className="eyebrow">System</p>
            <h3>{SECTION_COPY[activeSection].title}</h3>
            <p>{SECTION_COPY[activeSection].description}</p>
          </div>
          <StatusBadge value={isSuperAdmin ? "Super Admin" : formatRole(role)} />
        </div>

        {error ? <div className="inline-error">{error}</div> : null}
        {success ? (
          <div aria-live="polite" className="settings-toast" role="status">
            <span>{success}</span>
            <button aria-label="Dismiss notification" onClick={() => setSuccess("")} type="button">
              ×
            </button>
          </div>
        ) : null}
        {isLoading ? <p className="settings-loading">Loading settings data...</p> : null}

        {activeSection === "general" ? (
          <div className="settings-section">
            <div className="settings-grid settings-grid--split">
              <Field helper="Display name used in the admin portal." label="Signed-in admin">
                <input readOnly value={user.email ?? "Unknown admin"} />
              </Field>
              <Field helper="Your current admin access level." label="Admin role">
                <input readOnly value={formatRole(role)} />
              </Field>
            </div>
            <div className="settings-callout">
              <strong>Portal access is managed by super admins</strong>
              <p>Role-based management, audit logs, and user access controls appear only for super admins.</p>
            </div>
          </div>
        ) : null}

        {activeSection === "roles" && isSuperAdmin ? (
          <div className="settings-section">
            <div className="settings-section__header">
              <div>
                <strong>Roles</strong>
                <p>Super admins can update role labels, descriptions, and permissions.</p>
              </div>
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Role name</th>
                    <th>Description</th>
                    <th>Users</th>
                    <th>Permissions</th>
                    <th>Last updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {supportedRoles.map((entry) => (
                    <tr key={entry.role}>
                      <td>
                        <strong>{entry.label}</strong>
                      </td>
                      <td>
                        <span>{entry.description}</span>
                      </td>
                      <td>{entry.userCount ?? 0}</td>
                      <td>
                        <div className="settings-permission-list">
                          {PERMISSION_OPTIONS.map((option) => (
                            <PermissionPill enabled={hasPermission(entry.permissions ?? [], option.value)} key={option.value} label={option.label} />
                          ))}
                        </div>
                      </td>
                      <td>{formatDate(entry.updatedAt)}</td>
                      <td>
                        <button className="secondary-button" onClick={() => openRoleModal(entry)} type="button">
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeSection === "access" && isSuperAdmin ? (
          <div className="settings-section">
            <div className="card-heading settings-panel__subheading">
              <div>
                <strong>Admin portal access</strong>
                <p>{totalAccessCount} user{totalAccessCount === 1 ? "" : "s"} can sign in to the admin web portal.</p>
              </div>
              <button className="primary-button" onClick={() => openAccessModal()} type="button">
                + Add User
              </button>
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last sign-in</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accessRecords.map((entry) => (
                    <tr key={entry.uid}>
                      <td>
                        <strong>{entry.email}</strong>
                        <div className="table-subtext">{entry.uid}</div>
                      </td>
                      <td>{formatRole(entry.role)}</td>
                      <td>
                        <StatusBadge tone={entry.status === "active" ? "success" : "neutral"} value={entry.status} />
                      </td>
                      <td>{formatDate(entry.lastSignInAt)}</td>
                      <td>{formatDate(entry.updatedAt)}</td>
                      <td>
                        <div className="row-actions">
                          <button className="secondary-button" onClick={() => openAccessModal(entry)} type="button">
                            Edit
                          </button>
                          <button
                            className="secondary-button"
                            disabled={togglingAccessUid === entry.uid}
                            onClick={() => setPendingAccessToggle(entry)}
                            type="button"
                          >
                            {entry.status === "disabled" ? "Enable" : "Disable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!accessRecords.length ? (
                    <tr>
                      <td colSpan={6}>
                        <EmptyState message="No admin accounts have been added yet." />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {activeSection === "audit" && isSuperAdmin ? (
          <div className="settings-section">
            <div className="settings-section__header">
              <div>
                <strong>Audit log</strong>
                <p>Recent portal and operational actions performed by admin users.</p>
              </div>
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {pageAuditLogs.map((entry) => (
                    <tr key={entry.logId}>
                      <td>{formatDate(entry.createdAt)}</td>
                      <td>
                        <strong>{formatRole(entry.actorRole)}</strong>
                        <div className="table-subtext">{entry.actorUid}</div>
                      </td>
                      <td>{entry.action}</td>
                      <td>
                        <strong>{entry.targetType}</strong>
                        <div className="table-subtext">{entry.targetId}</div>
                      </td>
                      <td>{entry.details ? JSON.stringify(entry.details) : "—"}</td>
                    </tr>
                  ))}
                  {!auditLogs.length ? (
                    <tr>
                      <td colSpan={5}>
                        <EmptyState message="No audit entries yet." />
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <footer className="settings-pagination hotlines-pagination">
              <span>
                Showing {auditShowingStart} to {auditShowingEnd} of {auditLogs.length} audit logs
              </span>
              <div>
                <button disabled={safeAuditPage <= 1} onClick={() => setAuditPage((currentPage) => Math.max(1, currentPage - 1))} type="button">
                  ‹
                </button>
                {Array.from({ length: auditPageCount }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    className={pageNumber === safeAuditPage ? "active" : ""}
                    key={pageNumber}
                    onClick={() => setAuditPage(pageNumber)}
                    type="button"
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  disabled={safeAuditPage >= auditPageCount}
                  onClick={() => setAuditPage((currentPage) => Math.min(auditPageCount, currentPage + 1))}
                  type="button"
                >
                  ›
                </button>
              </div>
            </footer>
          </div>
        ) : null}

        {!isSuperAdmin && activeSection !== "general" ? (
          <EmptyState message="This section is available to super admins only." />
        ) : null}
      </Card>

      {roleModal ? (
        <Modal onClose={() => setRoleModal(null)} title={`Edit ${formatRole(roleModal.role)}`}>
          <form className="modal-form" onSubmit={saveRole}>
            <Field label="Role name">
              <input defaultValue={roleModal.label} name="label" required />
            </Field>
            <Field label="Description">
              <textarea defaultValue={roleModal.description} name="description" required />
            </Field>
            <div className="modal-permissions">
              {PERMISSION_OPTIONS.map((option) => (
                <label className="modal-permission" key={option.value}>
                  <input defaultChecked={hasPermission(roleModal.permissions ?? [], option.value)} name={option.value} type="checkbox" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setRoleModal(null)} type="button">
                Cancel
              </button>
              <button className="primary-button" disabled={roleSaving} type="submit">
                {roleSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {accessModal ? (
        <Modal onClose={() => setAccessModal(null)} title={accessModal.uid ? "Edit access" : "Add admin user"}>
          <form className="modal-form" onSubmit={saveAccess}>
            <Field helper="Use the person's Firebase email address." label="Email">
              <input defaultValue={accessModal.email} name="email" required type="email" />
            </Field>
            <Field helper="Assign the admin portal role." label="Role">
              <select defaultValue={accessModal.role} name="role">
                {ROLE_SEQUENCE.map((nextRole) => (
                  <option key={nextRole} value={nextRole}>
                    {formatRole(nextRole)}
                  </option>
                ))}
              </select>
            </Field>
            <Field helper="Firebase Auth UID if you already know it; otherwise leave blank." label="User ID">
              <input defaultValue={accessModal.uid} name="uid" placeholder="Optional" />
            </Field>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setAccessModal(null)} type="button">
                Cancel
              </button>
              <button className="primary-button" disabled={accessSaving} type="submit">
                {accessSaving ? "Saving..." : "Save access"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {pendingAccessToggle ? (
        <Modal
          onClose={() => {
            if (!togglingAccessUid) {
              setPendingAccessToggle(null);
            }
          }}
          title={pendingAccessToggle.status === "disabled" ? "Enable admin access?" : "Disable admin access?"}
        >
          <div className="confirmation-modal">
            <p>
              {pendingAccessToggle.status === "disabled"
                ? `${pendingAccessToggle.email} will be able to sign in again.`
                : `${pendingAccessToggle.email} will lose admin portal access.`}
            </p>
            <div className="modal-actions">
              <button className="primary-button" disabled={Boolean(togglingAccessUid)} onClick={() => void toggleAccessStatus()} type="button">
                {togglingAccessUid === pendingAccessToggle.uid
                  ? "Saving..."
                  : pendingAccessToggle.status === "disabled"
                    ? "Enable access"
                    : "Disable access"}
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

export default SettingsPage;

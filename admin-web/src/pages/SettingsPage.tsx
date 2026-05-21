import type { User } from "firebase/auth";

import { Card, Field, StatusBadge } from "../components/Ui";
import type { AdminRole } from "../types";
import { formatRole } from "../utils";

export function SettingsPage({ role, user }: { role: AdminRole; user: User }) {
  return (
    <div className="settings-layout">
      <Card className="settings-tabs">
        <button className="active" type="button">
          General
        </button>
        <button type="button">Notifications</button>
        <button type="button">Roles & Permissions</button>
        <button type="button">System</button>
        <button type="button">Audit Logs</button>
      </Card>

      <Card className="settings-panel">
        <div className="card-heading">
          <div>
            <h3>General settings</h3>
            <p>Admin portal preferences for this workspace preview.</p>
          </div>
          <StatusBadge value="View only" />
        </div>
        <div className="settings-form">
          <Field label="System name">
            <input readOnly value="SOSync Admin Portal" />
          </Field>
          <Field label="Signed-in admin">
            <input readOnly value={user.email ?? "Unknown admin"} />
          </Field>
          <Field label="Admin role">
            <input readOnly value={formatRole(role)} />
          </Field>
          <Field label="Default timezone">
            <select defaultValue="Asia/Manila">
              <option value="Asia/Manila">(GMT+08:00) Asia/Manila</option>
            </select>
          </Field>
          <Field label="Date format">
            <select defaultValue="medium">
              <option value="medium">May 22, 2026</option>
              <option value="numeric">2026-05-22</option>
            </select>
          </Field>
          <Field label="Time format">
            <select defaultValue="12-hour">
              <option value="12-hour">12-hour (AM/PM)</option>
              <option value="24-hour">24-hour</option>
            </select>
          </Field>
          <button disabled type="button">
            Backend settings not connected
          </button>
        </div>
      </Card>
    </div>
  );
}

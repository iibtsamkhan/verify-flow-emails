"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AdminRole = "SUPER_ADMIN" | "ADMIN";

type AdminItem = {
  id: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
};

type Stats = {
  userCount: number;
  jobCount: number;
  completedJobs: number;
  activeSessions: number;
};

type AdminTab = "overview" | "admins" | "security";

const ADMIN_TABS: Array<{ id: AdminTab; label: string; subtitle: string }> = [
  { id: "overview", label: "Overview", subtitle: "Platform health" },
  { id: "admins", label: "Admins", subtitle: "Access management" },
  { id: "security", label: "Security", subtitle: "Password and sessions" }
];

function formatWhen(value: string): string {
  return new Date(value).toLocaleString();
}

export default function AdminDashboardClient(props: {
  currentAdmin: {
    id: string;
    email: string;
    role: AdminRole;
    isActive: boolean;
  };
  initialAdmins: AdminItem[];
  initialStats: Stats;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [admins, setAdmins] = useState<AdminItem[]>(props.initialAdmins);
  const [stats] = useState<Stats>(props.initialStats);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<AdminRole>("ADMIN");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState<string | null>(null);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const isSuperAdmin = useMemo(() => props.currentAdmin.role === "SUPER_ADMIN", [props.currentAdmin.role]);
  const selectedTabMeta = useMemo(() => ADMIN_TABS.find((tab) => tab.id === activeTab) ?? ADMIN_TABS[0], [activeTab]);

  async function onLogout() {
    setLogoutLoading(true);

    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } finally {
      setLogoutLoading(false);
    }
  }

  async function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      const response = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setPasswordMessage(payload.error ?? "Password update failed.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password updated successfully.");
    } catch {
      setPasswordMessage("Unable to update password right now.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function onCreateAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isSuperAdmin) return;

    setCreateLoading(true);
    setCreateMessage(null);

    try {
      const response = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: newAdminEmail,
          password: newAdminPassword,
          role: newAdminRole
        })
      });

      const payload = (await response.json()) as { error?: string; admin?: AdminItem };

      if (!response.ok) {
        setCreateMessage(payload.error ?? "Unable to create admin.");
        return;
      }

      if (payload.admin) {
        setAdmins((prev) => [payload.admin as AdminItem, ...prev]);
      }

      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminRole("ADMIN");
      setCreateMessage("Admin account created.");
      setActiveTab("admins");
    } catch {
      setCreateMessage("Unable to create admin right now.");
    } finally {
      setCreateLoading(false);
    }
  }

  return (
    <main className="vf-app-shell">
      <div className="vf-app-grid">
        <aside className="vf-app-sidebar">
          <a className="vf-logo vf-app-logo" href="/">
            <span className="vf-logo-bolt">v</span>
            <span>verifyflow</span>
          </a>

          <div className="vf-app-sidebar-head">
            <p>Admin Control</p>
            <span>{props.currentAdmin.role}</span>
          </div>

          <nav className="vf-app-nav">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`vf-app-nav-item ${activeTab === tab.id ? "vf-app-nav-item-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <strong>{tab.label}</strong>
                <span>{tab.subtitle}</span>
              </button>
            ))}
          </nav>

          <div className="vf-app-side-metric">
            <p>Signed in as</p>
            <strong>{props.currentAdmin.email}</strong>
            <span>Role protected session</span>
          </div>
        </aside>

        <section className="vf-app-main">
          <header className="vf-app-main-head">
            <div>
              <p>{selectedTabMeta.label}</p>
              <h1>{selectedTabMeta.subtitle}</h1>
            </div>
            <div className="vf-app-head-actions">
              <a href="/" className="vf-btn vf-btn-ghost">
                Landing
              </a>
              <button className="vf-btn vf-btn-primary" onClick={onLogout} disabled={logoutLoading} type="button">
                {logoutLoading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </header>

          <div className="vf-app-tabstrip" role="tablist" aria-label="Admin dashboard tabs">
            {ADMIN_TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={activeTab === tab.id}
                className={`vf-app-tab ${activeTab === tab.id ? "vf-app-tab-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <section className="vf-app-panel-stack">
              <div className="vf-app-kpi-grid">
                <article>
                  <p>Total users</p>
                  <h3>{stats.userCount}</h3>
                  <span>Clerk users with account rows</span>
                </article>
                <article>
                  <p>Verification jobs</p>
                  <h3>{stats.jobCount}</h3>
                  <span>{stats.completedJobs} completed</span>
                </article>
                <article>
                  <p>Active admin sessions</p>
                  <h3>{stats.activeSessions}</h3>
                  <span>Concurrent secure sessions</span>
                </article>
                <article>
                  <p>Current admin</p>
                  <h3>{props.currentAdmin.role}</h3>
                  <span>{props.currentAdmin.email}</span>
                </article>
              </div>

              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>System posture</span>
                  <em>Operational snapshot</em>
                </div>
                <div className="vf-app-card-body">
                  <div className="vf-app-checklist">
                    <div>
                      <strong>Session isolation enabled</strong>
                      <span>Admin auth is fully separate from user Clerk sessions.</span>
                    </div>
                    <div>
                      <strong>Role control active</strong>
                      <span>Only super admin can create additional admin accounts.</span>
                    </div>
                    <div>
                      <strong>Audit-ready flows</strong>
                      <span>Password rotations and admin creations are tracked.</span>
                    </div>
                  </div>
                </div>
              </article>
            </section>
          )}

          {activeTab === "admins" && (
            <section className="vf-app-two-col">
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Create admin</span>
                  <em>Super admin gate</em>
                </div>
                <div className="vf-app-card-body">
                  {isSuperAdmin ? (
                    <form className="vf-form" onSubmit={onCreateAdmin}>
                      <label htmlFor="new-admin-email">Admin email</label>
                      <input
                        id="new-admin-email"
                        type="email"
                        value={newAdminEmail}
                        onChange={(event) => setNewAdminEmail(event.target.value)}
                        required
                      />

                      <label htmlFor="new-admin-password">Temporary password (min 12 chars)</label>
                      <input
                        id="new-admin-password"
                        type="password"
                        value={newAdminPassword}
                        onChange={(event) => setNewAdminPassword(event.target.value)}
                        required
                      />

                      <label htmlFor="new-admin-role">Role</label>
                      <select
                        id="new-admin-role"
                        value={newAdminRole}
                        onChange={(event) => setNewAdminRole(event.target.value as AdminRole)}
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </select>

                      <button className="vf-btn vf-btn-primary" type="submit" disabled={createLoading}>
                        {createLoading ? "Creating..." : "Create Admin"}
                      </button>
                    </form>
                  ) : (
                    <p className="vf-dashboard-message">Only super admin can create admin accounts.</p>
                  )}

                  {createMessage ? <p className="vf-dashboard-message">{createMessage}</p> : null}
                </div>
              </article>

              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Admin list</span>
                  <em>{admins.length} accounts</em>
                </div>
                <div className="vf-app-card-body">
                  <div className="vf-dashboard-log-list">
                    {admins.map((admin) => (
                      <div key={admin.id}>
                        <p>
                          {admin.email} ({admin.role})
                        </p>
                        <span>
                          {admin.isActive ? "Active" : "Disabled"} | Created {formatWhen(admin.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>
          )}

          {activeTab === "security" && (
            <section className="vf-app-panel-stack">
              <article className="vf-app-card">
                <div className="vf-card-topline">
                  <span>Password controls</span>
                  <em>Rotate credentials</em>
                </div>
                <div className="vf-app-card-body">
                  <form className="vf-form" onSubmit={onPasswordSubmit}>
                    <label htmlFor="current-password">Current password</label>
                    <input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                    />

                    <label htmlFor="new-password">New password (minimum 12 chars)</label>
                    <input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                    />

                    <button className="vf-btn vf-btn-primary" type="submit" disabled={passwordLoading}>
                      {passwordLoading ? "Updating..." : "Update Password"}
                    </button>
                  </form>

                  {passwordMessage ? <p className="vf-dashboard-message">{passwordMessage}</p> : null}
                </div>
              </article>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

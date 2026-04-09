"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Unable to sign in.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to reach admin auth endpoint.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="vf-auth-layout vf-auth-layout-admin">
      <div className="vf-auth-stage">
        <section className="vf-auth-brand">
          <div className="vf-auth-brand-inner">
            <a className="vf-logo vf-auth-logo" href="/">
              <span className="vf-logo-bolt">v</span>
              <span>verifyflow</span>
            </a>
            <p className="vf-auth-kicker">Restricted Access</p>
            <h1>Admin Security Console</h1>
            <span>
              This area is protected for authorized administrators only. Signup is disabled and role-based controls are
              enforced.
            </span>
            <div className="vf-auth-metrics">
              <article>
                <p>Role gate</p>
                <strong>Super Admin</strong>
              </article>
              <article>
                <p>Session policy</p>
                <strong>Secure cookie</strong>
              </article>
              <article>
                <p>Password policy</p>
                <strong>12+ chars</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="vf-auth-pane">
          <div className="vf-auth-pane-inner">
            <div className="vf-auth-panel vf-auth-panel-admin">
              <p>Admin Login</p>
              <h2>Sign in</h2>
              <form onSubmit={onSubmit} className="vf-form">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />

                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button className="vf-btn vf-btn-primary" type="submit" disabled={loading}>
                  {loading ? "Signing in..." : "Login to Admin"}
                </button>
              </form>

              {error ? <p className="vf-error">{error}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

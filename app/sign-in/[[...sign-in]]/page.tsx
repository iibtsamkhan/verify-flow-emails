import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="vf-auth-layout">
      <div className="vf-auth-stage">
        <section className="vf-auth-brand">
          <div className="vf-auth-brand-inner">
            <a className="vf-logo vf-auth-logo" href="/">
              <span className="vf-logo-bolt">v</span>
              <span>verifyflow</span>
            </a>
            <p className="vf-auth-kicker">Enterprise Access</p>
            <h1>Welcome Back to VerifyFlow</h1>
            <span>
              Access your verification workspace, run bulk checks, and manage credits from one control surface.
            </span>
            <div className="vf-auth-metrics">
              <article>
                <p>Realtime checks</p>
                <strong>&lt;500ms</strong>
              </article>
              <article>
                <p>Uptime SLA</p>
                <strong>99.95%</strong>
              </article>
              <article>
                <p>Trial credits</p>
                <strong>100</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="vf-auth-pane">
          <div className="vf-auth-pane-inner">
            <div className="vf-auth-panel">
              <p>Account Login</p>
              <h2>Sign in</h2>
              <SignIn
                path="/sign-in"
                routing="path"
                signUpUrl="/sign-up"
                forceRedirectUrl="/dashboard"
                appearance={{
                  variables: {
                    colorPrimary: "#2fd6a1",
                    colorTextOnPrimaryBackground: "#06130d",
                    colorText: "#f2f2f2",
                    colorTextSecondary: "#b8b3b0",
                    colorBackground: "#0b0b0e",
                    colorInputBackground: "#0b0b0e",
                    colorInputText: "#f2f2f2",
                    colorDanger: "#fb565b",
                    colorNeutral: "#3d3a39",
                    borderRadius: "0.65rem"
                  },
                  elements: {
                    rootBox: "vf-clerk-root",
                    card: "vf-clerk-card",
                    main: "vf-clerk-main",
                    header: "vf-clerk-hide",
                    footer: "vf-clerk-footer",
                    footerItem: "vf-clerk-footer-item",
                    footerAction: "vf-clerk-footer-action",
                    footerActionText: "vf-clerk-footer-action-text",
                    footerPages: "vf-clerk-footer-pages",
                    footerPagesLink: "vf-clerk-footer-pages-link",
                    formButtonPrimary: "vf-clerk-primary",
                    formFieldInput: "vf-clerk-input",
                    formFieldLabel: "vf-clerk-label",
                    formFieldAction: "vf-clerk-link",
                    socialButtonsBlockButton: "vf-clerk-social",
                    dividerLine: "vf-clerk-divider-line",
                    dividerText: "vf-clerk-divider-text",
                    footerActionLink: "vf-clerk-link",
                    badge: "vf-clerk-badge"
                  }
                }}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="vf-auth-layout">
      <div className="vf-auth-stage">
        <section className="vf-auth-brand">
          <div className="vf-auth-brand-inner">
            <a className="vf-logo vf-auth-logo" href="/">
              <span className="vf-logo-bolt">v</span>
              <span>verifyflow</span>
            </a>
            <p className="vf-auth-kicker">Start Trial</p>
            <h1>Create Your Verification Workspace</h1>
            <span>
              Launch with 100 free credits, import your first spreadsheet, and validate email quality before campaigns.
            </span>
            <div className="vf-auth-metrics">
              <article>
                <p>Free trial</p>
                <strong>100 credits</strong>
              </article>
              <article>
                <p>Bulk import</p>
                <strong>XLSX + CSV</strong>
              </article>
              <article>
                <p>Security</p>
                <strong>Enterprise-grade</strong>
              </article>
            </div>
          </div>
        </section>

        <section className="vf-auth-pane">
          <div className="vf-auth-pane-inner">
            <div className="vf-auth-panel">
              <p>New Account</p>
              <h2>Sign up</h2>
              <SignUp
                path="/sign-up"
                routing="path"
                signInUrl="/sign-in"
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

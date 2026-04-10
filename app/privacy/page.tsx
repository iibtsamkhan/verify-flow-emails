const EFFECTIVE_DATE = "April 10, 2026";

export default function PrivacyPage() {
  return (
    <div className="vf-shell">
      <main className="vf-wrap vf-legal-page">
        <header className="vf-legal-header">
          <a className="vf-logo" href="/">
            <span className="vf-logo-bolt">v</span>
            <span>verifyflow</span>
          </a>
          <div className="vf-legal-head-copy">
            <p>Legal</p>
            <h1>Privacy Policy</h1>
            <span>Effective date: {EFFECTIVE_DATE}</span>
          </div>
        </header>

        <article className="vf-legal-card">
          <h2>1. Scope</h2>
          <p>
            This policy explains how VerifyFlow collects, uses, and protects personal data when you use our website,
            dashboard, API, and related services.
          </p>

          <h2>2. Data We Collect</h2>
          <ul>
            <li>Account details such as name, email, and authentication identifiers.</li>
            <li>Usage and operational data such as verification jobs, statuses, and logs.</li>
            <li>Billing data required to process payments through Paddle.</li>
            <li>Technical data such as IP address, browser details, and security events.</li>
          </ul>

          <h2>3. How We Use Data</h2>
          <ul>
            <li>To provide and improve service functionality.</li>
            <li>To authenticate users and protect accounts.</li>
            <li>To process subscriptions, invoices, and billing events.</li>
            <li>To detect abuse, enforce terms, and maintain reliability.</li>
          </ul>

          <h2>4. Payment Processing</h2>
          <p>
            Payments are processed by Paddle. VerifyFlow does not store full card details. Paddle acts as merchant of
            record and may process billing data under its own privacy and legal terms.
          </p>

          <h2>5. Data Sharing</h2>
          <p>We only share data with service providers required to operate VerifyFlow, such as:</p>
          <ul>
            <li>Authentication provider (Clerk)</li>
            <li>Cloud/database providers</li>
            <li>Payment provider (Paddle)</li>
          </ul>

          <h2>6. Data Retention</h2>
          <p>
            We retain data for as long as needed to provide the service, comply with legal obligations, and enforce our
            agreements. Retention may vary by data type and jurisdiction.
          </p>

          <h2>7. Security</h2>
          <p>
            We use technical and organizational safeguards to protect data, including access controls, encryption in
            transit, and operational monitoring. No system is guaranteed 100% secure.
          </p>

          <h2>8. Your Rights</h2>
          <p>
            Depending on your jurisdiction, you may have rights to access, correct, delete, or restrict processing of
            your personal data. To request this, contact us.
          </p>

          <h2>9. International Transfers</h2>
          <p>
            Data may be processed in countries different from your own. Where required, we apply lawful transfer
            mechanisms and safeguards.
          </p>

          <h2>10. Contact</h2>
          <p>
            Privacy requests can be sent to: <a href="mailto:privacy@verifyflow.app">privacy@verifyflow.app</a>
          </p>
        </article>

        <section className="vf-legal-links-strip">
          <a href="/pricing">Pricing</a>
          <a href="/terms">Terms of Service</a>
          <a href="/refund-policy">Refund Policy</a>
        </section>
      </main>
    </div>
  );
}

const EFFECTIVE_DATE = "April 10, 2026";

export default function TermsPage() {
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
            <h1>Terms of Service</h1>
            <span>Effective date: {EFFECTIVE_DATE}</span>
          </div>
        </header>

        <article className="vf-legal-card">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By creating an account, accessing, or using VerifyFlow, you agree to these Terms of Service and all
            applicable laws. If you do not agree, do not use the service.
          </p>

          <h2>2. Service Description</h2>
          <p>
            VerifyFlow provides email verification software and related tooling, including dashboard access, API access,
            job history, and usage-based credit controls.
          </p>

          <h2>3. Accounts and Security</h2>
          <ul>
            <li>You are responsible for all activity under your account.</li>
            <li>You must provide accurate account information and keep it up to date.</li>
            <li>You must maintain the confidentiality of credentials and API keys.</li>
          </ul>

          <h2>4. Billing and Subscriptions</h2>
          <ul>
            <li>Subscriptions and one-time charges are processed by Paddle as merchant of record.</li>
            <li>Plan details, taxes, and billing terms are shown at checkout.</li>
            <li>Credits are consumed when verification jobs are started, subject to platform safeguards.</li>
          </ul>

          <h2>5. Acceptable Use</h2>
          <p>You agree not to misuse the platform. Prohibited activities include:</p>
          <ul>
            <li>Using the service for unlawful activity or unauthorized data collection.</li>
            <li>Attempting to bypass credit, rate-limit, or authentication controls.</li>
            <li>Interfering with platform stability, security, or availability.</li>
          </ul>

          <h2>6. Data and Privacy</h2>
          <p>
            Your use of VerifyFlow is also governed by the Privacy Policy. You are responsible for ensuring you have a
            lawful basis to process any personal data submitted to the service.
          </p>

          <h2>7. Intellectual Property</h2>
          <p>
            VerifyFlow and all related software, branding, and content are owned by VerifyFlow or its licensors and are
            protected by applicable intellectual property laws.
          </p>

          <h2>8. Disclaimer and Limitation of Liability</h2>
          <p>
            VerifyFlow is provided on an “as is” and “as available” basis. To the maximum extent permitted by law,
            VerifyFlow disclaims warranties and limits liability for indirect, incidental, consequential, or special
            damages.
          </p>

          <h2>9. Suspension and Termination</h2>
          <p>
            We may suspend or terminate access for violations of these terms, suspected abuse, non-payment, or legal
            requirements.
          </p>

          <h2>10. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use after updates become effective constitutes
            acceptance of the revised terms.
          </p>

          <h2>11. Contact</h2>
          <p>
            For legal or billing questions, contact: <a href="mailto:support@verifyflow.app">support@verifyflow.app</a>
          </p>
        </article>

        <section className="vf-legal-links-strip">
          <a href="/pricing">Pricing</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/refund-policy">Refund Policy</a>
        </section>
      </main>
    </div>
  );
}

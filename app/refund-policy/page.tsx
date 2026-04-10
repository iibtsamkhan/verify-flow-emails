const EFFECTIVE_DATE = "April 10, 2026";

export default function RefundPolicyPage() {
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
            <h1>Refund Policy</h1>
            <span>Effective date: {EFFECTIVE_DATE}</span>
          </div>
        </header>

        <article className="vf-legal-card">
          <h2>1. Scope</h2>
          <p>
            This Refund Policy applies to subscription and billing transactions for VerifyFlow processed through Paddle.
          </p>

          <h2>2. Trial Credits</h2>
          <p>
            VerifyFlow includes trial credits for initial evaluation. Because trial usage is provided before purchase,
            trial credits are non-refundable.
          </p>

          <h2>3. Subscription Charges</h2>
          <ul>
            <li>Monthly and annual plans are billed in advance.</li>
            <li>Unless required by law, payments are generally non-refundable after billing.</li>
            <li>Cancellation stops future renewals but does not retroactively refund completed billing periods.</li>
          </ul>

          <h2>4. Exceptional Refund Cases</h2>
          <p>Refund requests may be considered when one of the following applies:</p>
          <ul>
            <li>Duplicate charge for the same billing period.</li>
            <li>Unauthorized charge confirmed by investigation.</li>
            <li>Material platform outage preventing core service access for an extended period.</li>
          </ul>

          <h2>5. Request Window</h2>
          <p>
            Refund requests should be submitted within 7 days of the charge date, including account email, invoice ID,
            and a short explanation.
          </p>

          <h2>6. Processing and Decisions</h2>
          <ul>
            <li>Approved refunds are issued to the original payment method via Paddle.</li>
            <li>Review and processing time may vary by payment provider and bank.</li>
            <li>VerifyFlow reserves the right to deny abusive or repetitive refund claims.</li>
          </ul>

          <h2>7. Chargebacks</h2>
          <p>
            If you believe a charge is incorrect, contact us before initiating a chargeback. This helps resolve issues
            quickly and reduces account disruption.
          </p>

          <h2>8. Contact</h2>
          <p>
            Refund requests: <a href="mailto:billing@verifyflow.app">billing@verifyflow.app</a>
          </p>
        </article>

        <section className="vf-legal-links-strip">
          <a href="/pricing">Pricing</a>
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
        </section>
      </main>
    </div>
  );
}

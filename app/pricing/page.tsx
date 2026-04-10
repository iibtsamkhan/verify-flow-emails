"use client";

import { useMemo, useState } from "react";

type BillingCycle = "monthly" | "annual";

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthly: string;
  annual: string;
  features: string[];
  featured?: boolean;
  highlight?: string;
  cta: string;
  href: string;
};

const PADDLE_STARTER_URL = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_STARTER_URL ?? "#";
const PADDLE_GROWTH_URL = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_GROWTH_URL ?? "#";
const PADDLE_SCALE_URL = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_SCALE_URL ?? "#";

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    description: "For lean teams validating signup and outbound lists.",
    monthly: "$79",
    annual: "$63",
    features: [
      "100 free trial credits included",
      "75k verifications / month",
      "Single + bulk API endpoints",
      "Basic workflow actions",
      "Email support"
    ],
    cta: "Start Starter",
    href: PADDLE_STARTER_URL
  },
  {
    id: "growth",
    name: "Growth",
    description: "For teams running high-frequency campaign and CRM hygiene flows.",
    monthly: "$199",
    annual: "$159",
    highlight: "Most popular",
    featured: true,
    features: [
      "100 free trial credits included",
      "300k verifications / month",
      "Advanced workflow chain rules",
      "Realtime observability dashboard",
      "Priority support + SLA"
    ],
    cta: "Start Growth",
    href: PADDLE_GROWTH_URL
  },
  {
    id: "scale",
    name: "Scale",
    description: "For enterprise organizations with strict quality and governance needs.",
    monthly: "Custom",
    annual: "Custom",
    features: [
      "100 free trial credits included",
      "1M+ verifications / month",
      "Dedicated workspace controls",
      "Custom policy engine + exports",
      "Dedicated success manager"
    ],
    cta: "Contact Sales",
    href: PADDLE_SCALE_URL
  }
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const plans = useMemo(() => PRICING_PLANS, []);

  return (
    <div className="vf-shell">
      <main className="vf-wrap vf-pricing-page">
        <header className="vf-legal-header">
          <a className="vf-logo" href="/">
            <span className="vf-logo-bolt">v</span>
            <span>verifyflow</span>
          </a>
          <div className="vf-legal-head-copy">
            <p>Pricing</p>
            <h1>Choose your VerifyFlow plan</h1>
            <span>Secure subscription checkout powered by Paddle. Start with 100 free credits.</span>
          </div>
        </header>

        <section className="vf-pricing-controls">
          <div className="vf-billing-toggle" role="group" aria-label="Billing cycle">
            <button
              type="button"
              className={`vf-billing-option ${billingCycle === "monthly" ? "vf-billing-option-active" : ""}`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`vf-billing-option ${billingCycle === "annual" ? "vf-billing-option-active" : ""}`}
              onClick={() => setBillingCycle("annual")}
            >
              Annual <span>save 20%</span>
            </button>
          </div>
          <p className="vf-pricing-provider">By subscribing, you agree to our legal and billing terms below.</p>
        </section>

        <section className="vf-pricing-grid">
          {plans.map((plan) => {
            const price = billingCycle === "annual" ? plan.annual : plan.monthly;
            const isCustom = price.toLowerCase() === "custom";

            return (
              <article key={plan.id} className={`vf-pricing-card ${plan.featured ? "vf-pricing-card-featured" : ""}`}>
                <div className="vf-pricing-head">
                  <p>{plan.name}</p>
                  {plan.highlight ? <span>{plan.highlight}</span> : null}
                </div>
                <h3>
                  {price}
                  {!isCustom ? <small>/mo</small> : null}
                </h3>
                <div className="vf-pricing-description">{plan.description}</div>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <a
                  href={plan.href}
                  target="_blank"
                  rel="noreferrer"
                  className={`vf-btn ${plan.featured ? "vf-btn-primary" : "vf-btn-ghost"}`}
                >
                  {plan.cta}
                </a>
              </article>
            );
          })}
        </section>

        <section className="vf-legal-links-strip">
          <a href="/terms">Terms of Service</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/refund-policy">Refund Policy</a>
        </section>
      </main>
    </div>
  );
}

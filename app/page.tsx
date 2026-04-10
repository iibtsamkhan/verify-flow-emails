"use client";

import { useMemo, useState } from "react";

type ShowcaseTab = {
  id: string;
  label: string;
  footer: string;
  code: string;
  previewTitle: string;
  previewPoints: string[];
  metrics: Array<{ label: string; value: string }>;
};

type NavMenu = {
  id: string;
  label: string;
  links: Array<{ label: string; description: string; href: string; badge?: string }>;
};

type ToolkitFeature = {
  id: string;
  tag: string;
  title: string;
  description: string;
  code: string;
};

type WorkflowFeature = {
  tag: string;
  title: string;
  description: string;
};

type Testimonial = {
  quote: string;
  person: string;
  role: string;
  outcome: string;
};

type ComparisonRow = {
  metric: string;
  verifyflow: string;
  legacy: string;
  manual: string;
};

type BillingCycle = "monthly" | "annual";

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  monthly: string;
  annual: string;
  highlight?: string;
  featured?: boolean;
  features: string[];
  cta: string;
};

const NAV_MENUS: NavMenu[] = [
  {
    id: "products",
    label: "Products",
    links: [
      {
        label: "Verification Core",
        description: "Realtime syntax, MX, SMTP, and risk checks.",
        href: "#platform"
      },
      {
        label: "Observability Console",
        description: "Track risky and unknown states across sends.",
        href: "#resources"
      },
      {
        label: "Workflow Chains",
        description: "Build orchestrated verification automations.",
        href: "#resources"
      },
      {
        label: "Deployment",
        description: "Run cloud or self-hosted with the same frontend.",
        href: "/sign-up"
      }
    ]
  },
  {
    id: "use-cases",
    label: "Use Cases",
    links: [
      {
        label: "Signup Validation",
        description: "Reject invalid emails before account creation.",
        href: "/sign-up"
      },
      {
        label: "CRM Hygiene",
        description: "Clean inbound leads before routing to sales.",
        href: "#use-cases"
      },
      {
        label: "Campaign QA",
        description: "Preflight outbound lists with batch checks.",
        href: "/sign-up"
      },
      {
        label: "Reputation Guardrails",
        description: "Protect sender score with strict policies.",
        href: "#resources"
      }
    ]
  },
  {
    id: "resources",
    label: "Resources",
    links: [
      {
        label: "API Reference",
        description: "Use /api/verify and /api/bulk endpoints.",
        href: "/sign-up"
      },
      {
        label: "Integration Guide",
        description: "Connect VerifyFlow API endpoints in under 10 minutes.",
        href: "#platform"
      },
      {
        label: "Workflow Patterns",
        description: "Reference patterns for automations and retries.",
        href: "#resources"
      },
      {
        label: "Competitive Edge",
        description: "See how VerifyFlow compares with other verification tools.",
        href: "#compare",
        badge: "New"
      },
      {
        label: "Pricing",
        description: "Choose a plan for your verification volume and workflow needs.",
        href: "/pricing"
      }
    ]
  }
];

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: "verify",
    label: "Framework",
    footer: "Create production-ready verification pipelines with one API surface.",
    code: `import { verifyEmail } from "@verifyflow/sdk";

const result = await verifyEmail({
  email: "team@company.com",
  checks: ["syntax", "mx", "smtp", "disposable", "role"],
});

if (result.is_reachable === "safe") {
  await allowSignup();
}`,
    previewTitle: "Verification Core",
    previewPoints: [
      "Realtime SMTP reachability",
      "Disposable and role account checks",
      "Catch-all and inbox risk signal"
    ],
    metrics: [
      { label: "Latency", value: "420ms" },
      { label: "Uptime", value: "99.95%" },
      { label: "Checks", value: "5-layer" }
    ]
  },
  {
    id: "bulk",
    label: "Observability",
    footer: "Track every request path before campaign sends and onboarding bursts.",
    code: `const batch = await verifyBulk({
  emails,
  metadata: {
    source: "spring-campaign",
    workspaceId: "team-alpha",
  },
});

console.table(batch.results.map((item) => ({
  email: item.email,
  status: item.is_reachable,
})));`,
    previewTitle: "Batch Insight",
    previewPoints: [
      "Status distribution by batch",
      "Unknown and risky trend tracking",
      "Campaign quality checkpoints"
    ],
    metrics: [
      { label: "Batch size", value: "20/request" },
      { label: "Throughput", value: "8k/min" },
      { label: "Errors", value: "<0.2%" }
    ]
  },
  {
    id: "triggers",
    label: "Triggers & Actions",
    footer: "Trigger verification before user creation, CRM sync, or outbound automations.",
    code: `on.userSignupAttempt(async ({ payload }) => {
  const verdict = await verifyEmail({ email: payload.email });

  if (verdict.is_reachable === "invalid") {
    return rejectSignup("Email is not deliverable");
  }

  await continueSignup();
});`,
    previewTitle: "Automation Hooks",
    previewPoints: [
      "Pre-signup validation gate",
      "Webhook-ready verification events",
      "Safe fallback for unknown states"
    ],
    metrics: [
      { label: "Hook time", value: "120ms" },
      { label: "Retry", value: "Built-in" },
      { label: "Queue", value: "Priority" }
    ]
  },
  {
    id: "guardrails",
    label: "Guardrails",
    footer: "Protect sender reputation with strict rules across every workflow.",
    code: `const guardrail = createGuardrail({
  deny: ["invalid", "disposable"],
  warn: ["risky", "unknown"],
});

const decision = guardrail.evaluate(result.is_reachable);
if (decision.blocked) stopCampaign();`,
    previewTitle: "Send Protection",
    previewPoints: [
      "Block invalid and disposable addresses",
      "Flag risky sends for manual review",
      "Workspace-level policy controls"
    ],
    metrics: [
      { label: "Policy hits", value: "1.9k/day" },
      { label: "Bounces", value: "-34%" },
      { label: "Mode", value: "Strict" }
    ]
  },
  {
    id: "deployment",
    label: "Deployment",
    footer: "Launch hosted verification workflows with one API key and production-grade reliability.",
    code: `VERIFYFLOW_API_KEY=vf_live_********************************
VERIFYFLOW_BASE_URL=https://api.verifyflow.com/v1

POST /verify
POST /bulk

# deploy
npm run build
vercel --prod`,
    previewTitle: "Production Setup",
    previewPoints: [
      "Hosted API with SLA-backed uptime",
      "Secure key management and usage limits",
      "Direct integration with existing signup and CRM flows"
    ],
    metrics: [
      { label: "Time to deploy", value: "~10 min" },
      { label: "SLA", value: "99.95%" },
      { label: "Scale", value: "Enterprise" }
    ]
  }
];

const COMPANY_ROW_ONE = [
  "Samsung",
  "Tata",
  "Infosys",
  "Cognizant",
  "Wells Fargo",
  "Bayer",
  "Oracle",
  "Huawei",
  "Microsoft"
];

const COMPANY_ROW_TWO = [
  "ABB",
  "Amazon",
  "Stellantis",
  "Verizon",
  "Carrefour",
  "GoDaddy",
  "Broadcom",
  "Accenture",
  "Nissan",
  "Adobe",
  "Fiverr"
];

const TOOLKIT_FEATURES: ToolkitFeature[] = [
  {
    id: "tools",
    tag: "01",
    title: "Tool calling",
    description: "Enable verification automations to invoke your internal flows and systems.",
    code: `const verifyLead = createTool({
  name: "verifyLead",
  execute: async ({ email }) => verifyEmail({ email }),
});`
  },
  {
    id: "api",
    tag: "02",
    title: "Unified API",
    description: "Use the same route contracts across signup, CRM imports, and campaigns.",
    code: `const client = createVerifyflowClient({
  verifyEndpoint: "/api/verify",
  bulkEndpoint: "/api/bulk",
});`
  },
  {
    id: "prompting",
    tag: "03",
    title: "Dynamic prompting",
    description: "Adapt handling logic by source and risk level without rewriting pipelines.",
    code: `const prompt = renderPrompt({
  source: "crm-import",
  policy: "strict",
  fallback: "manual-review",
});`
  },
  {
    id: "memory",
    tag: "04",
    title: "Persistent memory",
    description: "Store prior verification outcomes to improve quality decisions over time.",
    code: `await memory.store(email, {
  lastStatus: result.is_reachable,
  verifiedAt: new Date().toISOString(),
});`
  }
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We migrated from two verifier vendors to VerifyFlow and immediately simplified our signup and outbound checks.",
    person: "Lena M.",
    role: "Director of Growth Ops",
    outcome: "31% fewer risky sends"
  },
  {
    quote:
      "The workflow engine plus realtime status made quality gates enforceable across product, sales, and lifecycle teams.",
    person: "Haris T.",
    role: "Head of Lifecycle",
    outcome: "2.4x faster list approvals"
  },
  {
    quote:
      "Compared to legacy tools, false positives dropped and our team finally trusts verification outcomes before launch.",
    person: "Nadia S.",
    role: "Product Operations Lead",
    outcome: "-37% false-positive reviews"
  },
  {
    quote:
      "We needed enterprise-grade controls and clear observability; VerifyFlow gave both without adding platform complexity.",
    person: "Omar A.",
    role: "Engineering Manager",
    outcome: "99.95% verification uptime"
  },
  {
    quote:
      "The interface is clean, fast, and practical. Our analysts can spot risky batches in seconds before campaigns go live.",
    person: "Rida K.",
    role: "CRM Analytics Lead",
    outcome: "6 hours saved per launch cycle"
  },
  {
    quote:
      "We evaluated major email verifier tools and chose VerifyFlow for workflow control, speed, and consistency.",
    person: "Bilal H.",
    role: "Revenue Systems Owner",
    outcome: "3.1M checks/month managed"
  }
];

const TESTIMONIALS_ROW_ONE = TESTIMONIALS.slice(0, 3);
const TESTIMONIALS_ROW_TWO = TESTIMONIALS.slice(3);

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    metric: "Verification depth",
    verifyflow: "Syntax + MX + SMTP + risk scoring in one pass",
    legacy: "Often limited to syntax/MX checks",
    manual: "Spreadsheet checks and ad hoc scripts"
  },
  {
    metric: "Workflow automation",
    verifyflow: "Chain API with routing and policy actions",
    legacy: "Basic API calls with limited orchestration",
    manual: "Manual decision-making per batch"
  },
  {
    metric: "Operational visibility",
    verifyflow: "Realtime statuses and structured outcomes",
    legacy: "Fragmented logs and inconsistent flags",
    manual: "No centralized observability"
  },
  {
    metric: "Launch confidence",
    verifyflow: "Consistent pre-send quality gates",
    legacy: "Variable quality between lists",
    manual: "High risk of missed invalid addresses"
  }
];

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
    cta: "Start Starter"
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
    cta: "Start Growth"
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
    cta: "Contact Sales"
  }
];

const LIVE_CAPABILITIES = [
  {
    title: "Input validation",
    description: "Syntax, MX, SMTP and risk checks",
    value: "4 checks"
  },
  {
    title: "Realtime status",
    description: "safe | risky | invalid | unknown",
    value: "<500ms"
  },
  {
    title: "Bulk mode",
    description: "Up to 20 emails per request",
    value: "20/request"
  },
  {
    title: "Unified routes",
    description: "Single + batch with shared contracts",
    value: "/api/*"
  }
];

const WORKFLOW_STEPS = [
  { id: "user", label: "user", subtitle: "Lead submitted" },
  { id: "workflow", label: "workflow", subtitle: "Chain starts" },
  { id: "verifyAgent", label: "verifyAgent", subtitle: "Reachability pass" },
  { id: "riskAgent", label: "riskAgent", subtitle: "Risk evaluation" },
  { id: "crmAction", label: "crmAction", subtitle: "CRM sync" }
];

const WORKFLOW_FEATURES: WorkflowFeature[] = [
  {
    tag: "A1",
    title: "Chain API composition",
    description: "Compose sequential and parallel verification stages with one declarative builder."
  },
  {
    tag: "A2",
    title: "Typed runtime safety",
    description: "Keep every step typed and validated for predictable production behavior."
  },
  {
    tag: "A3",
    title: "Pause and resume",
    description: "Pause long-running flows and resume after manual or automated review."
  },
  {
    tag: "A4",
    title: "Realtime observability",
    description: "Inspect execution path and debug outcomes directly in the console."
  }
];

const COMMUNITY_STREAM_ONE = [
  "Built signup checks in one afternoon",
  "Reduced bounce-risk before campaigns",
  "Clean API contracts and predictable output",
  "Easy migration from legacy validation flows"
];

const COMMUNITY_STREAM_TWO = [
  "Bulk QA before every outbound blast",
  "Deliverability confidence is up",
  "Strong DX and practical defaults",
  "Loved by growth and product teams"
];

const HERO_ACTIVITY = [
  "signup@company.com -> safe",
  "team@invalid-domain -> invalid",
  "campaign@sample.io -> risky",
  "beta@newdomain.org -> unknown"
];

const API_SNIPPET = "curl -X POST https://api.verifyflow.com/v1/verify";

function MarqueeRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const stream = [...items, ...items, ...items];
  return (
    <div className="vf-marquee-track-wrap">
      <div className={`vf-marquee-track ${reverse ? "vf-marquee-track-reverse" : ""}`}>
        {stream.map((item, index) => (
          <div className="vf-marquee-pill" key={`${item}-${index}`}>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityRow({ items, reverse }: { items: string[]; reverse?: boolean }) {
  const repeated = [...items, ...items, ...items];
  return (
    <div className="vf-community-row-wrap">
      <div className={`vf-community-row ${reverse ? "vf-community-row-reverse" : ""}`}>
        {repeated.map((item, index) => (
          <article className="vf-community-chip" key={`${item}-${index}`}>
            {item}
          </article>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("annual");
  const [activeComparisonMetric, setActiveComparisonMetric] = useState(COMPARISON_ROWS[0]?.metric ?? "");
  const [selectedToolkitId, setSelectedToolkitId] = useState("tools");
  const [activeTabId, setActiveTabId] = useState("verify");
  const [commandText, setCommandText] = useState(API_SNIPPET);
  const [commandBusy, setCommandBusy] = useState(false);
  const paddleStarterUrl = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_STARTER_URL ?? "/sign-up";
  const paddleGrowthUrl = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_GROWTH_URL ?? "/sign-up";
  const paddleScaleUrl = process.env.NEXT_PUBLIC_PADDLE_CHECKOUT_SCALE_URL ?? "#compare";

  const activeTab = useMemo(
    () => SHOWCASE_TABS.find((tab) => tab.id === activeTabId) ?? SHOWCASE_TABS[0],
    [activeTabId]
  );
  const selectedToolkit = useMemo(
    () => TOOLKIT_FEATURES.find((item) => item.id === selectedToolkitId) ?? TOOLKIT_FEATURES[0],
    [selectedToolkitId]
  );
  const activeComparison = useMemo(
    () => COMPARISON_ROWS.find((row) => row.metric === activeComparisonMetric) ?? COMPARISON_ROWS[0],
    [activeComparisonMetric]
  );

  const closeMenu = () => setOpenMenuId(null);
  const toggleMenu = (id: string) => setOpenMenuId((current) => (current === id ? null : id));

  async function handleCommandCopy() {
    if (commandBusy) return;
    setCommandBusy(true);
    try {
      await navigator.clipboard.writeText(API_SNIPPET);
      setCommandText("Copied to clipboard");
      window.setTimeout(() => {
        setCommandText(API_SNIPPET);
        setCommandBusy(false);
      }, 1500);
    } catch {
      setCommandText("Copy failed");
      window.setTimeout(() => {
        setCommandText(API_SNIPPET);
        setCommandBusy(false);
      }, 1500);
    }
  }

  return (
    <div className="vf-shell">
      <a className="vf-announce" href="#compare">
        Enterprise teams use VerifyFlow to reduce bounce risk before every launch.
      </a>

      <header className="vf-nav">
        <div className="vf-nav-inner">
          <div className="vf-nav-left">
            <a className="vf-logo" href="#">
              <span className="vf-logo-bolt">v</span>
              <span>verifyflow</span>
            </a>
            <nav
              className={`vf-nav-links ${mobileMenuOpen ? "vf-nav-links-open" : ""}`}
              onMouseLeave={closeMenu}
            >
              {NAV_MENUS.map((menu) => (
                <div
                  className="vf-nav-menu"
                  key={menu.id}
                  onMouseEnter={() => setOpenMenuId(menu.id)}
                >
                  <button
                    type="button"
                    className={`vf-nav-menu-trigger ${openMenuId === menu.id ? "vf-nav-menu-trigger-open" : ""}`}
                    onClick={() => toggleMenu(menu.id)}
                  >
                    <span>{menu.label}</span>
                    <span className="vf-nav-chevron">v</span>
                  </button>
                  <div className={`vf-nav-dropdown ${openMenuId === menu.id ? "vf-nav-dropdown-open" : ""}`}>
                    <div className="vf-nav-dropdown-grid">
                      {menu.links.map((link) => (
                        <a
                          href={link.href}
                          className="vf-nav-dropdown-item"
                          key={link.label}
                          onClick={() => {
                            closeMenu();
                            setMobileMenuOpen(false);
                          }}
                        >
                          <div className="vf-nav-dropdown-title">
                            <span>{link.label}</span>
                            {link.badge ? <em>{link.badge}</em> : null}
                          </div>
                          <p>{link.description}</p>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </nav>
          </div>
          <div className="vf-nav-right">
            <div className="vf-star-pill">
              Verified Daily <span>3.2M</span>
            </div>
            <a className="vf-docs-btn vf-docs-btn-spotlight" href="/sign-up">
              Start Verifying Emails
            </a>
            <button
              type="button"
              className="vf-menu-button"
              aria-label="Toggle menu"
              onClick={() => setMobileMenuOpen((value) => !value)}
            >
              {mobileMenuOpen ? "x" : "="}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="vf-hero vf-wrap">
          <div className="vf-hero-copy">
            <span className="vf-hero-kicker">
              The end-to-end
            </span>
            <h1>
              Email Verification Engineering
              <span className="vf-hero-emphasis"> Platform</span>
            </h1>
            <p>
              Run high-accuracy verification workflows across signup, CRM, and outbound with one enterprise platform.
            </p>
            <div className="vf-hero-actions">
              <a href="/sign-up" className="vf-btn vf-btn-primary vf-btn-spotlight">
                Start Verifying Emails
              </a>
              <button className="vf-btn vf-btn-command" onClick={handleCommandCopy} type="button">
                <span>$</span>
                <span className={`vf-command-text ${commandBusy ? "vf-command-busy" : ""}`}>{commandText}</span>
              </button>
            </div>
          </div>

          <div className="vf-hero-visual">
            <div className="vf-orbit-shell">
              <div className="vf-orbit-ring vf-orbit-ring-one" />
              <div className="vf-orbit-ring vf-orbit-ring-two" />
              <div className="vf-orbit-core">
                <h3>VerifyFlow Agent</h3>
                <p>Supervisor</p>
              </div>
              <div className="vf-orbit-node vf-orbit-node-a">SMTP</div>
              <div className="vf-orbit-node vf-orbit-node-b">MX</div>
              <div className="vf-orbit-node vf-orbit-node-c">Risk</div>
              <div className="vf-orbit-node vf-orbit-node-d">Catch-all</div>
            </div>

            <div className="vf-hero-feed">
              {HERO_ACTIVITY.map((line) => (
                <div className="vf-hero-feed-item" key={line}>
                  <span className="vf-hero-feed-dot" />
                  <p>{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="vf-platform-band">
          <div className="vf-wrap">
            <p className="vf-band-label">The Platform</p>
            <div className="vf-platform-grid">
              <article className="vf-platform-box">
                <div className="vf-platform-head">
                  <h3>Verification Engine</h3>
                  <span>Managed SaaS</span>
                </div>
                <p className="vf-platform-tags">Syntax | MX | SMTP | Catch-all | Risk | Routing</p>
                <p>Run deep verification with consistent outcomes across every lead source.</p>
              </article>
              <div className="vf-platform-plus">+</div>
              <article className="vf-platform-box">
                <div className="vf-platform-head">
                  <h3>VerifyFlow Console</h3>
                  <span>Enterprise Cloud</span>
                </div>
                <p className="vf-platform-tags">Observability | Automation | Policies | Alerts | Exports</p>
                <p>Control verification quality from one interface with clear policy enforcement.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="vf-wrap vf-showcase">
          <div className="vf-showcase-shell">
            <div className="vf-showcase-tabs">
              {SHOWCASE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`vf-showcase-tab ${activeTab.id === tab.id ? "vf-showcase-tab-active" : ""}`}
                  onClick={() => setActiveTabId(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="vf-showcase-subhead">
              <p>{activeTab.footer}</p>
              <a href="#resources">Docs</a>
            </div>

            <div className="vf-showcase-content">
              <div className="vf-code-box">
                <pre>{activeTab.code}</pre>
              </div>
              <div className="vf-preview-box">
                <h3>{activeTab.previewTitle}</h3>
                <ul>
                  {activeTab.previewPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div className="vf-preview-metrics">
                  {activeTab.metrics.map((metric) => (
                    <div key={metric.label}>
                      <p>{metric.label}</p>
                      <span>{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="vf-wrap vf-marquee">
          <h2>Used and tested by developers at</h2>
          <MarqueeRow items={COMPANY_ROW_ONE} />
          <MarqueeRow items={COMPANY_ROW_TWO} reverse />
        </section>

        <section id="use-cases" className="vf-wrap vf-two-col">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Enterprise-level verification toolkit</p>
              <h2>Complete toolkit for enterprise email quality control</h2>
              <span>Design production-ready verification agents with unified APIs, tools, and persistent context.</span>
            </div>
          </div>

          <div className="vf-two-col-grid vf-two-col-grid-toolkit">
            <article className="vf-code-box vf-tall vf-toolkit-code">
              <div className="vf-card-topline">
                <span>{selectedToolkit.tag}</span>
                <em>{selectedToolkit.title}</em>
              </div>
              <pre>{selectedToolkit.code}</pre>
            </article>
            <div className="vf-feature-stack">
              {TOOLKIT_FEATURES.map((item) => (
                <button
                  className={`vf-feature-tile vf-feature-button ${selectedToolkit.id === item.id ? "vf-feature-tile-active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedToolkitId(item.id)}
                >
                  <div className="vf-feature-tile-head">
                    <span>{item.tag}</span>
                    <h3>{item.title}</h3>
                  </div>
                  <p>{item.description}</p>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="live-verify" className="vf-wrap vf-live">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Verification Preview</p>
              <h2>Verification access is gated behind authentication</h2>
              <span>Sign up or sign in to run single and bulk verification securely inside your workspace.</span>
            </div>
          </div>

          <div className="vf-live-banner">
            {LIVE_CAPABILITIES.map((item) => (
              <div key={item.title}>
                <p>{item.title}</p>
                <span>{item.description}</span>
                <em>{item.value}</em>
              </div>
            ))}
          </div>

          <div className="vf-live-grid">
            <article className="vf-panel">
              <div className="vf-card-topline">
                <span>Workspace</span>
                <em>Single verification</em>
              </div>
              <h3>Secure Single Checks</h3>
              <p>Run realtime checks only after authentication inside the VerifyFlow dashboard.</p>
              <div className="vf-result">
                <div className="vf-result-head">
                  <p>Access control</p>
                  <span className="vf-status vf-status-safe">Protected</span>
                </div>
                <dl className="vf-result-grid">
                  <div>
                    <dt>Auth</dt>
                    <dd>Required</dd>
                  </div>
                  <div>
                    <dt>Workspace</dt>
                    <dd>User dashboard</dd>
                  </div>
                  <div>
                    <dt>Credits</dt>
                    <dd>Enforced</dd>
                  </div>
                  <div>
                    <dt>Output</dt>
                    <dd>Job history</dd>
                  </div>
                </dl>
              </div>
              <a href="/sign-up" className="vf-btn vf-btn-primary vf-btn-spotlight">
                Start Verifying Emails
              </a>
            </article>

            <article className="vf-panel">
              <div className="vf-card-topline">
                <span>Workspace</span>
                <em>Bulk verification</em>
              </div>
              <h3>Authenticated Bulk Jobs</h3>
              <p>Upload CSV/XLSX, auto-detect email columns, and process verified results with account-level credits.</p>
              <div className="vf-result">
                <div className="vf-result-head">
                  <p>Bulk pipeline</p>
                  <span className="vf-status vf-status-safe">Dashboard only</span>
                </div>
                <ul className="vf-bulk-list">
                  <li>
                    <span>Upload spreadsheet in dashboard</span>
                    <span className="vf-status vf-status-unknown">Step 1</span>
                  </li>
                  <li>
                    <span>Choose auto-detected email column</span>
                    <span className="vf-status vf-status-unknown">Step 2</span>
                  </li>
                  <li>
                    <span>Run verified bulk job with credits</span>
                    <span className="vf-status vf-status-unknown">Step 3</span>
                  </li>
                </ul>
              </div>
              <div className="vf-hero-actions">
                <a href="/sign-in" className="vf-btn vf-btn-ghost">
                  Sign In
                </a>
                <a href="/sign-up" className="vf-btn vf-btn-primary vf-btn-spotlight">
                  Start Verifying Emails
                </a>
              </div>
            </article>
          </div>
        </section>

        <section id="resources" className="vf-wrap vf-workflow">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Workflow chain API</p>
              <h2>Orchestrate your verification agents</h2>
              <span>Build complex processing chains with declarative workflow steps.</span>
            </div>
          </div>

          <div className="vf-workflow-grid vf-workflow-grid-main">
            <article className="vf-workflow-diagram">
              <div className="vf-workflow-track">
                {WORKFLOW_STEPS.map((step, index) => (
                  <div className="vf-workflow-step" key={step.id}>
                    <span>{step.label}</span>
                    <small>{step.subtitle}</small>
                    {index < WORKFLOW_STEPS.length - 1 ? <i aria-hidden="true" /> : null}
                  </div>
                ))}
              </div>
            </article>
            <article className="vf-code-box vf-tall">
              <div className="vf-card-topline">
                <span>Example</span>
                <em>createWorkflowChain()</em>
              </div>
              <pre>{`createWorkflowChain()
  .andAll({
    id: "verify-lead",
    steps: [andAgent(verifyAgent), andAgent(riskAgent)],
  })
  .next(({ risk }) => {
    if (risk === "safe") return "crmAction";
    return "manualReview";
  });`}</pre>
            </article>
          </div>
          <div className="vf-workflow-feature-grid">
            {WORKFLOW_FEATURES.map((item) => (
              <article className="vf-feature-tile" key={item.title}>
                <p className="vf-feature-tag">{item.tag}</p>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="vf-wrap vf-testimonials">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Customer stories</p>
              <h2>What are they saying?</h2>
              <span>Operators comparing VerifyFlow with legacy verifiers and shipping cleaner lists faster.</span>
            </div>
          </div>
          <div className="vf-community-streams">
            <CommunityRow items={COMMUNITY_STREAM_ONE} />
            <CommunityRow items={COMMUNITY_STREAM_TWO} reverse />
          </div>
          <div className="vf-testimonial-marquee-wrap">
            <div className="vf-testimonial-marquee">
              {[...TESTIMONIALS_ROW_ONE, ...TESTIMONIALS_ROW_ONE].map((item, index) => (
                <article className="vf-testimonial-slide" key={`${item.person}-row1-${index}`}>
                  <div className="vf-testimonial-head">
                    <span className="vf-testimonial-avatar">{item.person.slice(0, 1)}</span>
                    <small className="vf-testimonial-outcome">{item.outcome}</small>
                  </div>
                  <p>{item.quote}</p>
                  <span>{item.person}</span>
                  <small>{item.role}</small>
                </article>
              ))}
            </div>
          </div>
          <div className="vf-testimonial-marquee-wrap">
            <div className="vf-testimonial-marquee vf-testimonial-marquee-reverse">
              {[...TESTIMONIALS_ROW_TWO, ...TESTIMONIALS_ROW_TWO].map((item, index) => (
                <article className="vf-testimonial-slide" key={`${item.person}-row2-${index}`}>
                  <div className="vf-testimonial-head">
                    <span className="vf-testimonial-avatar">{item.person.slice(0, 1)}</span>
                    <small className="vf-testimonial-outcome">{item.outcome}</small>
                  </div>
                  <p>{item.quote}</p>
                  <span>{item.person}</span>
                  <small>{item.role}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="vf-wrap vf-pricing">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Pricing</p>
              <h2>Simple pricing for every verification stage</h2>
              <span>Scale from fast experimentation to enterprise-grade verification operations.</span>
            </div>
          </div>
          <div className="vf-pricing-trial">
            <p>
              Start with <strong>100 free credits</strong> and test single + bulk verification before upgrading.
            </p>
            <a href="/sign-up" className="vf-btn vf-btn-primary">
              Claim Free Trial
            </a>
          </div>
          <div className="vf-pricing-controls">
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
            <p className="vf-pricing-provider">Secure subscription checkout powered by Paddle.</p>
          </div>
          <div className="vf-pricing-grid">
            {PRICING_PLANS.map((plan) => {
              const price = billingCycle === "annual" ? plan.annual : plan.monthly;
              return (
                <article
                  key={plan.id}
                  className={`vf-pricing-card ${plan.featured ? "vf-pricing-card-featured" : ""}`}
                >
                  <div className="vf-pricing-head">
                    <p>{plan.name}</p>
                    {plan.highlight ? <span>{plan.highlight}</span> : null}
                  </div>
                  <h3>
                    {price}
                    {price !== "Custom" ? <small>/mo</small> : null}
                  </h3>
                  <div className="vf-pricing-description">{plan.description}</div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <a
                    href={
                      plan.id === "starter"
                        ? paddleStarterUrl
                        : plan.id === "growth"
                          ? paddleGrowthUrl
                          : paddleScaleUrl
                    }
                    className={`vf-btn ${plan.featured ? "vf-btn-primary" : "vf-btn-ghost"}`}
                    target={plan.id === "scale" ? undefined : "_blank"}
                    rel={plan.id === "scale" ? undefined : "noreferrer"}
                  >
                    {plan.cta}
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        <section id="compare" className="vf-wrap vf-compare">
          <div className="vf-section-band">
            <div className="vf-section-head">
              <p>Compare tools</p>
              <h2>How VerifyFlow compares to other email verifiers</h2>
              <span>Built for high-volume teams that need accuracy, automation, and operational clarity.</span>
            </div>
          </div>
          <div className="vf-compare-shell">
            <div className="vf-compare-tabs" role="tablist" aria-label="Comparison metrics">
              {COMPARISON_ROWS.map((row) => (
                <button
                  key={row.metric}
                  type="button"
                  role="tab"
                  aria-selected={activeComparison.metric === row.metric}
                  className={`vf-compare-tab ${activeComparison.metric === row.metric ? "vf-compare-tab-active" : ""}`}
                  onClick={() => setActiveComparisonMetric(row.metric)}
                >
                  {row.metric}
                </button>
              ))}
            </div>
            <div className="vf-compare-spotlight" role="tabpanel">
              <article className="vf-compare-card vf-compare-card-primary">
                <p>VerifyFlow</p>
                <span>{activeComparison.verifyflow}</span>
              </article>
              <article className="vf-compare-card">
                <p>Legacy Verifier Tools</p>
                <span>{activeComparison.legacy}</span>
              </article>
              <article className="vf-compare-card">
                <p>Manual Process</p>
                <span>{activeComparison.manual}</span>
              </article>
            </div>
          </div>
        </section>
      </main>

      <footer className="vf-footer">
        <div className="vf-wrap vf-footer-inner">
          <a className="vf-logo vf-footer-logo" href="/">
            <span className="vf-logo-bolt">v</span>
            <span>verifyflow</span>
          </a>
          <div className="vf-footer-links">
            <a href="/pricing">Pricing</a>
            <a href="/terms">Terms</a>
            <a href="/privacy">Privacy</a>
            <a href="/refund-policy">Refunds</a>
            <a href="/admin/login">Admin</a>
          </div>
          <p>Enterprise email verification platform for growth and operations teams.</p>
        </div>
      </footer>
    </div>
  );
}

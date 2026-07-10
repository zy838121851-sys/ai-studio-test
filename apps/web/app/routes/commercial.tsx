import { Link, useLocation } from "react-router";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Database,
  FileText,
  LockKeyhole,
  MessageSquareWarning,
  Sparkles,
  UserRound
} from "lucide-react";

import "../features/commercial/commercial.css";

const pages = {
  "/pricing": { title: "Pricing", icon: Sparkles, eyebrow: "Plans" },
  "/account": { title: "Account", icon: UserRound, eyebrow: "Account" },
  "/account/billing": { title: "Billing", icon: CreditCard, eyebrow: "Billing" },
  "/account/credits": { title: "Credits", icon: BadgeCheck, eyebrow: "Credits" },
  "/account/security": { title: "Security", icon: LockKeyhole, eyebrow: "Security" },
  "/account/data": { title: "Data", icon: Database, eyebrow: "Data" },
  "/legal/terms": { title: "Terms of service", icon: FileText, eyebrow: "Legal" },
  "/legal/privacy": { title: "Privacy policy", icon: LockKeyhole, eyebrow: "Legal" },
  "/legal/refunds": { title: "Refund rules", icon: CreditCard, eyebrow: "Legal" },
  "/legal/ai-disclosure": { title: "AI service notice", icon: Sparkles, eyebrow: "Legal" },
  "/support/report": { title: "Report content", icon: MessageSquareWarning, eyebrow: "Support" },
  "/support/appeal": { title: "Appeal", icon: MessageSquareWarning, eyebrow: "Support" }
} as const;

const navItems = [
  ["/account", "Account"],
  ["/account/billing", "Billing"],
  ["/account/credits", "Credits"],
  ["/account/security", "Security"],
  ["/account/data", "Data"]
] as const;

export default function CommercialRoute() {
  const location = useLocation();
  const page = pages[location.pathname as keyof typeof pages] ?? pages["/account"];
  const Icon = page.icon;
  return (
    <main className="commercial-page">
      <header className="commercial-header">
        <Link className="commercial-back" to="/" aria-label="Back to home" title="Back to home">
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <Link className="commercial-brand" to="/">
          AI Studio
        </Link>
        <Link className="commercial-home-link" to="/canvas/new">
          Open canvas
        </Link>
      </header>
      <div className="commercial-shell">
        <aside className="commercial-nav" aria-label="Account navigation">
          <Link className={location.pathname === "/pricing" ? "is-active" : ""} to="/pricing">
            <Sparkles size={17} aria-hidden="true" /> Upgrade
          </Link>
          {navItems.map(([href, label]) => (
            <Link className={location.pathname === href ? "is-active" : ""} to={href} key={href}>
              {label}
            </Link>
          ))}
        </aside>
        <section className="commercial-content" aria-labelledby="commercial-title">
          <div className="commercial-heading">
            <span className="commercial-eyebrow">{page.eyebrow}</span>
            <h1 id="commercial-title">
              <Icon size={24} aria-hidden="true" />
              {page.title}
            </h1>
            <p>
              Commercial and compliance controls are ready for provider configuration without
              changing the existing creation workflow.
            </p>
          </div>
          {location.pathname === "/pricing" ? (
            <Pricing />
          ) : pages[location.pathname as keyof typeof pages]?.eyebrow === "Legal" ||
            pages[location.pathname as keyof typeof pages]?.eyebrow === "Support" ? (
            <CompliancePanel path={location.pathname} />
          ) : (
            <AccountPanel path={location.pathname} />
          )}
        </section>
      </div>
    </main>
  );
}

function Pricing() {
  const plans = [
    {
      name: "Free",
      price: "¥0",
      detail: "Explore the workflow",
      items: ["Model catalog", "Starter credits", "Project saving"]
    },
    {
      name: "Creator",
      price: "Pending",
      detail: "For regular creation",
      items: ["More credits", "Priority generation", "Subscription entitlements"]
    },
    {
      name: "Pro",
      price: "Pending",
      detail: "For commercial work",
      items: ["Higher credits", "Team entitlement seam", "Invoice and reconciliation"]
    }
  ];
  return (
    <div className="plan-grid">
      {plans.map((plan) => (
        <article className="plan-card" key={plan.name}>
          <span className="plan-card__name">{plan.name}</span>
          <strong>{plan.price}</strong>
          <p>{plan.detail}</p>
          <ul>
            {plan.items.map((item) => (
              <li key={item}>
                <BadgeCheck size={15} aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <button type="button" disabled>
            {plan.name === "Free" ? "Current plan" : "Available after setup"}
          </button>
        </article>
      ))}
    </div>
  );
}

function AccountPanel({ path }: { path: string }) {
  const copy: Record<string, readonly [string, string]> = {
    "/account": [
      "Account details",
      "Identity, workspace, and current entitlements are managed here."
    ],
    "/account/billing": [
      "Billing history",
      "Payment providers are not configured, so no real order or charge is created."
    ],
    "/account/credits": [
      "Credit history",
      "The credit ledger will appear after the rewrite generation flow is connected."
    ],
    "/account/security": [
      "Security and sign-in",
      "Verification, OAuth, risk controls, and sessions follow provider readiness."
    ],
    "/account/data": [
      "Data rights",
      "Export, deletion, and closure requests remain durable and auditable."
    ]
  };
  const selected =
    copy[path] ?? (["Account details", "Account controls are being prepared."] as const);
  return (
    <div className="account-panel">
      <h2>{selected[0]}</h2>
      <p>{selected[1]}</p>
      <div className="status-row">
        <span>Environment</span>
        <strong>Development provider</strong>
      </div>
      <div className="status-row">
        <span>Production actions</span>
        <strong>Unavailable</strong>
      </div>
    </div>
  );
}

function CompliancePanel({ path }: { path: string }) {
  const copy: Record<string, readonly [string, string]> = {
    "/legal/terms": [
      "Terms of service",
      "The final approved terms version will be published here before commercial launch."
    ],
    "/legal/privacy": [
      "Privacy policy",
      "Data collection, retention, processors, and cross-border model policy must be approved before release."
    ],
    "/legal/refunds": [
      "Refund rules",
      "Refund eligibility and merchant evidence will be displayed before payment is enabled."
    ],
    "/legal/ai-disclosure": [
      "AI service notice",
      "Generated media will carry the required AI service and content-labeling notice."
    ],
    "/support/report": [
      "Report content",
      "Reports are authenticated, durable, auditable, and fail closed until moderation service is configured."
    ],
    "/support/appeal": [
      "Appeal",
      "Appeals will be queued for review and will not claim success until a real review workflow is available."
    ]
  };
  const selected =
    copy[path] ?? (["Compliance", "This compliance workflow is being prepared."] as const);
  return (
    <div className="account-panel">
      <h2>{selected[0]}</h2>
      <p>{selected[1]}</p>
      <div className="status-row">
        <span>Workflow state</span>
        <strong>Provider not configured</strong>
      </div>
      <button className="compliance-disabled" type="button" disabled>
        Available after setup
      </button>
    </div>
  );
}

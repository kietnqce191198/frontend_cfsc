import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getPrimaryAdminAction, getVisibleAdminSections } from "../lib/adminWorkspace";

const getStoredProfile = () => {
  const rawProfile = localStorage.getItem("accountProfile");
  if (!rawProfile) {
    return null;
  }

  try {
    return JSON.parse(rawProfile);
  } catch {
    return null;
  }
};

const DASHBOARD_SIGNAL_CARDS = [
  {
    title: "Catalog readiness",
    description: "Align categories, products, and production inputs before storefront demand shifts.",
    icon: "fas fa-box-open",
  },
  {
    title: "Demand levers",
    description: "Control campaigns, coupon inventory, and loyalty incentives from the same workspace.",
    icon: "fas fa-bullhorn",
  },
  {
    title: "Access control",
    description: "Keep team access and customer-linked accounts governed without leaving the operations view.",
    icon: "fas fa-user-shield",
  },
];

function AdminDashboard() {
  const profile = useMemo(() => getStoredProfile(), []);
  const workspaceSections = useMemo(() => getVisibleAdminSections(profile), [profile]);
  const primaryAction = useMemo(() => getPrimaryAdminAction(profile), [profile]);
  const totalModules = workspaceSections.reduce((count, section) => count + section.items.length, 0);
  const primaryLane = workspaceSections.find((section) => section.id !== "command") || workspaceSections[0] || null;

  return (
    <div className="ops-dashboard">
      <section className="ops-hero">
        <div className="ops-hero-copy">
          <span className="ops-eyebrow">Operations Workspace</span>
          <h1>Supply Chain Command Center</h1>
          <p>
            Keep catalog structure, production readiness, campaign demand, and workspace control aligned from one
            internal command layer.
          </p>

          <div className="ops-hero-actions">
            {primaryAction && (
              <Link to={primaryAction.to} className="ops-primary-link">
                Open {primaryAction.label}
              </Link>
            )}
            <Link to="/admin/account" className="ops-secondary-link">
              Review access profile
            </Link>
          </div>
        </div>

        <div className="ops-hero-panel">
          <div className="ops-hero-panel-card">
            <span>Workspace mode</span>
            <strong>Supply Chain</strong>
            <p>Internal-only flow for operators, managers, and governance teams.</p>
          </div>
          <div className="ops-hero-panel-card">
            <span>Visible modules</span>
            <strong>{totalModules}</strong>
            <p>Permission-aware entry points currently available in this workspace.</p>
          </div>
          <div className="ops-hero-panel-card">
            <span>Primary lane</span>
            <strong>{primaryLane?.label || "Command Layer"}</strong>
            <p>{primaryLane?.description || "Use the command layer to branch into the right operational lane."}</p>
          </div>
        </div>
      </section>

      <section className="ops-signal-grid" aria-label="Operational signals">
        {DASHBOARD_SIGNAL_CARDS.map((card) => (
          <article key={card.title} className="ops-signal-card">
            <div className="ops-signal-icon">
              <i className={card.icon}></i>
            </div>
            <div>
              <h2>{card.title}</h2>
              <p>{card.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="ops-lanes">
        <div className="ops-section-heading">
          <span className="ops-section-kicker">Operational Lanes</span>
          <h2>Move through the workspace by function</h2>
          <p>Each lane groups the tools that belong together in a supply-chain-style operations flow.</p>
        </div>

        <div className="ops-lane-grid">
          {workspaceSections.map((section) => (
            <article key={section.id} className="ops-lane-card">
              <div className="ops-lane-head">
                <span className="ops-lane-label">{section.label}</span>
                <p>{section.description}</p>
              </div>

              <div className="ops-lane-links">
                {section.items.map((item) => (
                  <Link key={item.id} to={item.to} className="ops-lane-link">
                    <div className="ops-lane-link-icon">
                      <i className={item.icon}></i>
                    </div>
                    <div className="ops-lane-link-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </div>
                    <i className="fas fa-arrow-right ops-lane-link-arrow"></i>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;

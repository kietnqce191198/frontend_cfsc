import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../admin.css";
import { getVisibleAdminSections } from "../lib/adminWorkspace";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";
const ACCOUNT_PROFILE_UPDATED_EVENT = "account-profile-updated";

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

const getDisplayName = (profile) =>
  profile?.fullName?.trim() ||
  profile?.username?.trim() ||
  profile?.email?.split("@")[0] ||
  "Operator";

const getInitials = (value) => {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "SC";
  }

  return parts.map((part) => part[0].toUpperCase()).join("");
};

function AdminLayout() {
  const navigate = useNavigate();
  const userMenuRef = useRef(null);
  const [profile, setProfile] = useState(() => getStoredProfile());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  useEffect(() => {
    const syncProfile = () => {
      setProfile(getStoredProfile());
    };

    window.addEventListener("storage", syncProfile);
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, syncProfile);
    return () => {
      window.removeEventListener("storage", syncProfile);
      window.removeEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, syncProfile);
    };
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  const displayName = useMemo(() => getDisplayName(profile), [profile]);
  const avatarInitials = useMemo(() => getInitials(displayName), [displayName]);
  const workspaceSections = useMemo(
    () => getVisibleAdminSections(profile).filter((section) => section.id !== "command"),
    [profile],
  );

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    const token = localStorage.getItem("accessToken");

    if (token) {
      try {
        await axios.post(
          `${API_BASE_URL}/api/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
      } catch (error) {
        console.error("Unable to notify backend about logout.", error);
      }
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("email");
    localStorage.removeItem("accountProfile");
    localStorage.removeItem("username");

    navigate("/", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-kicker">Velvet Ember</span>
          <h2 className="sidebar-title">Supply Chain</h2>
          <p className="sidebar-subtitle">
            Internal workspace for catalog readiness, demand programs, and team control.
          </p>
        </div>

        <div className="sidebar-home">
          <Link to="/admin">
            <i className="fas fa-compass" style={{ marginRight: "8px" }}></i>
            Command Center
          </Link>
        </div>

        <NavLink to="/admin/account" className={({ isActive }) => `sidebar-utility-link${isActive ? " active" : ""}`}>
          <i className="fas fa-id-card" style={{ width: "18px", marginRight: "10px" }}></i>
          Profile Settings
        </NavLink>

        <nav className="sidebar-menu" aria-label="Supply chain workspace navigation">
          {workspaceSections.map((section) => (
            <div key={section.id} className="sidebar-section">
              <div className="sidebar-section-head">
                <span className="sidebar-section-label">{section.label}</span>
                <p className="sidebar-section-copy">{section.description}</p>
              </div>

              <div className="sidebar-section-links">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
                  >
                    <i className={`${item.icon} sidebar-item-icon`} aria-hidden="true"></i>
                    <span className="sidebar-item-copy">
                      <span className="sidebar-item-label">{item.label}</span>
                      <small className="sidebar-item-description">{item.description}</small>
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer-note">
          Storefront stays separate from this internal workspace so supply-chain tasks keep a focused flow.
        </div>
      </aside>

      <main className="admin-content">
        <header className="admin-header admin-header-enhanced">
          <div>
            <span className="admin-header-eyebrow">supply chain workspace</span>
            <div className="admin-welcome">Command center ready for {displayName}</div>
          </div>

          <div className="admin-header-actions">
            <button className="back-home-btn" onClick={() => navigate("/admin")}>
              Command Center
            </button>

            <div
              className={`user-menu-container admin-user-menu ${isUserMenuOpen ? "open" : ""}`}
              ref={userMenuRef}
            >
              <button
                type="button"
                className="user-profile-trigger admin-profile-trigger"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isUserMenuOpen}
              >
                {profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={displayName}
                    className="user-avatar"
                  />
                ) : (
                  <span className="user-avatar-placeholder">{avatarInitials}</span>
                )}
                <span className="user-profile-text admin-profile-text">
                  <strong className="admin-profile-name">{displayName}</strong>
                  <small className="admin-profile-label">Supply-chain account</small>
                </span>
                <i className="fas fa-chevron-down user-profile-caret admin-profile-caret"></i>
              </button>

              <div className="user-dropdown" role="menu">
                <button type="button" onClick={() => navigate("/admin/account")}>
                  Profile Settings
                </button>
                <button type="button" onClick={() => navigate("/admin")}>
                  Command Center
                </button>
                <button type="button" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="admin-shell">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AdminLayout;

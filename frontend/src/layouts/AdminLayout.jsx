
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import axios from "axios";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "../admin.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

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
  "Admin";

const getInitials = (value) => {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) {
    return "A";
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
    return () => window.removeEventListener("storage", syncProfile);
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
          }
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
        <h2 className="sidebar-title">Admin Panel</h2>

        <div className="sidebar-home">
          <Link to="/">
             <i className="fas fa-arrow-left" style={{ marginRight: "8px" }}></i>
             Back to Home
          </Link>
        </div>

        <nav className="sidebar-menu">

          {/* USER MANAGEMENT */}
          <NavLink to="/admin/users" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-user-shield" style={{ width: "20px", marginRight: "10px" }}></i>
            Users
          </NavLink>

          <NavLink to="/admin/permissions" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-key" style={{ width: "20px", marginRight: "10px" }}></i>
            Permissions
          </NavLink>

          <NavLink to="/admin/roles" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-user-tag" style={{ width: "20px", marginRight: "10px" }}></i>
            Roles
          </NavLink>
          
          <NavLink to="/admin/segments" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-users-cog" style={{ width: "20px", marginRight: "10px" }}></i>
            Customer Segments
          </NavLink>

          <NavLink to="/admin/loyalty-studio" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-gem" style={{ width: "20px", marginRight: "10px" }}></i>
            Loyalty Studio
          </NavLink>

          <NavLink to="/admin/promotions" className={({ isActive }) => isActive ? "active" : ""}>
                      <i className="fas fa-rectangle-ad" style={{ width: "20px", marginRight: "10px" }}></i>
                      Promotions
                    </NavLink>

          <NavLink to="/admin/coupons" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-users-cog" style={{ width: "20px", marginRight: "10px" }}></i>
            Coupon
          </NavLink>

          <NavLink to="/admin/categories" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-sitemap" style={{ width: "20px", marginRight: "10px" }}></i>
            Categories
          </NavLink>

          <NavLink to="/admin/products" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-users-cog" style={{ width: "20px", marginRight: "10px" }}></i>
            Products
          </NavLink>

          <NavLink to="/admin/loyalty" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-gem" style={{ width: "20px", marginRight: "10px" }}></i>
            Loyalty Manage
          </NavLink>
          <NavLink to="/admin/product-image" className={({ isActive }) => isActive ? "active" : ""}>
            <i className="fas fa-images" style={{ width: "20px", marginRight: "10px" }}></i>
            Product Images
          </NavLink>
        </nav>

        {/* 🔥 LOGOUT BUTTON */}
        <div style={{ marginTop: "20px" }}>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>

      </aside>

      <main className="admin-content">
        <header className="admin-header admin-header-enhanced">
          <div>
            <span className="admin-header-eyebrow">back office</span>
            <div className="admin-welcome">
              Welcome {profile?.username || profile?.email || "Admin"}
            </div>
          </div>

          <div className="admin-header-actions">
            <button className="back-home-btn" onClick={() => navigate("/")}>
              Back to Home
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
                  <small className="admin-profile-label">Admin account</small>
                </span>
                <i className="fas fa-chevron-down user-profile-caret admin-profile-caret"></i>
              </button>

              <div className="user-dropdown" role="menu">
                <button type="button" onClick={() => navigate("/account")}>
                  My Account
                </button>
                <button type="button" onClick={() => navigate("/")}>
                  Home
                </button>
                <button type="button" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Nội dung trang admin sẽ render ở đây */}
        <section style={{ padding: "20px" }}>
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AdminLayout;
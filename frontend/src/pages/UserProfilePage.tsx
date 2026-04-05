import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { userApi } from "../services/api";
import "../assets/style.css";
import "../admin.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

type UserProfile = {
  userId: number;
  username?: string | null;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  status?: string | null;
  roles?: string[] | null;
  last_login_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type MessageState = {
  type: "error" | "success";
  text: string;
} | null;

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    return error.message || "Request failed.";
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error.";
};

const formatText = (value?: string | null) => value?.trim() || "Not set";

const formatEnumValue = (value?: string | null) =>
  value
    ? value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    : "Not set";

const formatDate = (value?: string | null) => {
  if (!value) return "Not set";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getInitials = (value?: string | null) => {
  const fallback = (value || "User").trim();
  const parts = fallback.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "US";
  return parts.map((part) => part[0].toUpperCase()).join("");
};

const formatRoleList = (roles?: string[] | null) => {
  if (!Array.isArray(roles) || roles.length === 0) return "Not set";

  return roles
    .map((role) => role?.replace(/^ROLE_/i, "").replace(/_/g, " ").trim())
    .filter(Boolean)
    .map((role) => role.replace(/\b\w/g, (char) => char.toUpperCase()))
    .join(", ");
};

const resolveUserProfile = (payload: unknown): UserProfile | null => {
  if (!payload || typeof payload !== "object") return null;
  const maybeEnvelope = payload as { data?: unknown };
  const data = maybeEnvelope.data && typeof maybeEnvelope.data === "object"
    ? maybeEnvelope.data
    : payload;

  return data as UserProfile;
};

const UserProfilePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminContext = location.pathname.startsWith("/admin/");
  const numericUserId = Number(userId);
  const roleLabel = formatRoleList(profile?.roles);

  useEffect(() => {
    let isMounted = true;

    if (!Number.isFinite(numericUserId)) {
      setMessage({ type: "error", text: "Invalid user id." });
      setIsLoading(false);
      return undefined;
    }

    const loadProfile = async () => {
      try {
        const response = await userApi.getUserProfile(numericUserId);
        const nextProfile = resolveUserProfile(response);
        if (!nextProfile) {
          throw new Error("Unexpected user profile payload.");
        }
        if (!isMounted) return;
        setProfile(nextProfile);
        setMessage(null);
      } catch (error) {
        if (!isMounted) return;
        setMessage({ type: "error", text: getErrorMessage(error) });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [numericUserId]);

  const renderHeroActions = () => {
    if (isAdminContext) {
      return (
        <>
          <button type="button" className="customer-profile-action-btn" onClick={() => navigate("/admin/users")}>
            <i className="fas fa-arrow-left"></i>
            <span>Back to User Directory</span>
          </button>
          <Link to="/admin/account" className="customer-profile-action-btn secondary">
            <i className="fas fa-id-card"></i>
            <span>Profile Settings</span>
          </Link>
        </>
      );
    }

    return (
      <>
        <Link to="/" className="customer-profile-action-btn secondary">
          <i className="fas fa-house"></i>
          <span>Storefront</span>
        </Link>
        <Link to="/change-password" className="customer-profile-action-btn secondary">
          <i className="fas fa-key"></i>
          <span>Change Password</span>
        </Link>
        <Link to="/account" className="customer-profile-action-btn">
          <i className="fas fa-pen"></i>
          <span>Edit Profile</span>
        </Link>
      </>
    );
  };

  const content = (
    <div className={`admin-container customer-profile-shell ${isAdminContext ? "customer-profile-admin" : "customer-profile-public"}`}>
      {isAdminContext && (
        <div className="customer-profile-toolbar">
          <button type="button" className="create-btn" onClick={() => navigate("/admin/users")}>
            Back to User Directory
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state">
          <i className="fas fa-spinner fa-spin"></i>
          <span>Loading profile...</span>
        </div>
      ) : message && message.type === "error" && !profile ? (
        <div className="error-card">
          <h3>Unable to load profile</h3>
          <p>{message.text}</p>
        </div>
      ) : profile ? (
        <>
          {message && (
            <div className={`customer-message-banner ${message.type}`}>
              <i className={`fas ${message.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`}></i>
              <span>{message.text}</span>
            </div>
          )}

          <section className="customer-profile-hero">
            <div className="customer-profile-hero-main">
              <div className="customer-profile-avatar-frame">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="customer-profile-avatar" />
                ) : (
                  <span className="customer-profile-avatar-fallback">{getInitials(profile.full_name || profile.email)}</span>
                )}
              </div>
              <div className="customer-profile-hero-copy">
                <span className="customer-profile-eyebrow">User Profile</span>
                <h2>{profile.full_name}</h2>
                <p>{profile.email}</p>
                <div className="customer-profile-subline">
                  <span>{profile.username ? `@${profile.username}` : "No username"}</span>
                  <span>{formatText(profile.phone)}</span>
                </div>
              </div>
            </div>
            <div className="customer-profile-hero-side">
              <div className="customer-profile-quick-actions">{renderHeroActions()}</div>
              <div className="customer-profile-badges">
                <span className="customer-profile-badge">{roleLabel}</span>
                <span className="customer-profile-badge subtle">{formatEnumValue(profile.status)}</span>
              </div>
            </div>
          </section>

          <section className="customer-profile-grid customer-profile-grid-main">
            <article className="customer-profile-card">
              <h3>Access & Permissions</h3>
              <div className="customer-profile-meta">
                <div><span>User ID</span><strong>{profile.userId}</strong></div>
                <div><span>Username</span><strong>{profile.username ? `@${profile.username}` : "Not set"}</strong></div>
                <div><span>Email</span><strong>{formatText(profile.email)}</strong></div>
                <div><span>Roles</span><strong>{roleLabel}</strong></div>
                <div><span>Status</span><strong>{formatEnumValue(profile.status)}</strong></div>
                <div><span>Last Login</span><strong>{formatDateTime(profile.last_login_at)}</strong></div>
              </div>
            </article>
            <article className="customer-profile-card">
              <h3>Personal Details</h3>
              <div className="customer-profile-meta">
                <div><span>Phone</span><strong>{formatText(profile.phone)}</strong></div>
                <div><span>Gender</span><strong>{formatEnumValue(profile.gender)}</strong></div>
                <div><span>Date of Birth</span><strong>{formatDate(profile.date_of_birth)}</strong></div>
                <div><span>Created At</span><strong>{formatDateTime(profile.created_at)}</strong></div>
                <div><span>Updated At</span><strong>{formatDateTime(profile.updated_at)}</strong></div>
              </div>
            </article>
          </section>

          <section className="customer-profile-grid customer-profile-grid-main">
            <article className="customer-profile-card">
              <h3>Primary Address</h3>
              <div className="customer-profile-address">{formatText(profile.address)}</div>
              <p className="customer-profile-address-note">
                This page shows the account profile data managed by auth-service.
              </p>
            </article>
            <article className="customer-profile-card">
              <h3>Customer-facing Data</h3>
              <div className="customer-empty">
                Loyalty activity, recent orders, and saved delivery addresses stay on the customer profile page.
                This back-office view stays focused on account access and profile details.
              </div>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );

  if (isAdminContext) {
    return content;
  }

  return (
    <div className="account-page customer-profile-page">
      <header className="header active">
        <div className="container d-flex align-items-center w-100">
          <Link to="/" className="logo">
            <i className="fas fa-mug-hot"></i> coffee
          </Link>
          <div className="account-page-actions">
            <button type="button" className="link-btn account-top-btn" onClick={() => navigate(-1)}>
              <i className="fas fa-arrow-left"></i>
              <span>Back</span>
            </button>
          </div>
        </div>
      </header>
      <section className="account-page-shell customer-profile-public-shell">
        <div className="customer-profile-public-container">{content}</div>
      </section>
    </div>
  );
};

export default UserProfilePage;

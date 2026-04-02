import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { customerApi } from "../services/api";
import "../assets/style.css";
import "../admin.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

type CustomerProfileSummary = {
  total_orders: number;
  total_spent: number | string;
  average_order_value: number | string;
  last_order_date?: string | null;
};

type CustomerProfileLoyalty = {
  current_tier?: string | null;
  current_points?: number | null;
};

type CustomerProfileOrder = {
  order_id: number;
  order_number: string;
  status: string;
  total_amount: number | string;
  created_at: string;
  items_count: number;
};

type CustomerProfileAddress = {
  address_id: number;
  address_line: string;
  is_default?: boolean | null;
};

type CustomerProfile = {
  customer_id: number;
  customer_code: string;
  full_name: string;
  avatar_url?: string | null;
  email: string;
  phone: string;
  address?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  status?: string | null;
  created_at?: string | null;
  summary: CustomerProfileSummary;
  loyalty?: CustomerProfileLoyalty | null;
  orders?: CustomerProfileOrder[] | null;
  addresses?: CustomerProfileAddress[] | null;
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

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const formatCurrency = (value?: number | string | null) => {
  const numeric = typeof value === "string" ? Number(value) : value ?? 0;
  if (!Number.isFinite(numeric)) return currencyFormatter.format(0);
  return currencyFormatter.format(numeric);
};

const getInitials = (value?: string | null) => {
  const fallback = (value || "Customer").trim();
  const parts = fallback.split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "CU";
  return parts.map((part) => part[0].toUpperCase()).join("");
};

const getAddressHeadline = (addressLine: string) => {
  const parts = addressLine.split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : addressLine;
};

const getAddressDetail = (addressLine: string) => {
  const headline = getAddressHeadline(addressLine);
  return headline === addressLine ? `Saved delivery address` : addressLine;
};

const CustomerProfilePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customerId } = useParams();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [addressError, setAddressError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAddressLine, setNewAddressLine] = useState("");
  const [isNewAddressDefault, setIsNewAddressDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [addressToDelete, setAddressToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdminContext = location.pathname.startsWith("/admin/");
  const numericCustomerId = Number(customerId);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const fetchCustomerProfile = useCallback(async () => {
    const response = await customerApi.getCustomerProfile(numericCustomerId, "loyalty,orders,addresses");
    const nextProfile = response.data?.data || response.data;
    setProfile(nextProfile);
  }, [numericCustomerId]);

  useEffect(() => {
    let isMounted = true;
    if (!Number.isFinite(numericCustomerId)) {
      setMessage({ type: "error", text: "Invalid customer id." });
      setIsLoading(false);
      return undefined;
    }

    const loadProfile = async () => {
      try {
        const response = await customerApi.getCustomerProfile(numericCustomerId, "loyalty,orders,addresses");
        const nextProfile = response.data?.data || response.data;
        if (!isMounted) return;
        setProfile(nextProfile);
      } catch (error) {
        if (!isMounted) return;
        setMessage({ type: "error", text: getErrorMessage(error) });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProfile();
    return () => { isMounted = false; };
  }, [numericCustomerId]);

  const summaryCards = useMemo(() => {
    if (!profile) return [];
    return [
      { label: "Total Orders", value: String(profile.summary?.total_orders ?? 0), icon: "fas fa-bag-shopping" },
      { label: "Total Spent", value: formatCurrency(profile.summary?.total_spent), icon: "fas fa-wallet" },
      { label: "Average Order", value: formatCurrency(profile.summary?.average_order_value), icon: "fas fa-chart-line" },
      { label: "Last Order", value: formatDateTime(profile.summary?.last_order_date), icon: "fas fa-clock-rotate-left" },
    ];
  }, [profile]);

  const handleSetDefaultAddress = async (addressId: number) => {
    try {
      await customerApi.setDefaultAddress(numericCustomerId, addressId);
      setProfile((prevProfile) => {
        if (!prevProfile || !prevProfile.addresses) return prevProfile;
        const updatedAddresses = prevProfile.addresses.map((addr) => ({
          ...addr,
          is_default: addr.address_id === addressId,
        }));
        return { ...prevProfile, addresses: updatedAddresses };
      });
      setToastMessage({ type: "success", text: "Default delivery address updated successfully." });
    } catch (error) {
      setToastMessage({ type: "error", text: getErrorMessage(error) });
    }
  };

  const handleOpenAddAddressModal = () => {
    const currentAddressesCount = profile?.addresses?.length || 0;
    if (currentAddressesCount >= 5) {
        setToastMessage({ type: "error", text: "Address limit reached (max 5 saved addresses allowed)." });
        return;
    }
    setNewAddressLine("");
    setIsNewAddressDefault(false);
    setAddressError("");
    setIsModalOpen(true);
  };

  const handleAddNewAddress = async (event: FormEvent) => {
    event.preventDefault();
    if (!newAddressLine.trim()) {
      setAddressError("Address line cannot be empty.");
      return;
    }
    setAddressError("");
    setIsSavingAddress(true);
    try {
      await customerApi.addCustomerAddress(numericCustomerId, {
        addressLine: newAddressLine.trim(),
        isDefault: isNewAddressDefault,
      });
      setIsModalOpen(false);
      setNewAddressLine("");
      setIsNewAddressDefault(false);
      setToastMessage({ type: "success", text: "Delivery address added successfully." });
      await fetchCustomerProfile();
    } catch (error) {
      setAddressError(getErrorMessage(error));
    } finally {
      setIsSavingAddress(false);
    }
  };

  const executeDeleteAddress = async () => {
    if (!addressToDelete) return;

    setIsDeleting(true);
    try {
      await customerApi.deleteCustomerAddress(numericCustomerId, addressToDelete);

      setProfile((prevProfile) => {
        if (!prevProfile || !prevProfile.addresses) return prevProfile;
        return {
          ...prevProfile,
          addresses: prevProfile.addresses.filter((addr) => addr.address_id !== addressToDelete),
        };
      });

      setToastMessage({ type: "success", text: "Address deleted successfully." });
    } catch (error) {
      setToastMessage({ type: "error", text: getErrorMessage(error) });
    } finally {
      setIsDeleting(false);
      setAddressToDelete(null);
    }
  };
  // ------------------------------------------------

  const renderHeroActions = () => {
    if (isAdminContext) {
      return (
        <>
          <button type="button" className="customer-profile-action-btn" onClick={() => navigate("/admin/users")}>
            <i className="fas fa-arrow-left"></i><span>Back to Users</span>
          </button>
          <Link to="/" className="customer-profile-action-btn secondary"><i className="fas fa-house"></i><span>Home</span></Link>
        </>
      );
    }
    return (
      <>
        <Link to="/" className="customer-profile-action-btn secondary"><i className="fas fa-house"></i><span>Home</span></Link>
        <Link to="/change-password" className="customer-profile-action-btn secondary"><i className="fas fa-key"></i><span>Change Password</span></Link>
        <Link to="/account" className="customer-profile-action-btn"><i className="fas fa-pen"></i><span>Update Profile</span></Link>
      </>
    );
  };

  const toastElement = toastMessage && (
    <div style={{
      position: 'fixed', top: '30px', right: '30px',
      backgroundColor: toastMessage.type === 'success' ? '#28a745' : '#dc3545',
      color: '#fff', padding: '16px 24px', borderRadius: '8px',
      boxShadow: '0 4px 15px rgba(0,0,0,0.3)', zIndex: 99999999,
      display: 'flex', alignItems: 'center', gap: '12px',
      fontWeight: '600', fontSize: '16px', transition: 'all 0.3s ease-in-out',
      animation: 'slideIn 0.3s forwards'
    }}>
        <i className={toastMessage.type === 'success' ? "fas fa-check-circle" : "fas fa-exclamation-circle"} style={{ fontSize: '22px' }}></i>
        {toastMessage.text}
        <button type="button" onClick={() => setToastMessage(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '10px', fontSize: '18px' }}>
          <i className="fas fa-times"></i>
        </button>
    </div>
  );

  const content = (
    <div className={`admin-container customer-profile-shell ${isAdminContext ? "customer-profile-admin" : "customer-profile-public"}`}>
      {isAdminContext && (
        <div className="customer-profile-toolbar">
          <button type="button" className="create-btn" onClick={() => navigate("/admin/users")}>Back to Users</button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-state"><i className="fas fa-spinner fa-spin"></i><span>Loading customer profile...</span></div>
      ) : message && message.type === "error" && !profile ? (
        <div className="error-card"><h3>Unable to load customer profile</h3><p>{message.text}</p></div>
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
                <span className="customer-profile-eyebrow">customer profile</span>
                <h2>{profile.full_name}</h2>
                <p>{profile.email}</p>
                <div className="customer-profile-subline">
                  <span>{profile.customer_code}</span>
                  <span>{formatText(profile.phone)}</span>
                </div>
              </div>
            </div>
            <div className="customer-profile-hero-side">
              <div className="customer-profile-quick-actions">{renderHeroActions()}</div>
              <div className="customer-profile-badges">
                <span className="customer-profile-badge">{profile.customer_code}</span>
                <span className="customer-profile-badge subtle">{formatEnumValue(profile.status)}</span>
              </div>
            </div>
          </section>

          <section className="customer-profile-grid customer-profile-grid-main">
            <article className="customer-profile-card">
              <h3>Identity</h3>
              <div className="customer-profile-meta">
                <div><span>Phone</span><strong>{formatText(profile.phone)}</strong></div>
                <div><span>Gender</span><strong>{formatEnumValue(profile.gender)}</strong></div>
                <div><span>Date of Birth</span><strong>{formatDate(profile.date_of_birth)}</strong></div>
                <div><span>Created At</span><strong>{formatDateTime(profile.created_at)}</strong></div>
              </div>
            </article>
            <article className="customer-profile-card">
              <h3>Personal Address</h3>
              <div className="customer-profile-address">{formatText(profile.address)}</div>
              <p className="customer-profile-address-note">This is the personal address stored in the auth-service user profile.</p>
            </article>
          </section>

          <section className="customer-section">
            <div className="customer-section-head">
              <div><h3>Summary Stats</h3><p>Key order metrics for this customer.</p></div>
            </div>
            <div className="customer-stat-grid">
              {summaryCards.map((item) => (
                <article key={item.label} className="customer-stat-card">
                  <div className="customer-stat-icon"><i className={item.icon}></i></div>
                  <span>{item.label}</span><strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="customer-section">
            <div className="customer-section-head">
              <div><h3>Loyalty</h3><p>Current loyalty tier and available points.</p></div>
            </div>
            {profile.loyalty ? (
              <div className="customer-profile-grid customer-profile-grid-tight">
                <article className="customer-profile-card">
                  <h3>Current Tier</h3><div className="customer-profile-highlight">{formatEnumValue(profile.loyalty.current_tier)}</div>
                </article>
                <article className="customer-profile-card">
                  <h3>Current Points</h3><div className="customer-profile-highlight">{profile.loyalty.current_points ?? 0}</div>
                </article>
              </div>
            ) : (<div className="customer-empty">No loyalty data included for this customer.</div>)}
          </section>

          <section className="customer-section">
            <div className="customer-section-head">
              <div><h3>Recent Orders</h3><p>The latest five orders returned by the backend.</p></div>
            </div>
            {profile.orders && profile.orders.length > 0 ? (
              <div className="customer-list">
                {profile.orders.map((order) => (
                  <article key={order.order_id} className="customer-list-row">
                    <div><strong>{order.order_number}</strong><span>{formatEnumValue(order.status)}</span></div>
                    <div><strong>{formatCurrency(order.total_amount)}</strong><span>{order.items_count} item(s)</span></div>
                    <div><strong>{formatDateTime(order.created_at)}</strong><span>Order #{order.order_id}</span></div>
                  </article>
                ))}
              </div>
            ) : (<div className="customer-empty">No recent orders available.</div>)}
          </section>

          <section className="customer-section">
            <div className="customer-section-head customer-section-head-split">
              <div>
                <h3>Saved Addresses</h3>
                <p>Delivery addresses returned from the customer-service address store. Each customer can save up to 5 addresses.</p>
              </div>
              {!isAdminContext && (
                <button type="button" className="customer-address-add-btn" onClick={handleOpenAddAddressModal}>
                  <i className="fas fa-plus"></i><span>Add New Address</span>
                </button>
              )}
            </div>

            {profile.addresses && profile.addresses.length > 0 ? (
              <div className="customer-list customer-address-list">
                {profile.addresses.map((address) => (
                  <article
                    key={address.address_id}
                    className="customer-list-row customer-address-row"
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    <div style={{ flex: 1 }}>
                      <strong className="customer-address-row-title">{getAddressHeadline(address.address_line)}</strong>
                      <span className="customer-address-row-detail">{getAddressDetail(address.address_line)}</span>
                    </div>

                    <div style={{ flex: 1 }}>
                      <strong>{address.is_default ? "Default" : "Saved"}</strong>
                      <span>{address.is_default ? "Primary delivery address" : `Address #${address.address_id}`}</span>
                    </div>

                    <div
                      className="customer-address-action-group"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px', minWidth: '220px' }}
                    >
                      {address.is_default ? (
                        <span className="customer-address-status">
                          <i className="fas fa-check-circle"></i> Default Address
                        </span>
                      ) : !isAdminContext ? (
                        <button type="button" className="customer-address-primary-btn" onClick={() => handleSetDefaultAddress(address.address_id)}>
                          Set as Default
                        </button>
                      ) : (
                        <span className="customer-address-row-detail">Delivery address</span>
                      )}

                      {!isAdminContext && (
                        <button
                          type="button"
                          title="Delete address"
                          style={{
                            background: 'none', border: 'none', color: '#dc3545',
                            cursor: 'pointer', fontSize: '18px', padding: '5px'
                          }}
                          onClick={() => setAddressToDelete(address.address_id)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="customer-empty">No saved addresses available.</div>
            )}
          </section>

          {isModalOpen && (
            <div className="customer-address-modal-backdrop">
              <div className="customer-address-modal">
                <div className="customer-address-modal-head">
                  <div><h3>Add New Address</h3><p>Create a new delivery address for this customer.</p></div>
                  <button type="button" className="customer-address-modal-close" onClick={() => setIsModalOpen(false)} aria-label="Close add address modal">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <form onSubmit={handleAddNewAddress} className="customer-address-form">
                  <label className="customer-address-field" htmlFor="new-address-line" style={{ color: addressError ? '#dc3545' : 'inherit' }}>
                    <span>
                      Delivery Address
                      {addressError && <span style={{ fontWeight: 'normal', marginLeft: '8px' }}>({addressError})</span>}
                    </span>
                    <textarea
                      id="new-address-line" rows={4} value={newAddressLine}
                      onChange={(event) => {
                        setNewAddressLine(event.target.value);
                        if (addressError) setAddressError("");
                      }}
                      placeholder="123 Main Street, District 1, Ho Chi Minh City"
                      style={{ border: addressError ? '1px solid #dc3545' : undefined }}

                    />
                  </label>
                  <label className="customer-address-checkbox" htmlFor="new-address-default">
                    <input id="new-address-default" type="checkbox" checked={isNewAddressDefault} onChange={(event) => setIsNewAddressDefault(event.target.checked)}/>
                    <span>Set as default delivery address</span>
                  </label>
                  <div className="customer-address-modal-actions">
                    <button type="button" className="customer-profile-action-btn secondary" onClick={() => setIsModalOpen(false)} disabled={isSavingAddress}>Cancel</button>
                    <button type="submit" className="customer-profile-action-btn" disabled={isSavingAddress}>
                      <i className={`fas ${isSavingAddress ? "fa-spinner fa-spin" : "fa-floppy-disk"}`}></i>
                      <span>{isSavingAddress ? "Saving..." : "Save Address"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {addressToDelete !== null && (
            <div className="customer-address-modal-backdrop">
              <div className="customer-address-modal" style={{ maxWidth: '450px' }}>
                <div className="customer-address-modal-head" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <div>
                    <h3 style={{ color: '#dc3545' }}><i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>Delete Address</h3>
                    <p style={{ marginTop: '10px' }}>Are you sure you want to delete this address? This action cannot be undone.</p>
                  </div>
                  <button type="button" className="customer-address-modal-close" onClick={() => setAddressToDelete(null)} disabled={isDeleting}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <div className="customer-address-modal-actions" style={{ marginTop: '30px' }}>
                    <button type="button" className="customer-profile-action-btn secondary" onClick={() => setAddressToDelete(null)} disabled={isDeleting}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="customer-profile-action-btn"
                      style={{ backgroundColor: '#dc3545', borderColor: '#dc3545', color: '#fff' }}
                      onClick={executeDeleteAddress}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <><i className="fas fa-spinner fa-spin"></i><span>Deleting...</span></>
                      ) : (
                        <><i className="fas fa-trash-alt"></i><span>Delete Address</span></>
                      )}
                    </button>
                </div>
              </div>
            </div>
          )}

        </>
      ) : null}
    </div>
  );

  if (isAdminContext) return <>{toastElement}{content}</>;

  return (
    <>
      {toastElement}
      <div className="account-page customer-profile-page">
        <header className="header active">
          <div className="container d-flex align-items-center w-100">
            <Link to="/" className="logo"><i className="fas fa-mug-hot"></i> coffee</Link>
            <div className="account-page-actions">
              <button type="button" className="link-btn account-top-btn" onClick={() => navigate(-1)}><i className="fas fa-arrow-left"></i><span>back</span></button>
            </div>
          </div>
        </header>
        <section className="account-page-shell customer-profile-public-shell">
          <div className="customer-profile-public-container">{content}</div>
        </section>
      </div>
    </>
  );
};

export default CustomerProfilePage;
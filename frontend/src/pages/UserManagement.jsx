import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import UserForm from "../components/UserForm";
import UserTable from "../components/UserTable";

import { userApi, roleApi, loyaltyApi, customerApi } from "../services/api";
import "../admin.css";

function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State cho Popup xác nhận xóa
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // =========================
  // Pagination states
  // =========================
  const [pageInput, setPageInput] = useState(0);
  const [sizeInput, setSizeInput] = useState(10);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  // =========================
  // Loyalty states
  // =========================
  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [tierHistory, setTierHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("info");

  // =========================
  // Fetch roles & users
  // =========================
  useEffect(() => {
    fetchRoles();
    fetchUsers(page, size);
  }, [page, size]);

  const fetchUsers = async (p = page, s = size) => {
    try {
      setLoading(true);
      const res = await userApi.getAllUsers(p, s);
      const data = Array.isArray(res) ? res : res?.data || [];
      setUsers(data);
    } catch {
      setError("Failed to load users");
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getAllRoles();
      let data = [];

      if (Array.isArray(res)) data = res;
      else if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res?.data?.content)) data = res.data.content;
      else if (Array.isArray(res?.content)) data = res.content;
      else if (Array.isArray(res?.data?.data)) data = res.data.data;
      else if (Array.isArray(res?.data?.data?.content)) data = res.data.data.content;

      setRoles(data);
    } catch (err) {
      toast.error("Failed to load roles");
    }
  };

  const applyPagination = () => {
    const p = Math.max(0, parseInt(pageInput, 10) || 0);
    const s = Math.max(1, parseInt(sizeInput, 10) || 10);
    setPage(p);
    setSize(s);
  };

  // =========================
  // CRUD
  // =========================
  const handleCreateUser = async (data) => {
    try {
      await userApi.createUser(data);
      toast.success("User created");
      fetchUsers(page, size);
      setShowForm(false);
    } catch {
      toast.error("Create failed");
    }
  };

  const handleUpdateUser = async (data) => {
    try {
      await userApi.updateUser(editingUser.id, data);
      toast.success("Updated");
      fetchUsers(page, size);
      setShowForm(false);
      setEditingUser(null);
    } catch {
      toast.error("Update failed");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleToggleLock = async (id, status) => {
    try {
      if (status === "LOCKED") await userApi.unlockUser(id);
      else await userApi.lockUser(id);
      fetchUsers(page, size);
    } catch {
      toast.error("Toggle lock failed");
    }
  };

  // Mở Popup xác nhận khi ấn nút xóa
  const handleDeleteClick = (id) => {
    setSelectedUserId(id);
    setShowConfirm(true);
  };

  // Hàm thực thi xóa sau khi người dùng bấm "Đồng ý"
  const confirmDeleteUser = async () => {
    try {
      await userApi.deleteUser(selectedUserId);
      toast.success("Deleted successfully");
      fetchUsers(page, size);
    } catch {
      toast.error("Delete failed");
    } finally {
      setShowConfirm(false);
      setSelectedUserId(null);
    }
  };

  // =========================
  // Loyalty
  // =========================
  const handleViewLoyalty = async (userId) => {
    try {
      const customerResp = await customerApi.getByUserId(userId);
      const customerId = customerResp?.id;
      if (!customerId) {
        toast.error("Không tìm thấy customerId");
        return;
      }

      const raw = await loyaltyApi.getLoyaltyInfo(customerId);
      const res = raw?.data || raw;
      setLoyaltyData({
        currentTier: res.current_tier,
        currentPoints: res.current_points,
        lifetimePoints: res.lifetime_points,
        tierProgress: res.tier_progress,
      });

      const rawPoints = await loyaltyApi.getPointsHistory(customerId);
      setPointsHistory((rawPoints || []).map((p) => ({
        type: p.type,
        amount: p.amount,
        description: p.description,
        orderId: p.order_id,
        createdAt: p.created_at,
      })));

      const rawTier = await loyaltyApi.getTierHistory(customerId);
      setTierHistory((rawTier || []).map((t) => ({
        fromTier: t.from_tier || t.fromTier,
        toTier: t.to_tier || t.toTier,
        reason: t.reason,
        changedAt: t.changed_at || t.changedAt,
      })));

      setActiveTab("info");
      setShowLoyalty(true);
    } catch (err) {
      toast.error("Loyalty API lỗi");
    }
  };

  const handleViewCustomerProfile = async (user) => {
    try {
      const res = await customerApi.getCustomerByUserId(user.id);
      const customerId = res.data?.data?.customerId || res.data?.customerId;

      if (!customerId) {
        navigate(`/admin/users/${user.id}`);
        return;
      }
      navigate(`/admin/customers/${customerId}`);
    } catch (error) {
      if (error.response?.status === 404) {
        navigate(`/admin/users/${user.id}`);
      } else {
        toast.error(error.response?.data?.message || "An error occurred");
      }
    }
  };

  if (loading) {
    return <div className="admin-container">Loading users...</div>;
  }

  if (error) {
    return <div className="admin-container">{error}</div>;
  }

  return (
    <div className="product-page">
      <div className="product-header">
        <h2>👥 User Management</h2>
        <button
          className="create-btn"
          onClick={() => { setEditingUser(null); setShowForm(true); }}
        >
          <i className="fas fa-user-plus"></i> Create User
        </button>
      </div>

      <UserTable
        users={users}
        onToggleLock={handleToggleLock}
        deleteUser={handleDeleteClick} // Đã đổi sang gọi Popup thay vì xóa luôn
        editUser={handleEditUser}
        viewCustomerProfile={handleViewCustomerProfile}
        viewLoyalty={handleViewLoyalty}
      />

      {/* FORM USER (CREATE/UPDATE) */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "🔄 Update User" : "✨ New User"}</h3>
              <button className="close-modal" onClick={() => setShowForm(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <UserForm
                addUser={handleCreateUser}
                updateUser={handleUpdateUser}
                editData={editingUser}
                roles={roles}
                onClose={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* POPUP XÁC NHẬN XÓA */}
      {showConfirm && (
        <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3>⚠️ Confirm Delete</h3>
              <button className="close-modal" onClick={() => setShowConfirm(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "20px" }}>
              <p style={{ fontSize: "1.6rem", marginBottom: "2rem" }}>
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
                <button
                  className="link-btn"
                  style={{ background: "#ccc", color: "#333" }}
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
                <button
                  className="link-btn"
                  style={{ background: "#dc3545", color: "white" }}
                  onClick={confirmDeleteUser}
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOYALTY MODAL */}
      {showLoyalty && loyaltyData && (
        <div className="modal-overlay" onClick={() => setShowLoyalty(false)}>
          <div className="modal loyalty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💎 Loyalty Member</h3>
              <button className="close-modal" onClick={() => setShowLoyalty(false)}>&times;</button>
            </div>
            {/* ... Nội dung loyalty ... */}
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
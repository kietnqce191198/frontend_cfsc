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

  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // =========================
  // Pagination states
  // =========================
  const [pageInput, setPageInput] = useState(0); // input của người dùng
  const [sizeInput, setSizeInput] = useState(10); // input của người dùng
  const [page, setPage] = useState(0); // state hiện hành
  const [size, setSize] = useState(10); // state hiện hành

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
      const res = await userApi.getAllUsers(p, s); // API cần nhận page & size
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

      console.log("FULL RESPONSE:", res);

      let data = [];

      if (Array.isArray(res)) data = res;
      else if (Array.isArray(res?.data)) data = res.data;
      else if (Array.isArray(res?.data?.content)) data = res.data.content;
      else if (Array.isArray(res?.content)) data = res.content;
      else if (Array.isArray(res?.data?.data)) data = res.data.data;
      else if (Array.isArray(res?.data?.data?.content)) data = res.data.data.content;

      console.log("FINAL ROLES:", data);

      setRoles(data);

    } catch (err) {
      console.error("ROLE ERROR:", err);
      toast.error("Failed to load roles");
    }
  };

  // =========================
  // Apply page/size do người dùng nhập
  // =========================
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
    console.log("Creating user with data:", data);
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


  const confirmDeleteUser = async () => {
    try {
      await userApi.deleteUser(selectedUserId);
      toast.success("Deleted");
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
      // 1. Lấy customerId từ userId
      console.log("vao lay cusId");
      const customerResp = await customerApi.getByUserId(userId);
      const customerId = customerResp?.id;
      console.log("Customer ID:", customerId);
      if (!customerId) {
        toast.error("Không tìm thấy customerId");
        return;
      }

      // 2. Lấy thông tin loyalty
      const raw = await loyaltyApi.getLoyaltyInfo(customerId);
      const res = raw?.data || raw;
      setLoyaltyData({
        currentTier: res.current_tier,
        currentPoints: res.current_points,
        lifetimePoints: res.lifetime_points,
        tierProgress: res.tier_progress,
      });

      // 3. Lấy lịch sử điểm
      const rawPoints = await loyaltyApi.getPointsHistory(customerId);
      setPointsHistory((rawPoints || []).map((p) => ({
        type: p.type,
        amount: p.amount,
        description: p.description,
        orderId: p.order_id,
        createdAt: p.created_at,
      })));

      // 4. Lấy lịch sử tier
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
      console.error(err);
      toast.error("Loyalty API lỗi");
    }
  };

  const deleteUser = async (id) => {

    if (!window.confirm("Delete this user?")) return;

    try {

      await userApi.deleteUser(id);

      toast.success("User deleted successfully");

      fetchUsers();

    } catch (error) {

      toast.error("Delete failed");

    }

  };

  const handleViewCustomerProfile = async (user) => {

    try {

      const res = await customerApi.getCustomerByUserId(user.id);

      const customerId = res.data?.data?.customerId || res.data?.customerId;

      if (!customerId) {
        const userId = user.id;
        navigate(`/admin/users/${userId}`);
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
    <div className="product-page"> {/* Dùng chung container với Product để đồng bộ CSS */}
      <div className="product-header">
        <h2>👥 User Management</h2>
        <button
          className="create-btn"
          onClick={() => { setEditingUser(null); setShowForm(true); }}
        >
          <i className="fas fa-user-plus"></i> Create User
        </button>
      </div>

      {/* Bảng danh sách người dùng */}
      <UserTable
        users={users}
        onToggleLock={handleToggleLock}
        deleteUser={deleteUser}
        editUser={handleEditUser}
        viewCustomerProfile={handleViewCustomerProfile}
        viewLoyalty={handleViewLoyalty}
      />

      {/* CHUYỂN THÀNH MODAL FORM */}
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

      {/* Loyalty Modal - Giữ nguyên logic nhưng dùng class CSS chung */}
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

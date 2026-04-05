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

  // =========================
  // Popup & Notification States
  // =========================
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [successPopup, setSuccessPopup] = useState({ show: false, message: "" });

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);

  const [showLoyalty, setShowLoyalty] = useState(false);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    fetchRoles();
    fetchUsers(page, size);
  }, [page, size]);

  // Helper to show success notification popup
  const showSuccess = (msg) => {
    setSuccessPopup({ show: true, message: msg });
    setTimeout(() => setSuccessPopup({ show: false, message: "" }), 2000);
  };

  const fetchUsers = async (p = page, s = size) => {
    try {
      setLoading(true);
      const res = await userApi.getAllUsers(p, s);
      const data = Array.isArray(res) ? res : res?.data || [];
      setUsers(data);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await roleApi.getAllRoles();
      console.log("ROLE DATA LOG:", res);

      let data = [];
      if (Array.isArray(res)) {
        data = res;
      } else if (res?.data) {
        if (Array.isArray(res.data)) {
          data = res.data;
        } else if (Array.isArray(res.data.data)) {
          data = res.data.data;
        } else if (Array.isArray(res.data.content)) {
          data = res.data.content;
        }
      }
      setRoles(data);
    } catch (err) {
      console.error("ROLE FETCH ERROR:", err);
      toast.error("Failed to load roles list!");
    }
  };

  // =========================
  // CRUD Actions
  // =========================
  const handleCreateUser = async (data) => {
    try {
      await userApi.createUser(data);
      showSuccess("User Created Successfully!");
      fetchUsers(page, size);
      setShowForm(false);
    } catch {
      toast.error("Create failed");
    }
  };

  const handleUpdateUser = async (data) => {
    try {
      await userApi.updateUser(editingUser.id, data);
      showSuccess("User Updated Successfully!");
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

  const openDeleteModal = (id) => {
    setSelectedUserId(id);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      await userApi.deleteUser(selectedUserId);
      showSuccess("User Deleted Successfully!");
      fetchUsers(page, size);
    } catch {
      toast.error("Delete failed");
    } finally {
      setShowDeleteModal(false);
      setSelectedUserId(null);
    }
  };

  const handleToggleLock = async (id, status) => {
    try {
      if (status === "LOCKED") await userApi.unlockUser(id);
      else await userApi.lockUser(id);
      fetchUsers(page, size);
      showSuccess(status === "LOCKED" ? "User Unlocked!" : "User Locked!");
    } catch {
      toast.error("Toggle lock failed");
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
      navigate(`/admin/users/${user.id}`);
    }
  };

  const handleViewLoyalty = async (userId) => {
    try {
      const customerResp = await customerApi.getByUserId(userId);
      const customerId = customerResp?.id;
      if (!customerId) {
        toast.error("Customer ID not found");
        return;
      }
      const raw = await loyaltyApi.getLoyaltyInfo(customerId);
      setLoyaltyData(raw?.data || raw);
      setActiveTab("info");
      setShowLoyalty(true);
    } catch (err) {
      toast.error("Loyalty API error");
    }
  };

  if (loading) return <div className="admin-container">Loading users...</div>;
  if (error) return <div className="admin-container">{error}</div>;

  return (
    <div className="product-page">
      <div className="product-header">
        <h2>👥 User Management</h2>
        <button className="create-btn" onClick={() => { setEditingUser(null); setShowForm(true); }}>
          <i className="fas fa-user-plus"></i> Create User
        </button>
      </div>

      <UserTable
        users={users}
        onToggleLock={handleToggleLock}
        deleteUser={openDeleteModal}
        editUser={handleEditUser}
        viewCustomerProfile={handleViewCustomerProfile}
        viewLoyalty={handleViewLoyalty}
      />

      {/* MODAL FORM (CREATE/UPDATE) */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Update User" : "New User"}</h3>
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

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {showDeleteModal && (
        <div className="modal-overlay delete-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon"><i className="fas fa-exclamation-triangle"></i></div>
            <h3>Are you sure?</h3>
            <p>This action will permanently delete the account. This cannot be undone!</p>
            <div className="confirm-actions">
              <button className="cancel-confirm-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="delete-confirm-btn" onClick={confirmDeleteUser}>Delete Now!</button>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS POPUP --- */}
      {successPopup.show && (
        <div className="modal-overlay success-overlay">
          <div className="success-popup">
            <div className="success-icon-circle"><i className="fas fa-check"></i></div>
            <h4>{successPopup.message}</h4>
            <div className="success-progress-bar"></div>
          </div>
        </div>
      )}

      {/* Loyalty Modal */}
      {showLoyalty && loyaltyData && (
        <div className="modal-overlay" onClick={() => setShowLoyalty(false)}>
          <div className="modal loyalty-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💎 Loyalty Member</h3>
              <button className="close-modal" onClick={() => setShowLoyalty(false)}>&times;</button>
            </div>
            <div className="modal-body">
               <p>Current Tier: <strong>{loyaltyData.currentTier}</strong></p>
               <p>Accumulated Points: <strong>{loyaltyData.currentPoints}</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
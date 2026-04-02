// src/components/UserForm.jsx
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

function UserForm({ addUser, updateUser, roles, editData }) {

  // ✅ đảm bảo roles luôn là array
  const safeRoles = Array.isArray(roles) ? roles : [];

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    phone: "",
    roleIds: [],
  });

  const [roleFilter, setRoleFilter] = useState("");
  const [isRolePopupOpen, setIsRolePopupOpen] = useState(false);

  // =========================
  // Load dữ liệu khi edit
  // =========================
  useEffect(() => {
    if (editData) {
      setFormData({
        username: editData.username || "",
        email: editData.email || "",
        password: "",
        fullName: editData.fullName || "",
        phone: editData.phone || "",
        roleIds: Array.isArray(editData.roles)
          ? editData.roles.map((r) => r.id)
          : [],
      });
    } else {
      setFormData({
        username: "",
        email: "",
        password: "",
        fullName: "",
        phone: "",
        roleIds: [],
      });
    }
  }, [editData]);

  // =========================
  // Handle input change
  // =========================
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  // =========================
  // Toggle role
  // =========================
  const toggleRole = (roleId) => {
    const newRoleIds = formData.roleIds.includes(roleId)
      ? formData.roleIds.filter((id) => id !== roleId)
      : [...formData.roleIds, roleId];

    setFormData({ ...formData, roleIds: newRoleIds });
  };

  // =========================
  // Submit
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!formData.username || !formData.email) {
        toast.warning("Username and Email are required");
        return;
      }

      if (editData) {
        await updateUser({
          id: editData.id,
          username: formData.username,
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          roleIds: formData.roleIds,
        });
      } else {
        await addUser(formData);
      }

      // reset form
      setFormData({
        username: "",
        email: "",
        password: "",
        fullName: "",
        phone: "",
        roleIds: [],
      });

      setIsRolePopupOpen(false);

    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    }
  };

  // =========================
  // Filter roles (SAFE)
  // =========================
  const filteredRoles = safeRoles.filter((role) =>
    role?.name?.toLowerCase().includes(roleFilter.toLowerCase())
  );

  return (
    <div className="form-card">
      <h3>{editData ? "Edit User" : "Create User"}</h3>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="form-row">
          <input
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
          />

          <input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
          />

          {!editData && (
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
            />
          )}

          <input
            name="fullName"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
          />

          <input
            name="phone"
            placeholder="Phone"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        {/* ========================= */}
        {/* Role Selector */}
        {/* ========================= */}
        <div className="role-selector-section">
          <label>Roles</label>

          <div
            className="role-display-trigger"
            onClick={() => setIsRolePopupOpen(true)}
          >
            {formData.roleIds.length > 0 ? (
              <div className="selected-tags">
                {safeRoles
                  .filter((r) => formData.roleIds.includes(r.id))
                  .map((r) => (
                    <span key={r.id} className="role-tag">
                      {r.name}
                    </span>
                  ))}
              </div>
            ) : (
              <span className="placeholder-text">
                Click to assign roles...
              </span>
            )}
          </div>

          {/* ========================= */}
          {/* Popup */}
          {/* ========================= */}
          {isRolePopupOpen && (
            <div className="role-modal-overlay">
              <div className="role-modal-content">

                <div className="modal-header">
                  <h4>Select Roles</h4>
                  <button
                    type="button"
                    className="close-popup"
                    onClick={() => setIsRolePopupOpen(false)}
                  >
                    &times;
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="modal-search-input"
                  autoFocus
                />

                <div className="modal-role-list">
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <label
                        key={role.id}
                        className={`modal-role-item ${
                          formData.roleIds.includes(role.id) ? "selected" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.roleIds.includes(role.id)}
                          onChange={() => toggleRole(role.id)}
                        />

                        <span className="role-name">
                          {role.name}
                        </span>
                      </label>
                    ))
                  ) : (
                    <div className="empty">
                      No roles found for "{roleFilter}"
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn-clear"
                    onClick={() =>
                      setFormData({ ...formData, roleIds: [] })
                    }
                  >
                    Clear All
                  </button>

                  <button
                    type="button"
                    className="done-btn"
                    onClick={() => setIsRolePopupOpen(false)}
                  >
                    Confirm ({formData.roleIds.length})
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>

        <button className="submit-btn" type="submit">
          {editData ? "Update User" : "Create User"}
        </button>
      </form>
    </div>
  );
}

export default UserForm;
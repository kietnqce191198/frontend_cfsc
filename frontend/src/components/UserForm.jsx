import { useState, useEffect } from "react";
import { toast } from "react-toastify";

function UserForm({ addUser, updateUser, roles, editData, onClose }) {
  // ✅ Đảm bảo roles luôn là array
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
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Load dữ liệu khi edit
  useEffect(() => {
    if (editData) {
      setFormData({
        username: editData.username || "",
        email: editData.email || "",
        password: "", // Không load password khi edit
        fullName: editData.fullName || "",
        phone: editData.phone || "",
        roleIds: Array.isArray(editData.roles) ? editData.roles.map((r) => r.id) : [],
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleRole = (roleId) => {
    const newRoleIds = formData.roleIds.includes(roleId)
      ? formData.roleIds.filter((id) => id !== roleId)
      : [...formData.roleIds, roleId];
    setFormData({ ...formData, roleIds: newRoleIds });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username || !formData.email) {
      toast.warning("Username and Email are required");
      return;
    }

    try {
      if (editData) {
        await updateUser({ id: editData.id, ...formData });
      } else {
        await addUser(formData);
      }
      onClose();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Action failed");
    }
  };

  const filteredRoles = safeRoles.filter((role) =>
    role?.name?.toLowerCase().includes(roleFilter.toLowerCase())
  );

  return (
    <form className="admin-form" onSubmit={handleSubmit} onClick={() => setIsRoleDropdownOpen(false)}>
      <div className="input-group">
        <label>Username *</label>
        <input name="username" placeholder="Enter username" value={formData.username} onChange={handleChange} />
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Email *</label>
          <input name="email" type="email" placeholder="example@mail.com" value={formData.email} onChange={handleChange} />
        </div>
        {!editData && (
          <div className="input-group">
            <label>Password *</label>
            <input type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleChange} />
          </div>
        )}
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Full Name</label>
          <input name="fullName" placeholder="John Doe" value={formData.fullName} onChange={handleChange} />
        </div>
        <div className="input-group">
          <label>Phone Number</label>
          <input name="phone" placeholder="090..." value={formData.phone} onChange={handleChange} />
        </div>
      </div>

      {/* Role Assignment Dropdown */}
      <div className="input-group" style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
        <label>Role Assignment</label>
        <div 
          className={`role-display-trigger ${isRoleDropdownOpen ? "active" : ""}`}
          onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
        >
          {formData.roleIds.length > 0 ? (
            <div className="selected-tags">
              {safeRoles.filter(r => formData.roleIds.includes(r.id)).map(r => (
                <span key={r.id} className="cate-tag">
                  {r.name} 
                  <i className="fas fa-times" onClick={(e) => { e.stopPropagation(); toggleRole(r.id); }}></i>
                </span>
              ))}
            </div>
          ) : (
            <span className="placeholder-text">Click to assign roles...</span>
          )}
          <i className={`fas fa-chevron-${isRoleDropdownOpen ? "up" : "down"} arrow-icon`}></i>
        </div>

        {isRoleDropdownOpen && (
          <div className="role-dropdown-menu">
            <div className="dropdown-search">
              <i className="fas fa-search"></i>
              <input 
                type="text" 
                placeholder="Search roles..." 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)} 
                autoFocus
              />
            </div>
            <div className="role-options-list">
              {filteredRoles.map((role) => (
                <div 
                  key={role.id} 
                  className={`role-option ${formData.roleIds.includes(role.id) ? "selected" : ""}`}
                  onClick={() => toggleRole(role.id)}
                >
                  <span>{role.name}</span>
                  {formData.roleIds.includes(role.id) && <i className="fas fa-check"></i>}
                </div>
              ))}
              {filteredRoles.length === 0 && <div className="no-data">No roles found</div>}
            </div>
          </div>
        )}
      </div>

      <div className="modal-actions">
        <button type="button" onClick={onClose} className="cancel-btn">Discard</button>
        <button type="submit" className="save-btn">
          {editData ? "Save Changes" : "Create User"}
        </button>
      </div>
    </form>
  );
}

export default UserForm;
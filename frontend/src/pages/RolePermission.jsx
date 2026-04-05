import { useCallback, useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = '/api-auth';

async function refreshSessionAfterPermissionChange() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    return { ok: false, reason: "no_refresh" };
  }
  try {
    const res = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
    const accessToken = res.data?.accessToken;
    const newRefresh = res.data?.refreshToken;
    if (!accessToken) {
      return { ok: false, reason: "no_access_token" };
    }
    localStorage.setItem("accessToken", accessToken);
    if (newRefresh) {
      localStorage.setItem("refreshToken", newRefresh);
    }
    try {
      const profileRes = await axios.get(`${API_BASE_URL}/api/accounts/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = profileRes.data?.data ?? profileRes.data;
      if (profile) {
        localStorage.setItem("accountProfile", JSON.stringify(profile));
      }
    } catch {
      /* profile sync optional */
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "refresh_failed" };
  }
}

function RolePermission() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState(null);
  const [assigningRole, setAssigningRole] = useState(null);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);
  const [assignFilter, setAssignFilter] = useState("");
  const [assignPage, setAssignPage] = useState(1);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRoleData, setCreateRoleData] = useState({
    name: "",
    description: "",
    isActive: true,
    permissionIds: [],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createPermissions, setCreatePermissions] = useState([]);
  const [isLoadingCreatePermissions, setIsLoadingCreatePermissions] = useState(false);
  const [createFilter, setCreateFilter] = useState("");
  const [createPage, setCreatePage] = useState(1);

  // --- QUẢN LÝ SHOW MORE ---
  const [expandedRoles, setExpandedRoles] = useState({});
  const PERMISSION_LIMIT = 6;

  const COLORS = {
    primary: "#5d4037",
    secondary: "#795548",
    hover: "#4e342e",
    text: "#3e2723",
    lightText: "#a1887f",
    bgModal: "#ffffff",
  };

  const perPage = 4;
  const [editingRole, setEditingRole] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editRoleData, setEditRoleData] = useState({ name: "", description: "" });
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const [deletingRole, setDeletingRole] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingRoleId, setSavingRoleId] = useState(null);

  const cleanPermissionName = (name) => {
    return name ? name.replace(/\s*\(.*?\)\s*/g, "").trim() : "";
  };

  const toggleExpand = (roleId) => {
    setExpandedRoles(prev => ({
      ...prev,
      [roleId]: !prev[roleId]
    }));
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('Session expired. Please log in again.');
    }
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, { refreshToken });
    const nextAccessToken = response.data.accessToken;
    if (!nextAccessToken) {
      throw new Error('Unable to refresh session. Please log in again.');
    }
    localStorage.setItem('accessToken', nextAccessToken);
    if (response.data.refreshToken) {
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
    return nextAccessToken;
  };

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setError("Authorization token missing. Please log in.");
      setLoading(false);
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/roles`, {
        params: { page: 1, limit: 20 },
        headers: { Authorization: `Bearer ${token}` },
      });
      const roleList = response.data.data?.content || response.data.data || [];
      setRoles(roleList.map((r) => ({
        ...r,
        isActiveDraft: r.isActive,
        permissionsDraft: Array.isArray(r.permissions) ? r.permissions : [],
        dirty: false,
      })));
    } catch (err) {
      setError("Failed to fetch roles from server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const handleRemovePermissionClick = (roleId, permId, permName) => {
    setRoles(prev =>
      prev.map(role =>
        role.id === roleId
          ? {
              ...role,
              permissionsDraft: role.permissionsDraft.filter(p => p.id !== permId),
              dirty: true
            }
          : role
      )
    );
    setStatusMessage({
      type: "success",
      text: `Removed permission "${cleanPermissionName(permName)}" (not saved yet)`
    });
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setEditRoleData({ name: role.name, description: role.description || "" });
    setEditError("");
    setIsEditModalOpen(true);
  };

  const handleEditRole = async (e) => {
    e.preventDefault();
    if (!editRoleData.name.trim()) {
      setEditError("Role name cannot be empty.");
      return;
    }
    setIsUpdating(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`${API_BASE_URL}/api/roles/${editingRole.id}`, {
        name: editRoleData.name.trim(),
        description: editRoleData.description.trim() || null,
        isActive: editingRole.isActiveDraft,
        permissionIds: (editingRole.permissionsDraft || []).map(p => p.id)
      }, { headers: { Authorization: `Bearer ${token}` } });
      await refreshAccessToken();
      await fetchRoles();
      setIsEditModalOpen(false);
      const refreshed = await refreshSessionAfterPermissionChange();
      setStatusMessage({
        type: "success",
        text: refreshed.ok ? "Role updated successfully." : "Update successful, please re-login.",
      });
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to update.");
    } finally { setIsUpdating(false); }
  };

  const updatePermissionsOnly = async (role) => {
    setSavingRoleId(role.id);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.put(`${API_BASE_URL}/api/roles/${role.id}`, {
        name: role.name,
        description: role.description,
        isActive: role.isActiveDraft,
        permissionIds: (role.permissionsDraft || []).map(p => p.id),
      }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchRoles();
      await refreshSessionAfterPermissionChange();
      setStatusMessage({ type: "success", text: "Permissions saved successfully." });
    } catch {
      setStatusMessage({ type: "error", text: "Error saving permissions." });
    } finally { setSavingRoleId(null); }
  };

  const openAssignMore = async (role) => {
    setAssigningRole(role);
    setAssignFilter("");
    setAssignPage(1);
    setIsLoadingPermissions(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await axios.get(`${API_BASE_URL}/api/permissions`, { 
        params: { page: 0, size: 100 }, 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const allPerms = res.data.data?.content || [];
      const assignedIds = new Set((role.permissionsDraft || []).map(p => p.id));
      setAvailablePermissions(allPerms.filter(p => !assignedIds.has(p.id)));
    } catch {
      setStatusMessage({ type: "error", text: "Could not load permissions list." });
    } finally { setIsLoadingPermissions(false); }
  };

  const openCreateModal = () => {
    setCreateRoleData({ name: "", description: "", isActive: true, permissionIds: [] });
    setCreateError("");
    setCreateFilter("");
    setCreatePage(1);
    setIsCreateModalOpen(true);
    setIsLoadingCreatePermissions(true);
    const token = localStorage.getItem("accessToken");
    axios.get(`${API_BASE_URL}/api/permissions`, { 
      params: { page: 0, size: 100 }, 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(res => setCreatePermissions(res.data.data?.content || []))
      .catch(() => setCreateError("Failed to fetch permissions."))
      .finally(() => setIsLoadingCreatePermissions(false));
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!createRoleData.name.trim()) { setCreateError("Role name is required."); return; }
    setIsCreating(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.post(`${API_BASE_URL}/api/roles`, { ...createRoleData, name: createRoleData.name.trim() }, { headers: { Authorization: `Bearer ${token}` } });
      await fetchRoles();
      setIsCreateModalOpen(false);
      setStatusMessage({ type: "success", text: "New role created successfully." });
    } catch (err) {
      setCreateError(err.response?.data?.message || "Creation failed.");
    } finally { setIsCreating(false); }
  };

  const handleDeleteRole = async () => {
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("accessToken");
      await axios.delete(`${API_BASE_URL}/api/roles/${deletingRole.id}`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchRoles();
      setDeletingRole(null);
      setStatusMessage({ type: "success", text: "Role deleted successfully." });
    } catch (err) {
      setStatusMessage({ type: "error", text: err.response?.data?.message || "Cannot delete role." });
      setDeletingRole(null);
    } finally { setIsDeleting(false); }
  };

  const filteredCreate = createPermissions.filter(p => p.name.toLowerCase().includes(createFilter.toLowerCase()));
  const totalCreatePages = Math.ceil(filteredCreate.length / perPage);
  const paginatedCreate = filteredCreate.slice((createPage - 1) * perPage, createPage * perPage);

  const filteredAssign = availablePermissions.filter(p => p.name.toLowerCase().includes(assignFilter.toLowerCase()));
  const totalAssignPages = Math.ceil(filteredAssign.length / perPage);
  const paginatedAssign = filteredAssign.slice((assignPage - 1) * perPage, assignPage * perPage);

  const CompactPagination = ({ current, total, onPageChange }) => {
    if (total <= 1) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', padding: '10px 0', borderTop: '1px solid #f1f1f1' }}>
        <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)} className="icon-btn" style={{ color: COLORS.primary }}>←</button>
        <span style={{ fontSize: '13px', fontWeight: '600', color: COLORS.text }}>{current} / {total}</span>
        <button type="button" disabled={current === total} onClick={() => onPageChange(current + 1)} className="icon-btn" style={{ color: COLORS.primary }}>→</button>
      </div>
    );
  };

  const brownButtonStyle = { backgroundColor: COLORS.primary, color: "#fff", border: "none" };
  const brownTextStyle = { color: COLORS.text };

  return (
    <>
      <header className="admin-header">
        <div>
          <h1 style={brownTextStyle}>Manage Roles</h1>
          <p style={{ color: COLORS.secondary }}>Manage authorization levels and access control for system staff.</p>
        </div>
        <button className="admin-primary-btn" style={brownButtonStyle} onClick={openCreateModal}>+ Create New Role</button>
      </header>

      {statusMessage && (
        <div className={`admin-status admin-status-${statusMessage.type}`} style={{ fontWeight: '600' }}>
          {statusMessage.text}
        </div>
      )}

      <div className="role-grid">
        {roles.map((role) => (
          <div key={role.id} className="role-card" style={{ borderColor: '#e0d6d3' }}>
            <div className="role-card-header">
              <div>
                <h2 style={brownTextStyle}>{role.name}</h2>
                <p className="role-card-subtitle" style={{ color: COLORS.secondary }}>{role.description || "No description provided"}</p>
              </div>
              <div className="role-card-actions">
                <button className="icon-btn" title="Edit Info" onClick={() => openEditModal(role)}>✏️</button>
                <button className="icon-btn" title="Delete Role" onClick={() => setDeletingRole(role)}>🗑️</button>
              </div>
            </div>

            <div className="role-card-meta">
              <span style={{ color: COLORS.secondary, fontWeight: '500' }}>👥 {role.staffCount || 0} Members</span>
              <div className="status-toggle-wrapper">
                <span className="status-label" style={{ color: COLORS.secondary, fontSize: '11px', fontWeight: '600' }}>{role.isActiveDraft ? "Active" : "Inactive"}</span>
                <button
                  type="button"
                  className={role.isActiveDraft ? "status-chip active" : "status-chip"}
                  style={role.isActiveDraft ? { backgroundColor: COLORS.primary } : {}}
                  onClick={() => {
                    setRoles(prev => prev.map(r => r.id === role.id ? { ...r, isActiveDraft: !r.isActiveDraft, dirty: true } : r));
                  }}
                />
              </div>
            </div>

            {/* PHẦN PERMISSIONS ĐÃ ĐƯỢC TỐI ƯU */}
            <div className="role-card-permissions">
              <div className="role-card-permissions-title" style={{ color: COLORS.primary, fontWeight: '700', marginBottom: '8px' }}>Permissions</div>
              
              <div className="role-card-permissions-list">
                {role.permissionsDraft?.length > 0 ? (
                  <>
                    {/* Render danh sách chips */}
                    {role.permissionsDraft
                      .slice(0, expandedRoles[role.id] ? role.permissionsDraft.length : PERMISSION_LIMIT)
                      .map((perm) => (
                        <span key={perm.id} className="permission-chip" style={{ backgroundColor: '#efebe9', borderColor: COLORS.secondary, color: COLORS.text }}>
                          {cleanPermissionName(perm.name)}
                          <button className="permission-remove-btn" style={{ color: COLORS.secondary }} onClick={() => handleRemovePermissionClick(role.id, perm.id, perm.name)}>×</button>
                        </span>
                      ))}
                    
                    {/* Nút Show more / Show less nằm riêng biệt bên dưới các chip */}
                    {role.permissionsDraft.length > PERMISSION_LIMIT && (
                      <div style={{ width: '100%', marginTop: '4px' }}>
                        <button 
                          onClick={() => toggleExpand(role.id)}
                          style={{ 
                            background: 'none', border: 'none', color: COLORS.primary, 
                            fontSize: '12px', cursor: 'pointer', padding: '2px 0',
                            fontWeight: '700', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px'
                          }}
                        >
                          {expandedRoles[role.id] ? "↑ Show less" : `↓ Show ${role.permissionsDraft.length - PERMISSION_LIMIT} more...`}
                        </button>
                      </div>
                    )}
                  </>
                ) : <span className="permission-empty" style={{ color: COLORS.lightText }}>No permissions assigned.</span>}
              </div>

              <button className="admin-text-btn" style={{ color: COLORS.primary, fontWeight: '700', marginTop: '12px', fontSize: '13px' }} onClick={() => openAssignMore(role)}>+ Assign More</button>
            </div>

            <div style={{ textAlign: "right", marginTop: 15 }}>
              <button className="admin-primary-btn"
                style={role.dirty ? brownButtonStyle : { backgroundColor: '#d7ccc8', color: '#8d6e63', boxShadow: 'none' }}
                disabled={!role.dirty || savingRoleId === role.id}
                onClick={() => updatePermissionsOnly(role)}>
                {savingRoleId === role.id ? "Saving..." : "Update Changes"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      {isCreateModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()} style={{ backgroundColor: COLORS.bgModal }}>
            <div className="admin-modal-header">
              <h2 style={brownTextStyle}>Create New Role</h2>
              <button className="icon-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <form className="admin-modal-body" onSubmit={handleCreateRole}>
              <div className="admin-form-group">
                <label className="admin-label" style={{ color: COLORS.primary }}>Role Name *</label>
                <input className="admin-input" style={brownTextStyle} value={createRoleData.name} onChange={e => { setCreateRoleData({ ...createRoleData, name: e.target.value }); setCreateError(""); }} placeholder="e.g., MANAGER" />
                {createError && <p className="admin-error"> {createError}</p>}
              </div>

              <div className="admin-form-group">
                <label className="admin-label" style={{ color: COLORS.primary }}>Description</label>
                <textarea className="admin-textarea" style={brownTextStyle} rows={2} value={createRoleData.description} onChange={e => setCreateRoleData({ ...createRoleData, description: e.target.value })} />
              </div>

              <div className="admin-form-group">
                <label className="admin-label" style={{ color: COLORS.primary }}>Assign Permissions</label>
                <div style={{ marginBottom: '8px' }}>
                  <input type="text" className="admin-input" style={brownTextStyle} placeholder="Search..." value={createFilter} onChange={e => setCreateFilter(e.target.value)} />
                </div>
                <div className="admin-permission-checkbox-list" style={{ borderColor: '#d7ccc8' }}>
                  {isLoadingCreatePermissions ? <p style={{ color: COLORS.lightText }}>Loading...</p> : (
                    paginatedCreate.length > 0 ? paginatedCreate.map(p => (
                      <label key={p.id} className="admin-permission-checkbox-item">
                        <input type="checkbox" checked={createRoleData.permissionIds.includes(p.id)} onChange={() => {
                          const ids = createRoleData.permissionIds.includes(p.id) ? createRoleData.permissionIds.filter(i => i !== p.id) : [...createRoleData.permissionIds, p.id];
                          setCreateRoleData({ ...createRoleData, permissionIds: ids });
                        }} />
                        <span style={brownTextStyle}>{cleanPermissionName(p.name)}</span>
                      </label>
                    )) : <p className="permission-empty" style={{ color: COLORS.lightText }}>No match found.</p>
                  )}
                </div>
                <CompactPagination current={createPage} total={totalCreatePages} onPageChange={setCreatePage} />
              </div>

              <div style={{ textAlign: "right", marginTop: '15px' }}>
                <button type="button" className="admin-text-btn" style={{ marginRight: 15, color: COLORS.secondary }} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" className="admin-primary-btn" style={brownButtonStyle} disabled={isCreating}>{isCreating ? "Creating..." : "Create Role"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN MORE MODAL */}
      {assigningRole && (
        <div className="admin-modal-backdrop" onClick={() => setAssigningRole(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 style={brownTextStyle}>Assign to: {assigningRole.name}</h2>
              <button className="icon-btn" onClick={() => setAssigningRole(null)}>×</button>
            </div>
            <div style={{ padding: '0 0 10px' }}>
              <input type="text" className="admin-input" style={brownTextStyle} placeholder="Search permissions..." value={assignFilter} onChange={e => setAssignFilter(e.target.value)} />
            </div>
            <div className="admin-modal-body">
              {isLoadingPermissions ? <p style={{ color: COLORS.lightText }}>Loading...</p> : (
                paginatedAssign.length === 0 ? <p className="permission-empty" style={{ color: COLORS.lightText }}>No available permissions found.</p> :
                paginatedAssign.map(p => (
                  <div key={p.id} className="permission-row" style={{ borderColor: '#efebe9' }}>
                    <span className="permission-name" style={brownTextStyle}>{cleanPermissionName(p.name)}</span>
                    <button className="admin-primary-btn" style={{ ...brownButtonStyle, padding: '4px 12px', fontSize: '11px' }} onClick={() => {
                      setRoles(prev => prev.map(r => r.id === assigningRole.id ? { ...r, permissionsDraft: [...r.permissionsDraft, p], dirty: true } : r));
                      setAvailablePermissions(prev => prev.filter(item => item.id !== p.id));
                    }}>Assign</button>
                  </div>
                ))
              )}
            </div>
            <CompactPagination current={assignPage} total={totalAssignPages} onPageChange={setAssignPage} />
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 style={brownTextStyle}>Edit Role Information</h2>
              <button className="icon-btn" onClick={() => setIsEditModalOpen(false)}>×</button>
            </div>
            <form className="admin-modal-body" onSubmit={handleEditRole}>
              <div className="admin-form-group">
                <label className="admin-label" style={{ color: COLORS.primary }}>Role Name</label>
                <input className="admin-input" style={brownTextStyle} value={editRoleData.name} onChange={e => setEditRoleData({ ...editRoleData, name: e.target.value })} />
                {editError && <p className="admin-error"> {editError}</p>}
              </div>
              <div className="admin-form-group">
                <label className="admin-label" style={{ color: COLORS.primary }}>Description</label>
                <textarea className="admin-textarea" style={brownTextStyle} rows={3} value={editRoleData.description} onChange={e => setEditRoleData({ ...editRoleData, description: e.target.value })} />
              </div>
              <div style={{ textAlign: "right" }}>
                <button type="button" className="admin-text-btn" style={{ marginRight: 15, color: COLORS.secondary }} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" className="admin-primary-btn" style={brownButtonStyle} disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {deletingRole && (
        <div className="admin-modal-backdrop" onClick={() => setDeletingRole(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header"><h2 style={{ color: '#b71c1c' }}>Confirm Deletion</h2></div>
            <div className="admin-modal-body"><p style={brownTextStyle}>Are you sure you want to delete <strong>{deletingRole.name}</strong>?</p></div>
            <div style={{ textAlign: "right", marginTop: 20 }}>
              <button className="admin-text-btn" style={{ marginRight: 15, color: COLORS.secondary }} onClick={() => setDeletingRole(null)}>Cancel</button>
              <button className="admin-primary-btn" style={{ backgroundColor: '#d32f2f', color: '#fff' }} onClick={handleDeleteRole} disabled={isDeleting}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RolePermission;
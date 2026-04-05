import React from "react";

/**
 * COMPONENT: UserTable
 * Displays a list of users with administrative actions.
 */
function UserTable({ users, onToggleLock, deleteUser, editUser, viewLoyalty, viewCustomerProfile }) {

  // 1. Handle Account Lock/Unlock [cite: 153]
  // Logic is passed to the parent component to trigger the success popup
  const handleToggleLock = (id, status) => {
    if (onToggleLock) {
      onToggleLock(id, status);
    }
  };

  // 2. Handle Delete User [cite: 138, 155]
  // Triggers the custom confirmation modal in the parent component
  const handleDelete = (id) => {
    if (deleteUser) {
      deleteUser(id);
    }
  };

  // 3. Handle Edit User
  const handleEdit = (user) => {
    if (editUser) editUser(user);
  };

  return (
    <div className="product-table">
      <div className="table-header-row">
        <span style={{ flex: 1.5 }}>User Info</span>
        <span style={{ flex: 1 }}>Status</span>
        <span style={{ flex: 1 }}>Roles</span>
        <span style={{ flex: 1.5, textAlign: 'right' }}>Actions</span>
      </div>

      {users.map((u) => (
        <div key={u.id} className="product-row">
          {/* User Info Section */}
          <div style={{ flex: 1.5 }} className="col-info">
            <h3>{u.fullName || u.username}</h3>
            <div className="sub-info">
              <span className="sku-tag">{u.email}</span>
              <span className="sku-tag">| {u.phone || 'No phone'}</span>
            </div>
          </div>

          {/* Status Badge [cite: 153] */}
          <div style={{ flex: 1 }} className="col-status">
            <span className={`status-pill ${u.status === 'LOCKED' ? 'inactive' : 'active'}`}>
              {u.status || "ACTIVE"}
            </span>
          </div>

          {/* Roles List  */}
          <div style={{ flex: 1 }}>
            {u.roles?.map(r => (
              <span key={r.id} className="cate-tag" style={{ marginRight: '5px' }}>{r.name}</span>
            ))}
          </div>

          {/* Action Buttons  */}
          <div className="col-actions" style={{ flex: 1.5 }}>


            {/* View Customer Profile [cite: 138, 192] */}
            <button className="row-btn tag" onClick={() => viewCustomerProfile(u)} title="Profile">
              <i className="fas fa-id-card"></i>
            </button>

            {/* Edit User Information  */}
            <button className="row-btn edit" onClick={() => handleEdit(u)} title="Edit">
              <i className="fas fa-pen"></i>
            </button>

            {/* Lock/Unlock Account Toggle [cite: 153] */}
            <button
              className={`row-btn ${u.status === "LOCKED" ? "build" : "delete"}`}
              onClick={() => handleToggleLock(u.id, u.status)}
              title={u.status === "LOCKED" ? "Unlock User" : "Lock User"}
            >
              <i className={`fas fa-user-${u.status === "LOCKED" ? "check" : "slash"}`}></i>
            </button>

            {/* Delete User Button [cite: 155] */}
            <button className="row-btn delete" onClick={() => handleDelete(u.id)} title="Delete">
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>
      ))}

      {/* Empty State Illustration */}
      {users.length === 0 && (
        <div className="empty-state" style={{ padding: "40px", textAlign: "center" }}>
          <i className="fas fa-users-slash fa-3x" style={{ color: "#ccc", marginBottom: "10px" }}></i>
          <p>No user data found in the system. ☕</p>
        </div>
      )}
    </div>
  );
}

export default UserTable;
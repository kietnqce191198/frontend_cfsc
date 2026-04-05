import React from "react";


/**
 * COMPONENT: UserTable
 * Hiển thị danh sách người dùng và các hành động quản trị.
 */
const CUSTOMER_ROLES = new Set(["ROLE_CUSTOMER", "CUSTOMER"]);
function UserTable({ users, onToggleLock, deleteUser, editUser, viewLoyalty, viewCustomerProfile }) {

  // 1. Xử lý Khóa/Mở khóa tài khoản
  const handleToggleLock = async (id, status) => {
    try {
      if (onToggleLock) {
        await onToggleLock(id, status);
      }
    } catch (error) {
      console.error("Toggle lock failed:", error);
      alert("Có lỗi xảy ra khi thay đổi trạng thái khóa.");
    }
  };

  // 2. Xử lý Xóa người dùng
  const handleDelete = (id) => {
    if (deleteUser && window.confirm("Bạn có chắc chắn muốn xóa người dùng này?")) {
      deleteUser(id);
    }
  };

  // 3. Xử lý Sửa người dùng
  const handleEdit = (user) => {
    if (editUser) editUser(user);
  };


  const handleViewLoyalty = (user) => {
    if (viewLoyalty) {

      // DEBUG (có thể xóa sau)
      console.log("USER OBJECT:", user);

      const targetId = user.userId || user.id;

      console.log("CALL LOYALTY WITH ID:", targetId);

      viewLoyalty(targetId);
    }
  };

  return (
  <div className="product-table"> {/* Dùng class cũ để lấy style hàng */}
    <div className="table-header-row">
      <span style={{ flex: 1.5 }}>User Info</span>
      <span style={{ flex: 1 }}>Status</span>
      <span style={{ flex: 1 }}>Roles</span>
      <span style={{ flex: 1.5, textAlign: 'right' }}>Actions</span>
    </div>

    {users.map((u) => (
      <div key={u.id} className="product-row">
        <div style={{ flex: 1.5 }} className="col-info">
          <h3>{u.fullName || u.username}</h3>
          <div className="sub-info">
            <span className="sku-tag">{u.email}</span>
            <span className="sku-tag">| {u.phone || 'No phone'}</span>
          </div>
        </div>

        <div style={{ flex: 1 }} className="col-status">
          <span className={`status-pill ${u.status === 'LOCKED' ? 'inactive' : 'active'}`}>
            {u.status || "ACTIVE"}
          </span>
        </div>

        <div style={{ flex: 1 }}>
          {u.roles?.map(r => (
            <span key={r.id} className="cate-tag" style={{ marginRight: '5px' }}>{r.name}</span>
          ))}
        </div>

        <div className="col-actions" style={{ flex: 1.5 }}>
          
          
          {/* Icon Profile */}
          <button className="row-btn tag" onClick={() => viewCustomerProfile(u)} title="Profile">
             <i className="fas fa-id-card"></i>
          </button>

          <button className="row-btn edit" onClick={() => handleEdit(u)}  title="Edit"><i className="fas fa-pen"></i></button>
          
          <button className={`row-btn ${u.status === "LOCKED" ? "build" : "delete"}`} 
                  onClick={() => handleToggleLock(u.id, u.status)}
                  title="Lock/Unlock"
                  >
                    
            <i className={`fas fa-user-${u.status === "LOCKED" ? "check" : "slash"}`}></i>
          </button>

          <button className="row-btn delete" onClick={() => handleDelete(u.id)} title="Delete"><i className="fas fa-trash"></i></button>
        </div>
      </div>
    ))}
  </div>
);
}

export default UserTable;

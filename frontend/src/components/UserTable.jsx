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
    <div className="table-responsive">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Full Name</th>
            <th>Status</th>
            <th>Roles</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {!users || users.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px" }}>
                No users found in system
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.fullName}</td>

                <td>
                  <span className={`status-badge ${u.status === 'LOCKED' ? 'status-locked' : 'status-active'}`}>
                    {u.status || "ACTIVE"}
                  </span>
                </td>

                <td>
                  {u.roles && u.roles.length > 0
                    ? u.roles.map((r) => r.name).join(", ")
                    : "No Role"}
                </td>

                <td className="action-buttons">
                  {u.roles?.some((r) => CUSTOMER_ROLES.has(r.name)) && (
                    <button
                      className="view-btn"
                      onClick={() => viewCustomerProfile(u)}
                    >
                      Customer Profile
                    </button>
                  )}

                  <button
                    className="edit-btn"
                    onClick={() => handleEdit(u)}
                  >
                    Edit
                  </button>

                  <button
                    className={`lock-btn ${u.status === "LOCKED" ? "unlock" : "lock"}`}
                    onClick={() => handleToggleLock(u.id, u.status)}
                  >
                    {u.status === "LOCKED" ? "Unlock" : "Lock"}
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleDelete(u.id)}
                  >
                    Delete
                  </button>


                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default UserTable;

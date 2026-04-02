import { useNavigate } from "react-router-dom";

function AdminDashboard() {

  const navigate = useNavigate();

  return (
    <div className="container mt-5">

      <h1 className="mb-4">Admin Management</h1>

      <div className="list-group">

        {/* USER */}
        <div
          className="list-group-item list-group-item-action d-flex align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/users")}
        >
          <span style={{ fontSize: "28px", marginRight: "15px" }}>👤</span>

          <div>
            <h5 className="mb-1">User Management</h5>
            <small className="text-muted">Manage system users</small>
          </div>
        </div>

        {/* PERMISSION */}
        <div
          className="list-group-item list-group-item-action d-flex align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/permissions")}
        >
          <span style={{ fontSize: "28px", marginRight: "15px" }}>🔑</span>

          <div>
            <h5 className="mb-1">Permission Management</h5>
            <small className="text-muted">Manage system permissions</small>
          </div>
        </div>

        {/* ROLE */}
        <div
          className="list-group-item list-group-item-action d-flex align-items-center"
          style={{ cursor: "pointer" }}
          onClick={() => navigate("/roles")}
        >
          <span style={{ fontSize: "28px", marginRight: "15px" }}>🛡️</span>

          <div>
            <h5 className="mb-1">Role Management</h5>
            <small className="text-muted">Manage roles and permissions</small>
          </div>
        </div>

        

      </div>

    </div>
  );
}

export default AdminDashboard;
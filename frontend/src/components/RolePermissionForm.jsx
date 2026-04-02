function RolePermissionForm({ role, allPermissions, assignPermission }) {
  return (
    <div className="role-card">
      <h3>{role.name}</h3>

      <div className="permission-list">
        {allPermissions.map((perm) => (
          <label key={perm} className="permission-item">
            <input
              type="checkbox"
              checked={role.permissions.includes(perm)}
              onChange={() => assignPermission(role.id, perm)}
            />
            {perm}
          </label>
        ))}
      </div>
    </div>
  );
}

export default RolePermissionForm;
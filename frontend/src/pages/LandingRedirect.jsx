import { Navigate } from "react-router-dom";

function LandingRedirect() {
  const profile = localStorage.getItem("accountProfile");
  const user = profile ? JSON.parse(profile) : null;

  if (!user) return <Navigate to="/" />; // chưa login → home

  // ADMIN / MANAGER → admin panel
  if (user.roles.includes("ROLE_ADMIN") || user.roles.includes("MANAGER")) {
    return <Navigate to="/admin/users" />;
  }

  // Role khác / customer → ở lại home
  return <Navigate to="/" />;
}

export default LandingRedirect;
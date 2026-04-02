

// src/routes/AdminRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  // Lấy profile từ localStorage
  const profileStr = localStorage.getItem('accountProfile');
  const profile = profileStr ? JSON.parse(profileStr) : null;

  if (!profile) {
    // Chưa login → redirect về homepage
    return <Navigate to="/" replace />;
  }

  const roles = profile.roles || [];
  if (roles.includes('ROLE_ADMIN') || roles.includes('MANAGER') || roles.includes('ADMIN')) {
    // Admin / Manager → render admin panel
    return <>{children}</>;
  }

  // Role khác → redirect về homepage
  return <Navigate to="/" replace />;
};

export default AdminRoute;


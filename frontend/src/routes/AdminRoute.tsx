import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { canAccessAdminWorkspace, getLandingRouteForProfile } from '../lib/roleUtils';
import { canAccessAdminPath, getPrimaryAdminAction } from '../lib/adminWorkspace';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const location = useLocation();
  const profileStr = localStorage.getItem('accountProfile');
  const profile = profileStr ? JSON.parse(profileStr) : null;

  if (!profile) {
    return <Navigate to="/" replace />;
  }

  if (!canAccessAdminWorkspace(profile)) {
    return <Navigate to={getLandingRouteForProfile(profile)} replace />;
  }

  if (!canAccessAdminPath(profile, location.pathname)) {
    const fallbackRoute = getPrimaryAdminAction(profile)?.to || '/admin';
    if (fallbackRoute !== location.pathname) {
      return <Navigate to={fallbackRoute} replace />;
    }

    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

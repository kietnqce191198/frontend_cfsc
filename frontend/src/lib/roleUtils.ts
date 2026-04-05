export type AccessProfile = {
  roles?: string[] | null;
  permissions?: string[] | null;
};

const normalizeRole = (role: string) => role.trim().toUpperCase().replace(/^ROLE_/, "");
const normalizePermission = (permission: string) => permission.trim().toUpperCase();

const ADMIN_LANDING_RULES = [
  { route: "/admin/users", permissions: ["USER_VIEW", "USER:VIEW"] },
  { route: "/admin/roles", permissions: ["ROLE:READ", "ROLE:CREATE", "ROLE:UPDATE", "ROLE:DELETE"] },
  { route: "/admin/permissions", permissions: ["PERMISSION:READ", "PERMISSION:CREATE", "PERMISSION:UPDATE", "PERMISSION:DELETE"] },
  { route: "/admin/segments", permissions: ["SEGMENT:READ", "SEGMENT:CREATE", "SEGMENT:UPDATE", "SEGMENT:DELETE"] },
  { route: "/admin/loyalty-studio", permissions: ["LOYALTY:CONFIG", "LOYALTY:MANAGE_BENEFITS"] },
  { route: "/admin/loyaltyreport", permissions: ["LOYALTY:REPORT"] },
  { route: "/admin/promotions", permissions: ["PROMOTION:READ", "PROMOTION:CREATE", "PROMOTION:UPDATE", "PROMOTION:DELETE", "PROMOTION:REPORT"] },
  { route: "/admin/coupons", permissions: ["COUPON_CREATE", "COUPON_UPDATE", "COUPON_DEACTIVATE"] },
  { route: "/admin/categories", permissions: ["CATEGORY:READ", "CATEGORY:CREATE", "CATEGORY:UPDATE", "CATEGORY:DELETE"] },
  { route: "/admin/products", permissions: ["PRODUCT:READ", "PRODUCT:CREATE", "PRODUCT:UPDATE", "PRODUCT:DELETE"] },
];

const ADMIN_PANEL_ENTRY_PERMISSIONS = Array.from(
  new Set(ADMIN_LANDING_RULES.flatMap((rule) => rule.permissions)),
);

export const normalizeRoles = (roles?: string[] | null) =>
  Array.isArray(roles)
    ? roles
        .map((role) => role?.trim())
        .filter((role): role is string => Boolean(role))
        .map(normalizeRole)
    : [];

export const normalizePermissions = (permissions?: string[] | null) =>
  Array.isArray(permissions)
    ? permissions
        .map((permission) => permission?.trim())
        .filter((permission): permission is string => Boolean(permission))
        .map(normalizePermission)
    : [];

export const hasAnyRole = (roles: string[] | null | undefined, expectedRoles: string[]) => {
  const normalizedRoles = new Set(normalizeRoles(roles));
  return expectedRoles.some((role) => normalizedRoles.has(normalizeRole(role)));
};

export const hasAnyPermission = (
  permissions: string[] | null | undefined,
  expectedPermissions: string[],
) => {
  const normalizedPermissions = new Set(normalizePermissions(permissions));
  return expectedPermissions.some((permission) => normalizedPermissions.has(normalizePermission(permission)));
};

export const isCustomerRoleSet = (roles?: string[] | null) =>
  hasAnyRole(roles, ["CUSTOMER"]);

export const isAdminLikeRoleSet = (roles?: string[] | null) =>
  hasAnyRole(roles, ["ADMIN", "SUPER_ADMIN"]);

export const isCustomerOnlyRoleSet = (roles?: string[] | null) => {
  const normalizedRoles = normalizeRoles(roles);

  return normalizedRoles.length > 0 && normalizedRoles.every((role) => role === "CUSTOMER");
};

export const canAccessAdminWorkspace = (profile?: AccessProfile | null) => {
  if (isCustomerOnlyRoleSet(profile?.roles)) {
    return false;
  }

  return hasAnyPermission(profile?.permissions, ADMIN_PANEL_ENTRY_PERMISSIONS) || isAdminLikeRoleSet(profile?.roles);
};

export const getLandingRouteForProfile = (profile?: AccessProfile | null) => {
  if (isCustomerOnlyRoleSet(profile?.roles)) {
    return "/";
  }

  if (canAccessAdminWorkspace(profile)) {
    return "/admin";
  }

  return "/";
};

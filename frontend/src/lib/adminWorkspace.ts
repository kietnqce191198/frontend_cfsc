import type { AccessProfile } from "./roleUtils";
import { hasAnyPermission, isAdminLikeRoleSet } from "./roleUtils";

export type AdminWorkspaceItem = {
  id: string;
  label: string;
  description: string;
  to: string;
  icon: string;
  permissions?: string[];
  end?: boolean;
};

export type AdminWorkspaceSection = {
  id: string;
  label: string;
  description: string;
  items: AdminWorkspaceItem[];
};

export const CATEGORY_PERMISSIONS = ["CATEGORY:READ", "CATEGORY:CREATE", "CATEGORY:UPDATE", "CATEGORY:DELETE"];
export const PRODUCT_PERMISSIONS = ["PRODUCT:READ", "PRODUCT:CREATE", "PRODUCT:UPDATE", "PRODUCT:DELETE"];
export const PROMOTION_PERMISSIONS = ["PROMOTION:READ", "PROMOTION:CREATE", "PROMOTION:UPDATE", "PROMOTION:DELETE", "PROMOTION:REPORT"];
export const COUPON_PERMISSIONS = ["COUPON_CREATE", "COUPON_UPDATE", "COUPON_DEACTIVATE"];
export const SEGMENT_PERMISSIONS = ["SEGMENT:READ", "SEGMENT:CREATE", "SEGMENT:UPDATE", "SEGMENT:DELETE"];
export const LOYALTY_STUDIO_PERMISSIONS = ["LOYALTY:CONFIG", "LOYALTY:MANAGE_BENEFITS"];
export const LOYALTY_OPERATIONS_PERMISSIONS = ["LOYALTY:MANAGE", "LOYALTY:REPORT", "LOYALTY:CONFIG", "LOYALTY:MANAGE_BENEFITS"];
export const ANALYTICS_PERMISSIONS = ["PROMOTION:REPORT", "LOYALTY:REPORT"];
export const USER_PERMISSIONS = ["USER_VIEW", "USER:VIEW"];
export const CUSTOMER_PROFILE_PERMISSIONS = ["CUSTOMER:READ", "CUSTOMER_READ", "USER_VIEW", "USER:VIEW"];
export const ROLE_PERMISSIONS = ["ROLE:READ", "ROLE:CREATE", "ROLE:UPDATE", "ROLE:DELETE"];
export const PERMISSION_PERMISSIONS = ["PERMISSION:READ", "PERMISSION:CREATE", "PERMISSION:UPDATE", "PERMISSION:DELETE"];

export const ADMIN_WORKSPACE_SECTIONS: AdminWorkspaceSection[] = [
  {
    id: "command",
    label: "Command Layer",
    description: "Start from the operational overview before drilling into modules.",
    items: [
      {
        id: "command-center",
        label: "Command Center",
        description: "Supply overview, workflow lanes, and quick entry points.",
        to: "/admin",
        icon: "fas fa-compass",
        end: true,
      },
    ],
  },
  {
    id: "catalog",
    label: "Catalog & Supply",
    description: "Shape menu structure, production inputs, and branch readiness.",
    items: [
      {
        id: "categories",
        label: "Catalog Groups",
        description: "Category hierarchy and storefront structure.",
        to: "/admin/categories",
        icon: "fas fa-layer-group",
        permissions: CATEGORY_PERMISSIONS,
      },
      {
        id: "products",
        label: "Products & Inputs",
        description: "Products, ingredients, and franchise availability.",
        to: "/admin/products",
        icon: "fas fa-box-open",
        permissions: PRODUCT_PERMISSIONS,
      },
    ],
  },
  {
    id: "demand",
    label: "Demand & Retention",
    description: "Launch offers, shape loyalty logic, and watch demand response.",
    items: [
      {
        id: "promotions",
        label: "Campaigns",
        description: "Promotions, launch offers, and campaign control.",
        to: "/admin/promotions",
        icon: "fas fa-bullhorn",
        permissions: PROMOTION_PERMISSIONS,
      },
      {
        id: "coupons",
        label: "Voucher Pool",
        description: "Coupon inventory and redemption levers.",
        to: "/admin/coupons",
        icon: "fas fa-ticket-alt",
        permissions: COUPON_PERMISSIONS,
      },
      {
        id: "segments",
        label: "Customer Segments",
        description: "Demand cohorts and targeting groups.",
        to: "/admin/segments",
        icon: "fas fa-users-cog",
        permissions: SEGMENT_PERMISSIONS,
      },
      {
        id: "loyalty-studio",
        label: "Tier Rules",
        description: "Loyalty configuration, benefits, and tier design.",
        to: "/admin/loyalty-studio",
        icon: "fas fa-gem",
        permissions: LOYALTY_STUDIO_PERMISSIONS,
      },
      {
        id: "loyalty-ops",
        label: "Rewards Desk",
        description: "Operational loyalty actions and customer rewards.",
        to: "/admin/loyalty",
        icon: "fas fa-award",
        permissions: LOYALTY_OPERATIONS_PERMISSIONS,
      },
      {
        id: "analytics",
        label: "Demand Analytics",
        description: "Engagement signals, campaign lift, and reporting.",
        to: "/admin/engagementanalytics",
        icon: "fas fa-chart-line",
        permissions: ANALYTICS_PERMISSIONS,
      },
    ],
  },
  {
    id: "governance",
    label: "Workspace Control",
    description: "Internal access, team oversight, and account governance.",
    items: [
      {
        id: "users",
        label: "Team & Accounts",
        description: "Internal users and customer-linked accounts.",
        to: "/admin/users",
        icon: "fas fa-user-shield",
        permissions: USER_PERMISSIONS,
      },
      {
        id: "roles",
        label: "Role Sets",
        description: "Role architecture for internal teams.",
        to: "/admin/roles",
        icon: "fas fa-user-tag",
        permissions: ROLE_PERMISSIONS,
      },
      {
        id: "permissions",
        label: "Access Rules",
        description: "Permission mapping and control surfaces.",
        to: "/admin/permissions",
        icon: "fas fa-key",
        permissions: PERMISSION_PERMISSIONS,
      },
    ],
  },
];

const canSeeItem = (profile: AccessProfile | null | undefined, item: AdminWorkspaceItem) => {
  if (isAdminLikeRoleSet(profile?.roles)) {
    return true;
  }

  if (!item.permissions || item.permissions.length === 0) {
    return true;
  }

  return hasAnyPermission(profile?.permissions, item.permissions);
};

export const getVisibleAdminSections = (profile: AccessProfile | null | undefined) =>
  ADMIN_WORKSPACE_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canSeeItem(profile, item)),
  })).filter((section) => section.items.length > 0);

export const getPrimaryAdminAction = (profile: AccessProfile | null | undefined) => {
  const visibleSections = getVisibleAdminSections(profile);
  const firstOperationalItem = visibleSections
    .flatMap((section) => section.items)
    .find((item) => item.id !== "command-center");

  return firstOperationalItem ?? visibleSections[0]?.items[0] ?? null;
};

const ADMIN_ROUTE_POLICIES: Array<{ test: RegExp; permissions?: string[] }> = [
  { test: /^\/admin(?:\/dashboard)?\/?$/i },
  { test: /^\/admin\/account\/?$/i },
  { test: /^\/admin\/users(?:\/.*)?$/i, permissions: USER_PERMISSIONS },
  { test: /^\/admin\/roles(?:\/.*)?$/i, permissions: ROLE_PERMISSIONS },
  { test: /^\/admin\/permissions(?:\/.*)?$/i, permissions: PERMISSION_PERMISSIONS },
  { test: /^\/admin\/segments(?:\/.*)?$/i, permissions: SEGMENT_PERMISSIONS },
  { test: /^\/admin\/customers(?:\/.*)?$/i, permissions: CUSTOMER_PROFILE_PERMISSIONS },
  { test: /^\/admin\/loyalty-studio(?:\/.*)?$/i, permissions: LOYALTY_STUDIO_PERMISSIONS },
  { test: /^\/admin\/loyaltyreport\/?$/i, permissions: ANALYTICS_PERMISSIONS },
  { test: /^\/admin\/loyalty\/?$/i, permissions: LOYALTY_OPERATIONS_PERMISSIONS },
  { test: /^\/admin\/promotions(?:\/.*)?$/i, permissions: PROMOTION_PERMISSIONS },
  { test: /^\/admin\/analytics\/promotions(?:\/.*)?$/i, permissions: PROMOTION_PERMISSIONS },
  { test: /^\/admin\/coupons(?:\/.*)?$/i, permissions: COUPON_PERMISSIONS },
  { test: /^\/admin\/categories(?:\/.*)?$/i, permissions: CATEGORY_PERMISSIONS },
  { test: /^\/admin\/products(?:\/.*)?$/i, permissions: PRODUCT_PERMISSIONS },
  { test: /^\/admin\/product-image\/?$/i, permissions: PRODUCT_PERMISSIONS },
  { test: /^\/admin\/engagementanalytics\/?$/i, permissions: ANALYTICS_PERMISSIONS },
];

export const canAccessAdminPath = (
  profile: AccessProfile | null | undefined,
  pathname: string,
) => {
  if (isAdminLikeRoleSet(profile?.roles)) {
    return true;
  }

  const matchedPolicy = ADMIN_ROUTE_POLICIES.find((policy) => policy.test.test(pathname));
  if (!matchedPolicy) {
    return false;
  }

  if (!matchedPolicy.permissions || matchedPolicy.permissions.length === 0) {
    return true;
  }

  return hasAnyPermission(profile?.permissions, matchedPolicy.permissions);
};

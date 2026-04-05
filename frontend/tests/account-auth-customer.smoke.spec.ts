import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const AUTH_BASE_URL = process.env.PLAYWRIGHT_AUTH_BASE_URL || "http://localhost:8081";
const CUSTOMER_BASE_URL = process.env.PLAYWRIGHT_CUSTOMER_BASE_URL || "http://localhost:8082";

const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "123456";
const TEMP_USER_PASSWORD = process.env.PLAYWRIGHT_TEMP_USER_PASSWORD || "Temp123!";

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AccountProfile = {
  id: number;
  username?: string;
  email: string;
  fullName: string;
  phone: string;
  avatarUrl?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  status?: string | null;
  roles?: string[];
  permissions?: string[];
  lastLoginAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type CustomerLookupResponse = {
  customerId: number;
  customerCode: string;
  userId: number;
};

type RoleListItem = {
  id: number;
  name: string;
};

type RoleListResponse = {
  data: RoleListItem[];
  total: number;
  page: number;
  limit: number;
};

type UserDto = {
  id: number;
  username: string;
  phone?: string | null;
  email: string;
  fullName: string;
  status?: string;
  roles?: Array<{ id: number; name: string }>;
};

type SeededSession = {
  accessToken: string;
  refreshToken?: string;
  email: string;
  username?: string;
  fullName?: string;
  roles?: string[];
  permissions?: string[];
  customerId?: number;
};

type PermissionListItem = {
  id: number;
  name: string;
};

type PermissionPageResponse = ApiEnvelope<{
  content?: PermissionListItem[];
}>;

type CreateRoleResponse = {
  role_id: number;
};

type JwtClaims = {
  userId?: number;
  sub?: string;
  email?: string;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function parseJwtClaims(token: string): JwtClaims {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtClaims;
}

async function login(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<LoginResponse> {
  const response = await request.post(`${AUTH_BASE_URL}/api/auth/login`, {
    data: { email, password },
  });

  expect(
    response.ok(),
    `Login failed for ${email}. Make sure auth-service is running and demo users are seeded.`,
  ).toBeTruthy();

  const data = (await response.json()) as LoginResponse;
  expect(data.accessToken, `Login response for ${email} did not contain accessToken.`).toBeTruthy();
  return data;
}

async function getMyAccount(
  request: APIRequestContext,
  token: string,
): Promise<AccountProfile> {
  const response = await request.get(`${AUTH_BASE_URL}/api/accounts/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(
    response.ok(),
    `Could not load /api/accounts/me: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as ApiEnvelope<AccountProfile>;
  return payload.data;
}

async function updateMyAccount(
  request: APIRequestContext,
  token: string,
  payload: {
    fullName: string;
    phone: string;
    address?: string | null;
    dateOfBirth?: string | null;
  },
) {
  const response = await request.put(`${AUTH_BASE_URL}/api/accounts/me`, {
    headers: authHeaders(token),
    data: payload,
  });

  expect(
    response.ok(),
    `Could not restore account profile: ${await response.text()}`,
  ).toBeTruthy();
}

async function findCustomerByUserId(
  request: APIRequestContext,
  token: string,
  userId: number,
): Promise<CustomerLookupResponse | null> {
  const response = await request.get(`${CUSTOMER_BASE_URL}/api/customers/by-user/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status() === 404) {
    return null;
  }

  expect(
    response.ok(),
    `Could not look up customer by user ${userId}: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as ApiEnvelope<CustomerLookupResponse>;
  return payload.data;
}

async function ensureCustomerRecord(
  request: APIRequestContext,
  token: string,
  userId: number,
) {
  const existing = await findCustomerByUserId(request, token, userId);
  if (existing) {
    return { lookup: existing, created: false };
  }

  const createResponse = await request.post(
    `${CUSTOMER_BASE_URL}/api/customers/create-if-not-exists?userId=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  expect(
    createResponse.ok(),
    `Could not create customer record for user ${userId}: ${await createResponse.text()}`,
  ).toBeTruthy();

  const lookup = await findCustomerByUserId(request, token, userId);
  expect(lookup, `Customer record for user ${userId} was not available after create-if-not-exists.`).not.toBeNull();

  return {
    lookup: lookup as CustomerLookupResponse,
    created: true,
  };
}

async function deleteCustomerByUserId(
  request: APIRequestContext,
  token: string,
  userId: number,
) {
  await request.delete(`${CUSTOMER_BASE_URL}/api/customers/delete-by-user?userId=${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function getRoleIdByName(
  request: APIRequestContext,
  token: string,
  roleName: string,
): Promise<number> {
  const response = await request.get(`${AUTH_BASE_URL}/api/roles?page=1&limit=50`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(
    response.ok(),
    `Could not load roles: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as RoleListResponse;
  const role = payload.data.find((item) => item.name === roleName);
  expect(role, `Role ${roleName} was not found in auth-service.`).toBeTruthy();
  return (role as RoleListItem).id;
}

async function getPermissionIdByName(
  request: APIRequestContext,
  token: string,
  permissionName: string,
): Promise<number> {
  const response = await request.get(`${AUTH_BASE_URL}/api/permissions?page=0&size=1000`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  expect(
    response.ok(),
    `Could not load permissions: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as PermissionPageResponse;
  const items = payload.data?.content || [];
  const permission = items.find((item) => item.name === permissionName);
  expect(permission, `Permission ${permissionName} was not found in auth-service.`).toBeTruthy();
  return (permission as PermissionListItem).id;
}

async function ensurePermissionId(
  request: APIRequestContext,
  token: string,
  permission: {
    name: string;
    resource: string;
    action: string;
    description: string;
  },
): Promise<number> {
  try {
    return await getPermissionIdByName(request, token, permission.name);
  } catch {
    const createResponse = await request.post(`${AUTH_BASE_URL}/api/permissions`, {
      headers: authHeaders(token),
      data: permission,
    });

    expect(
      createResponse.ok(),
      `Could not create permission ${permission.name}: ${await createResponse.text()}`,
    ).toBeTruthy();

    return getPermissionIdByName(request, token, permission.name);
  }
}

async function createTemporaryRole(
  request: APIRequestContext,
  adminToken: string,
  permissionIds: number[],
) {
  const suffix = Date.now();
  const roleName = `PW_ACCESS_${suffix}`;
  const response = await request.post(`${AUTH_BASE_URL}/api/roles`, {
    headers: authHeaders(adminToken),
    data: {
      name: roleName,
      description: "Temporary Playwright access role",
      isActive: true,
      permissionIds,
    },
  });

  expect(
    response.ok(),
    `Could not create temporary role: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as CreateRoleResponse;
  expect(payload.role_id, "Temporary role response did not contain role_id.").toBeTruthy();
  return {
    roleId: payload.role_id,
    roleName,
  };
}

async function deleteRole(
  request: APIRequestContext,
  adminToken: string,
  roleId: number,
) {
  await request.delete(`${AUTH_BASE_URL}/api/roles/${roleId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
}

async function createTemporaryStandardUser(
  request: APIRequestContext,
  adminToken: string,
) {
  const suffix = Date.now();
  const email = `pw-smoke-${suffix}@example.com`;
  const username = `pw_smoke_${suffix}`;
  const fullName = `Playwright User ${suffix}`;
  const phone = `+849${String(suffix).slice(-8)}`;
  const userRoleId = await getRoleIdByName(request, adminToken, "USER");

  const response = await request.post(`${AUTH_BASE_URL}/users`, {
    headers: authHeaders(adminToken),
    data: {
      username,
      email,
      password: TEMP_USER_PASSWORD,
      fullName,
      phone,
      roleIds: [userRoleId],
    },
  });

  expect(
    response.ok(),
    `Could not create temporary user: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as UserDto;
  return {
    user: payload,
    credentials: {
      email,
      password: TEMP_USER_PASSWORD,
    },
  };
}

async function createTemporaryUserWithRoleIds(
  request: APIRequestContext,
  adminToken: string,
  roleIds: number[],
) {
  const suffix = Date.now();
  const email = `pw-admin-${suffix}@example.com`;
  const username = `pw_admin_${suffix}`;
  const fullName = `Playwright Access ${suffix}`;
  const phone = `+849${String(suffix).slice(-8)}`;

  const response = await request.post(`${AUTH_BASE_URL}/users`, {
    headers: authHeaders(adminToken),
    data: {
      username,
      email,
      password: TEMP_USER_PASSWORD,
      fullName,
      phone,
      roleIds,
    },
  });

  expect(
    response.ok(),
    `Could not create temporary role-based user: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as UserDto;
  return {
    user: payload,
    credentials: {
      email,
      password: TEMP_USER_PASSWORD,
    },
  };
}

async function deleteUser(
  request: APIRequestContext,
  adminToken: string,
  userId: number,
) {
  await request.delete(`${AUTH_BASE_URL}/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
}

async function seedSession(page: Page, session: SeededSession) {
  await page.addInitScript((storage) => {
    localStorage.setItem("accessToken", storage.accessToken);
    if (storage.refreshToken) {
      localStorage.setItem("refreshToken", storage.refreshToken);
    }
    localStorage.setItem("email", storage.email);
    if (storage.username) {
      localStorage.setItem("username", storage.username);
    } else {
      localStorage.removeItem("username");
    }
    if (storage.customerId) {
      localStorage.setItem("customerId", String(storage.customerId));
    }
    localStorage.setItem(
      "accountProfile",
      JSON.stringify({
        email: storage.email,
        username: storage.username,
        fullName: storage.fullName,
        roles: storage.roles || [],
        permissions: storage.permissions || [],
      }),
    );
  }, session);
}

test("forgot password request works from the homepage flow", async ({ page }) => {
  const uniqueEmail = `pw-forgot-${Date.now()}@example.com`;

  await page.goto("/");
  await expect(page.locator("section.home")).toBeVisible();

  await page.locator("#login-btn").click();
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

  await page.getByRole("button", { name: "Forgot password", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Forgot Password" })).toBeVisible();

  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Enter your email.")).toBeVisible();

  await page.locator("#forgot-email").fill("not-an-email");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Enter a valid email.")).toBeVisible();

  await page.locator("#forgot-email").fill(uniqueEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("Reset link sent to email")).toBeVisible();
});

test("admin sign-in from the homepage lands in the admin workspace", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("section.home")).toBeVisible();

  await page.locator("#login-btn").click();
  await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

  await page.locator("#login-email").fill(ADMIN_EMAIL);
  await page.locator("#login-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Supply Chain Command Center" })).toBeVisible();
});

test("admin sessions stay in back office when visiting the storefront route", async ({
  page,
  request,
}) => {
  const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminProfile = await getMyAccount(request, session.accessToken);

  await seedSession(page, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    email: adminProfile.email,
    username: adminProfile.username,
    fullName: adminProfile.fullName,
    roles: adminProfile.roles,
    permissions: adminProfile.permissions,
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Supply Chain Command Center" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Storefront" })).toHaveCount(0);
});

test("admin sessions are redirected from the public account route to admin account", async ({
  page,
  request,
}) => {
  const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminProfile = await getMyAccount(request, session.accessToken);

  await seedSession(page, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    email: adminProfile.email,
    username: adminProfile.username,
    fullName: adminProfile.fullName,
    roles: adminProfile.roles,
    permissions: adminProfile.permissions,
  });

  await page.goto("/account");
  await expect(page).toHaveURL(/\/admin\/account$/);
  await expect(page.getByRole("heading", { name: "Admin Profile" })).toBeVisible();
});

test("user with admin-side permission can enter the admin workspace without admin role", async ({
  page,
  request,
}) => {
  const adminSession = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const categoryReadPermissionId = await getPermissionIdByName(request, adminSession.accessToken, "CATEGORY:READ");
  const tempRole = await createTemporaryRole(request, adminSession.accessToken, [categoryReadPermissionId]);
  const tempUser = await createTemporaryUserWithRoleIds(request, adminSession.accessToken, [tempRole.roleId]);

  try {
    await page.goto("/");
    await expect(page.locator("section.home")).toBeVisible();

    await page.locator("#login-btn").click();
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

    await page.locator("#login-email").fill(tempUser.credentials.email);
    await page.locator("#login-password").fill(tempUser.credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Supply Chain Command Center" })).toBeVisible();
  } finally {
    await deleteUser(request, adminSession.accessToken, tempUser.user.id);
    await deleteRole(request, adminSession.accessToken, tempRole.roleId);
  }
});

test("promotion-report users can open demand analytics without loyalty-report access", async ({
  page,
  request,
}) => {
  const adminSession = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const promotionReportPermissionId = await ensurePermissionId(request, adminSession.accessToken, {
    name: "PROMOTION:REPORT",
    resource: "PROMOTION",
    action: "REPORT",
    description: "View promotion analytics reports",
  });
  const tempRole = await createTemporaryRole(request, adminSession.accessToken, [promotionReportPermissionId]);
  const tempUser = await createTemporaryUserWithRoleIds(request, adminSession.accessToken, [tempRole.roleId]);

  try {
    await page.goto("/");
    await expect(page.locator("section.home")).toBeVisible();

    await page.locator("#login-btn").click();
    await expect(page.getByRole("heading", { name: "Sign In" })).toBeVisible();

    await page.locator("#login-email").fill(tempUser.credentials.email);
    await page.locator("#login-password").fill(tempUser.credentials.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page).toHaveURL(/\/admin$/);

    await page.goto("/admin/engagementanalytics");
    await expect(page.getByRole("heading", { name: "Demand Analytics" })).toBeVisible();
    await expect(page.getByText("Loyalty reporting is not enabled for this account.")).toBeVisible();
    await expect(page.getByText("Campaign Performance")).toBeVisible();
    await expect(page.getByText("You are not authorized to perform this action (403)")).toHaveCount(0);
  } finally {
    await deleteUser(request, adminSession.accessToken, tempUser.user.id);
    await deleteRole(request, adminSession.accessToken, tempRole.roleId);
  }
});

test("customer-only sessions stay on the storefront even with storefront read permissions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("email", "customer@example.com");
    localStorage.setItem(
      "accountProfile",
      JSON.stringify({
        email: "customer@example.com",
        username: "customer_demo",
        fullName: "Customer Demo",
        roles: ["ROLE_CUSTOMER"],
        permissions: ["CUSTOMER:READ", "CATEGORY:READ", "PRODUCT:READ"],
      }),
    );
  });

  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("section.home")).toBeVisible();

  await page.locator(".user-profile-trigger").click();
  await expect(page.getByRole("button", { name: "Supply Chain" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Customer Profile" })).toBeVisible();

  await page.goto("/admin/categories");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("section.home")).toBeVisible();
});

test("signed-in user can update account info without uploading a new avatar", async ({
  page,
  request,
}) => {
  const adminSession = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const tempUser = await createTemporaryStandardUser(request, adminSession.accessToken);
  try {
    const session = await login(request, tempUser.credentials.email, tempUser.credentials.password);
    const originalProfile = await getMyAccount(request, session.accessToken);
    const suffix = Date.now();
    const updatedFullName = `Smoke User ${suffix}`;
    const updatedPhone = `+849${String(suffix).slice(-8)}`;
    const updatedAddress = `Smoke address ${suffix}`;
    const updatedDob = "1998-05-20";

    await seedSession(page, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      email: originalProfile.email,
      username: originalProfile.username,
      fullName: originalProfile.fullName,
      roles: originalProfile.roles,
    });

    await page.goto("/account");
    await expect(page.getByRole("heading", { name: "Account Overview" })).toBeVisible();

    await page.getByRole("button", { name: "Edit Profile" }).click();
    await expect(page.getByRole("heading", { name: "Edit Profile" })).toBeVisible();

    await page.getByLabel("Full Name").fill(updatedFullName);
    await page.getByLabel("Phone").fill(updatedPhone);
    await page.getByLabel("Address").fill(updatedAddress);
    await page.getByLabel("Date of Birth").fill(updatedDob);

    await page.getByRole("button", { name: "Save Changes" }).click();

    await expect(page.getByText("Account updated successfully.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Account Overview" })).toBeVisible();
    await expect(page.locator(".account-avatar-meta h4")).toHaveText(updatedFullName);
    await expect(
      page.locator(".account-detail-value").filter({ hasText: updatedPhone }).first(),
    ).toBeVisible();
    await expect(
      page.locator(".account-detail-value").filter({ hasText: updatedAddress }).first(),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Account Overview" })).toBeVisible();
    await expect(page.locator(".account-avatar-meta h4")).toHaveText(updatedFullName);
    await expect(
      page.locator(".account-detail-value").filter({ hasText: updatedPhone }).first(),
    ).toBeVisible();

    await updateMyAccount(request, session.accessToken, {
      fullName: originalProfile.fullName,
      phone: originalProfile.phone,
      address: originalProfile.address || "",
      dateOfBirth: originalProfile.dateOfBirth || null,
    });
  } finally {
    await deleteUser(request, adminSession.accessToken, tempUser.user.id);
  }
});

test("admin profile view is reachable from the admin panel and shows admin-only details", async ({
  page,
  request,
}) => {
  const session = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminProfile = await getMyAccount(request, session.accessToken);

  await seedSession(page, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    email: adminProfile.email,
    username: adminProfile.username,
    fullName: adminProfile.fullName,
    roles: adminProfile.roles,
  });

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Supply Chain Command Center" })).toBeVisible();

  await page.getByRole("link", { name: "Profile Settings" }).click();
  await expect(page).toHaveURL(/\/admin\/account$/);
  await expect(page.getByRole("heading", { name: "Admin Profile" })).toBeVisible();
  await expect(page.locator(".account-detail-label").filter({ hasText: "Roles" })).toBeVisible();
  await expect(page.locator(".account-detail-label").filter({ hasText: "Status" })).toBeVisible();
  await expect(page.locator(".account-detail-label").filter({ hasText: "Last login" })).toBeVisible();
  await expect(page.getByText("Current Tier")).toHaveCount(0);
  await expect(page.getByText("Available points")).toHaveCount(0);
});

test("admin can open the standalone user profile view and see auth-side details", async ({
  page,
  request,
}) => {
  const adminSession = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const adminProfile = await getMyAccount(request, adminSession.accessToken);
  const tempUser = await createTemporaryStandardUser(request, adminSession.accessToken);

  try {
    await seedSession(page, {
      accessToken: adminSession.accessToken,
      refreshToken: adminSession.refreshToken,
      email: adminProfile.email,
      username: adminProfile.username,
      fullName: adminProfile.fullName,
      roles: adminProfile.roles,
    });

    await page.goto(`/admin/users/${tempUser.user.id}`);

    await expect(page.getByRole("heading", { name: tempUser.user.fullName })).toBeVisible();
    await expect(page.getByText("User Profile")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Access & Permissions" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Personal Details" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Customer-facing Data" })).toBeVisible();
    await expect(page.locator(".customer-profile-hero-copy p")).toHaveText(tempUser.user.email);
    await expect(
      page.locator(".customer-profile-meta strong").filter({ hasText: `@${tempUser.user.username}` }).first(),
    ).toBeVisible();
    await expect(page.locator(".customer-profile-badge").filter({ hasText: "User" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Back to User Directory" }).first()).toBeVisible();
  } finally {
    await deleteUser(request, adminSession.accessToken, tempUser.user.id);
  }
});

test("customer profile page loads for the signed-in user", async ({ page, request }) => {
  const adminSession = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const tempUser = await createTemporaryStandardUser(request, adminSession.accessToken);
  try {
    const session = await login(request, tempUser.credentials.email, tempUser.credentials.password);
    const userProfile = await getMyAccount(request, session.accessToken);
    const claims = parseJwtClaims(session.accessToken);
    expect(claims.userId, "Access token did not contain userId claim.").toBeTruthy();

    const ensuredCustomer = await ensureCustomerRecord(request, session.accessToken, claims.userId as number);

    await seedSession(page, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      email: userProfile.email,
      username: userProfile.username,
      fullName: userProfile.fullName,
      roles: userProfile.roles,
      customerId: ensuredCustomer.lookup.customerId,
    });

    await page.goto(`/customers/${ensuredCustomer.lookup.customerId}`);

    await expect(page.getByRole("heading", { name: userProfile.fullName })).toBeVisible();
    await expect(page.getByText("Customer Profile")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Order Summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery Addresses" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit Profile" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Change Password" })).toBeVisible();

    if (ensuredCustomer.created) {
      await deleteCustomerByUserId(request, session.accessToken, claims.userId as number);
    }
  } finally {
    await deleteUser(request, adminSession.accessToken, tempUser.user.id);
  }
});

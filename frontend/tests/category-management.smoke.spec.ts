import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { fileURLToPath } from "node:url";

const AUTH_BASE_URL = process.env.PLAYWRIGHT_AUTH_BASE_URL || "http://localhost:8081";
const PRODUCTION_BASE_URL = process.env.PLAYWRIGHT_PRODUCTION_BASE_URL || "http://localhost:8084";
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "123456";
const MANAGER_EMAIL = process.env.PLAYWRIGHT_MANAGER_EMAIL || "manager@gmail.com";
const MANAGER_PASSWORD = process.env.PLAYWRIGHT_MANAGER_PASSWORD || "123456";
const CATEGORY_UPLOAD_FIXTURE = fileURLToPath(
  new URL(
    "../../production-service/uploads/products/a0ed622a-702c-4be2-96d1-b32e8ea7cd28.png",
    import.meta.url,
  ),
);

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  active: boolean;
  parent_id: number | null;
  product_count: number;
  subcategories?: CategoryNode[];
};

type ProductResponse = {
  id: number;
};

type SeededSession = {
  accessToken: string;
  refreshToken?: string;
  email: string;
  username: string;
  fullName: string;
  roles: string[];
};

type CleanupState = {
  productId?: number;
  productCategoryId?: number;
  childId?: number;
  rootId?: number;
  inactiveId?: number;
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
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
    `Login failed for ${email}. Make sure auth-service is running and demo data is seeded.`,
  ).toBeTruthy();

  const data = (await response.json()) as LoginResponse;
  expect(data.accessToken, `Login response for ${email} did not contain accessToken.`).toBeTruthy();
  return data;
}

async function seedSession(page: Page, session: SeededSession) {
  await page.addInitScript(
    ({ accessToken, refreshToken, email, username, fullName, roles }) => {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      localStorage.setItem("email", email);
      localStorage.setItem("username", username);
      localStorage.setItem(
        "accountProfile",
        JSON.stringify({
          email,
          username,
          fullName,
          roles,
        }),
      );
    },
    session,
  );
}

async function expectToast(page: Page, message: string) {
  await expect(
    page.locator(".Toastify__toast").filter({ hasText: message }).last(),
  ).toBeVisible();
}

async function getCategoryTree(
  request: APIRequestContext,
  token: string,
): Promise<CategoryNode[]> {
  const response = await request.get(`${PRODUCTION_BASE_URL}/categories`, {
    headers: authHeaders(token),
  });

  expect(
    response.ok(),
    `Could not load categories: ${await response.text()}`,
  ).toBeTruthy();

  const payload = (await response.json()) as ApiEnvelope<CategoryNode[]>;
  return payload.data || [];
}

function findCategoryBySlug(nodes: CategoryNode[], slug: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.slug === slug) {
      return node;
    }

    const childMatch = findCategoryBySlug(node.subcategories || [], slug);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
}

async function requireCategoryBySlug(
  request: APIRequestContext,
  token: string,
  slug: string,
): Promise<CategoryNode> {
  await expect.poll(
    async () => {
      const category = findCategoryBySlug(await getCategoryTree(request, token), slug);
      return category?.id ?? null;
    },
    {
      message: `Expected to find category slug ${slug}.`,
      timeout: 15_000,
    },
  ).not.toBeNull();

  return findCategoryBySlug(await getCategoryTree(request, token), slug) as CategoryNode;
}

async function createProductWithCategory(
  request: APIRequestContext,
  token: string,
  suffix: string,
) {
  const categoryResponse = await request.post(`${PRODUCTION_BASE_URL}/categories`, {
    headers: authHeaders(token),
    data: {
      name: `PW Product Holder ${suffix}`,
      slug: `pw-product-holder-${suffix}`,
      active: true,
    },
  });

  expect(
    categoryResponse.ok(),
    `Could not create product-holder category: ${await categoryResponse.text()}`,
  ).toBeTruthy();

  const categoryPayload =
    (await categoryResponse.json()) as ApiEnvelope<CategoryNode>;
  const categoryId = categoryPayload.data.id;

  const productResponse = await request.post(`${PRODUCTION_BASE_URL}/products`, {
    headers: authHeaders(token),
    data: {
      name: `PW Product ${suffix}`,
      sku: `PW-SKU-${suffix}`,
      price: 45000,
      categoryId,
      description: "Temporary product for browser smoke test",
      available: true,
      preparationTime: 5,
    },
  });

  expect(
    productResponse.ok(),
    `Could not create temporary product: ${await productResponse.text()}`,
  ).toBeTruthy();

  const productPayload =
    (await productResponse.json()) as ApiEnvelope<ProductResponse>;

  return {
    categoryId,
    categoryName: `PW Product Holder ${suffix}`,
    categorySlug: `pw-product-holder-${suffix}`,
    productId: productPayload.data.id,
  };
}

async function deleteProductSafe(
  request: APIRequestContext,
  token: string,
  productId?: number,
) {
  if (!productId) {
    return;
  }

  await request.delete(`${PRODUCTION_BASE_URL}/products/${productId}`, {
    headers: authHeaders(token),
  });
}

async function deleteCategorySafe(
  request: APIRequestContext,
  token: string,
  categoryId?: number,
) {
  if (!categoryId) {
    return;
  }

  await request.delete(`${PRODUCTION_BASE_URL}/categories/${categoryId}`, {
    headers: authHeaders(token),
  });
}

function searchBox(page: Page) {
  return page.locator(".category-search-box input");
}

function categoryModal(page: Page) {
  return page.locator(".category-modal-card");
}

function categoryTreeRow(page: Page, text: string) {
  return page.locator(".category-tree-row").filter({ hasText: text }).first();
}

async function searchCategory(page: Page, query: string) {
  await searchBox(page).fill(query);
}

async function selectCategory(page: Page, query: string, label = query) {
  await searchCategory(page, query);
  await expect(categoryTreeRow(page, label)).toBeVisible();
  await categoryTreeRow(page, label).click();
}

async function clearSearch(page: Page) {
  await searchBox(page).fill("");
}

async function fillCategoryForm(
  page: Page,
  fields: {
    name: string;
    slug: string;
    description?: string;
    imagePath?: string;
    displayOrder?: string;
    active?: boolean;
  },
) {
  const modal = categoryModal(page);
  await modal.locator('input[name="name"]').fill(fields.name);
  await modal.locator('input[name="slug"]').fill(fields.slug);

  if (fields.description !== undefined) {
    await modal.locator('textarea[name="description"]').fill(fields.description);
  }

  if (fields.imagePath !== undefined) {
    await modal.locator('input[name="image"]').setInputFiles(fields.imagePath);
  }

  if (fields.displayOrder !== undefined) {
    await modal.locator('input[name="display_order"]').fill(fields.displayOrder);
  }

  if (fields.active === false) {
    await modal.locator('input[name="active"]').uncheck();
  }
}

test.describe.configure({ mode: "serial" });

test("guest is redirected away from category admin", async ({ page }) => {
  await page.goto("/admin/categories");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("section.home")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Category Management" })).toHaveCount(0);
});

test("manager can read categories but cannot create them from the web", async ({
  page,
  request,
}) => {
  const managerLogin = await login(request, MANAGER_EMAIL, MANAGER_PASSWORD);
  const deniedSlug = `pw-manager-denied-${Date.now()}`;

  await seedSession(page, {
    accessToken: managerLogin.accessToken,
    refreshToken: managerLogin.refreshToken,
    email: MANAGER_EMAIL,
    username: "manager",
    fullName: "Operations Manager",
    roles: ["MANAGER"],
  });

  await page.goto("/admin/categories");

  await expect(page.getByRole("heading", { name: "Category Management" })).toBeVisible();
  await page.getByRole("button", { name: "New Root Category" }).click();
  await fillCategoryForm(page, {
    name: `PW Manager Denied ${Date.now()}`,
    slug: deniedSlug,
    description: "Manager should not be able to create this category.",
    displayOrder: "1",
  });

  await page.getByRole("button", { name: "Create category" }).click();
  await expectToast(page, "You are not authorized to perform this action (403)");

  const tree = await getCategoryTree(request, managerLogin.accessToken);
  expect(findCategoryBySlug(tree, deniedSlug)).toBeNull();
});

test("admin can run the category CRUD smoke flow in the browser", async ({
  page,
  request,
}) => {
  test.slow();

  const adminLogin = await login(request, ADMIN_EMAIL, ADMIN_PASSWORD);
  const suffix = `${Date.now()}`;
  const rootName = `PW Root ${suffix}`;
  const rootSlug = `pw-root-${suffix}`;
  const childName = `PW Child ${suffix}`;
  const childSlug = `pw-child-${suffix}`;
  const inactiveName = `PW Inactive ${suffix}`;
  const inactiveSlug = `pw-inactive-${suffix}`;
  const duplicateName = `PW Duplicate ${suffix}`;
  const cleanup: CleanupState = {};

  await seedSession(page, {
    accessToken: adminLogin.accessToken,
    refreshToken: adminLogin.refreshToken,
    email: ADMIN_EMAIL,
    username: "admin",
    fullName: "System Admin",
    roles: ["ADMIN"],
  });

  try {
    await page.goto("/admin/categories");
    await expect(page.getByRole("heading", { name: "Category Management" })).toBeVisible();

    await test.step("create root category from the web", async () => {
      await page.getByRole("button", { name: "New Root Category" }).click();
      await fillCategoryForm(page, {
        name: rootName,
        slug: rootSlug,
        description: "Browser-created root category",
        imagePath: CATEGORY_UPLOAD_FIXTURE,
        displayOrder: "101",
      });
      await page.getByRole("button", { name: "Create category" }).click();

      await expectToast(page, "Category created successfully.");
      cleanup.rootId = (await requireCategoryBySlug(request, adminLogin.accessToken, rootSlug)).id;
      await selectCategory(page, rootName);
      await expect(page.locator(".category-detail-card")).toContainText(rootName);
    });

    await test.step("create child category from the web", async () => {
      await clearSearch(page);
      await selectCategory(page, rootName);
      await page.getByRole("button", { name: "New Child" }).click();
      await fillCategoryForm(page, {
        name: childName,
        slug: childSlug,
        description: "Browser-created child category",
        displayOrder: "5",
      });
      await page.getByRole("button", { name: "Create category" }).click();

      await expectToast(page, "Category created successfully.");
      cleanup.childId = (await requireCategoryBySlug(request, adminLogin.accessToken, childSlug)).id;
    });

    await test.step("create inactive category and exercise status and structure filters", async () => {
      await page.getByRole("button", { name: "New Root Category" }).click();
      await fillCategoryForm(page, {
        name: inactiveName,
        slug: inactiveSlug,
        description: "Inactive browser-created category",
        displayOrder: "6",
        active: false,
      });
      await page.getByRole("button", { name: "Create category" }).click();

      await expectToast(page, "Category created successfully.");
      cleanup.inactiveId = (await requireCategoryBySlug(request, adminLogin.accessToken, inactiveSlug)).id;

      await searchCategory(page, inactiveName);
      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Status" })
        .getByRole("button", { name: "inactive", exact: true })
        .click();
      await expect(categoryTreeRow(page, inactiveName)).toBeVisible();

      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Status" })
        .getByRole("button", { name: "active", exact: true })
        .click();
      await expect(categoryTreeRow(page, inactiveName)).toHaveCount(0);

      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Status" })
        .getByRole("button", { name: "all", exact: true })
        .click();

      await searchCategory(page, rootName);
      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Structure" })
        .getByRole("button", { name: "Roots", exact: true })
        .click();
      await expect(categoryTreeRow(page, rootName)).toBeVisible();

      await searchCategory(page, childName);
      await expect(categoryTreeRow(page, childName)).toHaveCount(0);
      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Structure" })
        .getByRole("button", { name: "Subcategories", exact: true })
        .click();
      await expect(categoryTreeRow(page, childName)).toBeVisible();

      await page
        .locator(".category-filter-group")
        .filter({ hasText: "Structure" })
        .getByRole("button", { name: "Tree view", exact: true })
        .click();
      await clearSearch(page);
    });

    await test.step("block duplicate slugs in the browser", async () => {
      await page.getByRole("button", { name: "New Root Category" }).click();
      await fillCategoryForm(page, {
        name: duplicateName,
        slug: rootSlug,
        description: "Should fail because the slug already exists.",
      });
      await page.getByRole("button", { name: "Create category" }).click();

      await expectToast(page, "Category slug already exists");
      await expect(categoryModal(page)).toContainText("Category slug already exists");
      await page.getByRole("button", { name: "Cancel" }).click();
    });

    await test.step("validate blank-name updates before submit and keep child under the same parent", async () => {
      await selectCategory(page, childName);
      await page.getByRole("button", { name: "Edit" }).click();
      await categoryModal(page).locator('input[name="name"]').fill("   ");
      await page.getByRole("button", { name: "Save changes" }).click();
      await expect(categoryModal(page)).toContainText("Category name is required");
      await page.getByRole("button", { name: "Cancel" }).click();

      await page.getByRole("button", { name: "Edit" }).click();
      await categoryModal(page)
        .locator('textarea[name="description"]')
        .fill("Updated browser child description");
      await page.getByRole("button", { name: "Save changes" }).click();

      await expectToast(page, "Category updated successfully.");
      await clearSearch(page);
      await selectCategory(page, rootName);
      await expect(page.locator(".category-child-chip").filter({ hasText: childName })).toBeVisible();
    });

    await test.step("block deleting a category that still has subcategories", async () => {
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();

      await expectToast(page, "Cannot delete category with subcategories");
      await page.getByRole("button", { name: "Keep it" }).click();
    });

    await test.step("block deleting a category that still has products, then allow delete after cleanup", async () => {
      const seededProduct = await createProductWithCategory(request, adminLogin.accessToken, suffix);
      cleanup.productCategoryId = seededProduct.categoryId;
      cleanup.productId = seededProduct.productId;

      await page.getByRole("button", { name: "Refresh" }).click();
      await selectCategory(page, seededProduct.categoryName);
      await expect(
        page.locator(".category-mini-card").filter({ hasText: "Products" }),
      ).toContainText("1");

      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();
      await expectToast(page, "Cannot delete category with products");
      await page.getByRole("button", { name: "Keep it" }).click();

      await deleteProductSafe(request, adminLogin.accessToken, cleanup.productId);
      cleanup.productId = undefined;

      await page.getByRole("button", { name: "Refresh" }).click();
      await selectCategory(page, seededProduct.categoryName);
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();

      await expectToast(page, "Category deleted successfully.");
      cleanup.productCategoryId = undefined;
      await clearSearch(page);
    });

    await test.step("delete child, root, and inactive categories from the web", async () => {
      await selectCategory(page, childName);
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();
      await expectToast(page, "Category deleted successfully.");
      cleanup.childId = undefined;

      await clearSearch(page);
      await selectCategory(page, rootName);
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();
      await expectToast(page, "Category deleted successfully.");
      cleanup.rootId = undefined;

      await clearSearch(page);
      await selectCategory(page, inactiveName);
      await page.getByRole("button", { name: "Delete" }).click();
      await page.getByRole("button", { name: "Delete category" }).click();
      await expectToast(page, "Category deleted successfully.");
      cleanup.inactiveId = undefined;
    });
  } finally {
    await deleteProductSafe(request, adminLogin.accessToken, cleanup.productId);
    await deleteCategorySafe(request, adminLogin.accessToken, cleanup.childId);
    await deleteCategorySafe(request, adminLogin.accessToken, cleanup.rootId);
    await deleteCategorySafe(request, adminLogin.accessToken, cleanup.inactiveId);
    await deleteCategorySafe(request, adminLogin.accessToken, cleanup.productCategoryId);
  }
});

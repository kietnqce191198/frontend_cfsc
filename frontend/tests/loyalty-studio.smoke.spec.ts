import { test, expect, type APIRequestContext, type Page } from "@playwright/test";

const AUTH_BASE_URL = process.env.PLAYWRIGHT_AUTH_BASE_URL || "http://localhost:8081";
const ENGAGEMENT_BASE_URL = process.env.PLAYWRIGHT_ENGAGEMENT_BASE_URL || "http://localhost:8083";
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL || "admin@gmail.com";
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD || "123456";

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
};

type Benefit = {
  id?: number;
  type: string;
  value: number | null;
  description: string;
  inherited?: boolean;
  source_tier_name?: string;
};

type Tier = {
  id: number;
  name: string;
  min_points: number;
  max_points: number | null;
  benefits?: Benefit[];
};

type LoyaltyConfig = {
  points_per_currency: number;
  min_order_amount: number;
  excluded_categories: string[];
  expiration_months: number;
  evaluation_period_months: number;
  inherit_from_lower_tiers: boolean;
  tiers: Tier[];
};

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function loginAsAdmin(request: APIRequestContext): Promise<LoginResponse> {
  const response = await request.post(`${AUTH_BASE_URL}/api/auth/login`, {
    data: {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    },
  });

  expect(response.ok(), "Admin login failed. Make sure auth-service is running.").toBeTruthy();
  const data = (await response.json()) as LoginResponse;
  expect(data.accessToken, "Login response did not contain accessToken.").toBeTruthy();
  return data;
}

async function getConfig(request: APIRequestContext, token: string): Promise<LoyaltyConfig> {
  const response = await request.get(`${ENGAGEMENT_BASE_URL}/loyalty/config`, {
    headers: authHeaders(token),
  });

  expect(
    response.ok(),
    "Could not load loyalty config. Make sure engagement_service is running and loyalty permissions are seeded."
  ).toBeTruthy();

  return (await response.json()) as LoyaltyConfig;
}

async function putJson(request: APIRequestContext, url: string, token: string, data: object) {
  const response = await request.put(url, {
    headers: authHeaders(token),
    data,
  });

  expect(response.ok(), `Request failed for ${url}: ${await response.text()}`).toBeTruthy();
  return response;
}

function buildRestoreTierPayload(config: LoyaltyConfig) {
  return {
    inherit_from_lower_tiers: config.inherit_from_lower_tiers,
    tiers: config.tiers.map((tier) => ({
      id: tier.id,
      name: tier.name,
      min_points: tier.min_points,
      max_points: tier.max_points,
      benefits: (tier.benefits || [])
        .filter((benefit) => !benefit.inherited)
        .map((benefit) => ({
          type: benefit.type,
          value: benefit.value,
          description: benefit.description,
        })),
    })),
  };
}

async function restoreOriginalConfig(request: APIRequestContext, token: string, config: LoyaltyConfig) {
  await putJson(request, `${ENGAGEMENT_BASE_URL}/loyalty/config/points`, token, {
    points_per_currency: config.points_per_currency,
    min_order_amount: config.min_order_amount,
    excluded_categories: config.excluded_categories,
  });

  await putJson(request, `${ENGAGEMENT_BASE_URL}/loyalty/config/expiration`, token, {
    expiration_months: config.expiration_months,
    evaluation_period_months: config.evaluation_period_months,
  });

  await putJson(
    request,
    `${ENGAGEMENT_BASE_URL}/loyalty/config/tiers`,
    token,
    buildRestoreTierPayload(config)
  );
}

async function seedSession(page: Page, session: LoginResponse) {
  await page.addInitScript(
    ({ accessToken, refreshToken, email }) => {
      localStorage.setItem("accessToken", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      localStorage.setItem("email", email);
      localStorage.setItem("username", "admin");
      localStorage.setItem(
        "accountProfile",
        JSON.stringify({
          email,
          username: "admin",
          fullName: "System Admin",
          roles: ["ADMIN"],
        })
      );
    },
    {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      email: ADMIN_EMAIL,
    }
  );
}

test("Loyalty Studio smoke test", async ({ page, request }) => {
  const session = await loginAsAdmin(request);
  const originalConfig = await getConfig(request, session.accessToken);

  const pointValue = "1.75";
  const minOrderAmount = "65000";
  const excludedCategories = "FLASH_SALE, GIFT_CARD";
  const expirationMonths = "18";
  const evaluationMonths = "9";
  const createdBenefitDescription = `PW Bronze ${Date.now()}`;
  const updatedBenefitDescription = `${createdBenefitDescription} Updated`;

  await seedSession(page, session);

  try {
    await page.goto("/admin/loyalty-studio");

    await expect(page.getByRole("heading", { name: "Loyalty Studio" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Point Rules" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tier Benefits" })).toBeVisible();

    const pointCard = page.locator(".studio-card").filter({
      has: page.getByRole("heading", { name: "Point Rules" }),
    });
    await pointCard.getByLabel("Points per currency").fill(pointValue);
    await pointCard.getByLabel("Min order amount").fill(minOrderAmount);
    await pointCard.getByLabel("Excluded categories").fill(excludedCategories);
    await pointCard.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Point rules saved")).toBeVisible();

    await page.getByRole("button", { name: "Reload" }).click();
    await expect(pointCard.getByLabel("Points per currency")).toHaveValue(pointValue);
    await expect(pointCard.getByLabel("Min order amount")).toHaveValue(minOrderAmount);

    const timingCard = page.locator(".studio-card").filter({
      has: page.getByRole("heading", { name: "Timing Rules" }),
    });
    await timingCard.getByLabel("Expiration months").fill(expirationMonths);
    await timingCard.getByLabel("Evaluation period months").fill(evaluationMonths);
    await timingCard.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Timing rules saved")).toBeVisible();

    const tierCard = page.locator(".studio-card").filter({
      has: page.getByRole("heading", { name: "Tier Architecture" }),
    });
    const tierSwitch = tierCard.locator(".inline-switch .toggle");
    if ((await tierSwitch.textContent())?.includes("Disabled")) {
      await tierSwitch.click();
    }

    const silverCard = tierCard.locator(".tier-card").filter({ hasText: "SILVER" });
    const goldCard = tierCard.locator(".tier-card").filter({ hasText: "GOLD" });
    const platinumCard = tierCard.locator(".tier-card").filter({ hasText: "PLATINUM" });

    await silverCard.getByLabel("Max points").fill("2999");
    await goldCard.getByLabel("Min points").fill("3000");
    await goldCard.getByLabel("Max points").fill("6999");
    await platinumCard.getByLabel("Min points").fill("7000");

    await tierCard.getByRole("button", { name: "Save Tiers" }).click();
    await expect(page.getByText("Tier architecture saved")).toBeVisible();
    await expect(page.getByText("Inheritance on")).toBeVisible();

    const benefitsCard = page.locator(".studio-card").filter({
      has: page.getByRole("heading", { name: "Tier Benefits" }),
    });
    const tierList = benefitsCard.locator(".tier-list");

    await tierList.getByRole("button", { name: /BRONZE/i }).click();
    await benefitsCard.getByLabel("Type").selectOption("DISCOUNT");
    await benefitsCard.getByLabel("Value").fill("10");
    await benefitsCard.getByLabel("Description").fill(createdBenefitDescription);
    await benefitsCard.getByRole("button", { name: "Create Benefit" }).click();
    await expect(page.getByText("Benefit saved")).toBeVisible();
    await expect(benefitsCard.getByText(createdBenefitDescription)).toBeVisible();

    const createdRow = benefitsCard
      .locator(".benefit-row")
      .filter({ hasText: createdBenefitDescription })
      .first();
    await createdRow.getByRole("button", { name: "Edit" }).click();
    await benefitsCard.getByLabel("Value").fill("15");
    await benefitsCard.getByLabel("Description").fill(updatedBenefitDescription);
    await benefitsCard.getByRole("button", { name: "Update Benefit" }).click();
    await expect(page.getByText("Benefit saved")).toBeVisible();
    await expect(benefitsCard.getByText(updatedBenefitDescription)).toBeVisible();

    await tierList.getByRole("button", { name: /SILVER/i }).click();
    const inheritedUpdatedRow = benefitsCard
      .locator(".benefit-row")
      .filter({ hasText: updatedBenefitDescription })
      .first();
    await expect(inheritedUpdatedRow).toBeVisible();
    await expect(inheritedUpdatedRow.getByText("Inherited from BRONZE")).toBeVisible();

    await tierList.getByRole("button", { name: /BRONZE/i }).click();
    const updatedRow = benefitsCard
      .locator(".benefit-row")
      .filter({ hasText: updatedBenefitDescription })
      .first();
    await updatedRow.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("Benefit deleted")).toBeVisible();
    await expect(benefitsCard.getByText(updatedBenefitDescription)).toHaveCount(0);
  } finally {
    await restoreOriginalConfig(request, session.accessToken, originalConfig);
  }
});

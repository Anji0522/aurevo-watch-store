import { expect, test } from "@playwright/test";
import { installApiMocks } from "./helpers.js";

test("shop search, saved items, and bag persist across routes", async ({
  page,
}) => {
  await installApiMocks(page);
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".route-product-card")).toHaveCount(12);
  await page.getByRole("combobox", { name: "Search watches" }).fill("Chronos");
  await expect(page.locator(".route-product-card")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Search watches" }).fill("");

  await page.locator(".route-product-card .wish-button").first().click();
  await page.locator(".route-product-card .button-secondary").first().click();
  await page.goto("/cart", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".cart-page-item")).toHaveCount(1);
  await expect(page.getByText("₹8,730")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".cart-page-item")).toHaveCount(1);
  await page.goto("/wishlist");
  await expect(
    page.getByRole("heading", { name: "Aurevo Chronos" }),
  ).toBeVisible();
});

test("verified online checkout confirms only after server verification", async ({
  page,
}) => {
  const { state, catalog } = await installApiMocks(page, {
    user: {
      id: "customer-demo",
      name: "Test Customer",
      email: "customer@example.test",
      phone: "9876543210",
    },
  });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByLabel("Address line 1").fill("1 Sample Street");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("PIN code").fill("400001");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await expect(page.getByText(/UPI · QR & UPI apps/)).toBeVisible();
  await page.getByRole("button", { name: "Pay securely" }).click();
  await page.waitForURL("**/order-success/65f000000000000000000001");
  await expect(
    page.getByText(/payment is confirmed by Razorpay/i),
  ).toBeVisible();
  expect(state.verifiedPayments).toBe(1);
  expect(state.lastCheckout.items[0].watchId).toBe(catalog[0]._id);
  expect(state.lastCheckout.items[0]).not.toHaveProperty("price");
});

test("failed payment keeps the bag and never displays success", async ({
  page,
}) => {
  const { state } = await installApiMocks(page, {
    user: {
      id: "customer-demo",
      name: "Test Customer",
      email: "customer@example.test",
      phone: "9876543210",
    },
    paymentOutcome: "failed",
  });
  await page.goto("/shop", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Add to bag" }).first().click();
  await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Full name").fill("Test Customer");
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByLabel("Address line 1").fill("1 Sample Street");
  await page.getByLabel("City").fill("Mumbai");
  await page.getByLabel("State").fill("Maharashtra");
  await page.getByLabel("PIN code").fill("400001");
  await page.getByRole("button", { name: "Continue to delivery" }).click();
  await page.getByRole("button", { name: "Continue to payment" }).click();
  await page.getByRole("button", { name: "Pay securely" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Payment was not completed",
  );
  expect(state.failedPayments).toBe(1);
  expect(state.verifiedPayments).toBe(0);
});

test("paid-customer review form submits through the API and shows verification", async ({
  page,
}) => {
  await installApiMocks(page, {
    user: {
      id: "customer-demo",
      name: "Test Customer",
      email: "customer@example.test",
    },
  });
  await page.goto("/product/aurevo-chronos", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Your review")
    .fill("A thoughtful design with a clear, comfortable dial.");
  await page.getByRole("button", { name: "Submit review" }).click();
  await expect(page.getByText("Verified purchase")).toBeVisible();
  await expect(
    page.getByText("A thoughtful design with a clear, comfortable dial."),
  ).toBeVisible();
});

test("Aria streams a mocked assistant response", async ({ page }) => {
  await installApiMocks(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Chat with Aria" }).click();
  await page
    .getByPlaceholder("Ask Aria anything…")
    .fill("Tell me about the Chronos.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Hello from Aria.")).toBeVisible();
});

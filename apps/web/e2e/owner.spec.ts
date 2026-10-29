import { expect, test } from "@playwright/test";

async function signUpAndSetup(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Test Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByLabel("Confirm password").fill("password123");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Step 1 of")).toBeVisible();

  await page.getByRole("button", { name: /Fuel station/i }).click();
  await expect(page.getByText("Step 1 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 2 of 6")).toBeVisible();
  await page.getByLabel("Business name").fill("Playwright Gas");
  await page.getByLabel("TIN").fill("123-456-789-000");
  await page.getByLabel("Address").fill("1 Test Street, Quezon City");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 3 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 4 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 5 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Remove" }).nth(2).click();
  await page.getByRole("button", { name: "Remove" }).nth(1).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByText("Step 6 of 6")).toBeVisible();
  await page.getByRole("button", { name: "Open my books" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("owner can sign up and set up a station", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.nines`;
  await signUpAndSetup(page, email);
  await expect(page.getByTestId("today-sales")).toHaveText("₱0.00");
});

test("owner can record a shift and see it on the dashboard", async ({ page }) => {
  const email = `e2e-shift-${Date.now()}@test.nines`;
  await signUpAndSetup(page, email);
  await page.getByRole("link", { name: "Record a shift" }).click();
  await page.getByLabel("Closing reading").fill("100.00");
  await expect(page.getByTestId("shift-sales")).toHaveText("₱5,585.00");
  await page.getByLabel("Cash counted").fill("5585.00");
  await expect(page.getByTestId("shift-over-short")).toContainText("Balanced");
  await page.getByRole("button", { name: "Save shift" }).click();
  await expect(page.getByText("Fuel sales")).toBeVisible();
  await expect(page.getByText("₱5,585.00").first()).toBeVisible();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect(page.getByTestId("today-sales")).toHaveText("₱5,585.00");
});

test("owner can add an expense and open the daily report", async ({ page }) => {
  const email = `e2e-expense-${Date.now()}@test.nines`;
  await signUpAndSetup(page, email);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Expenses", exact: true }).click();
  await page.getByLabel("Amount").fill("120.00");
  await page.getByLabel("Paid to").fill("Corner store");
  await page.getByLabel("Note").fill("Soap");
  await page.getByRole("button", { name: "Add expense" }).click();
  await expect(page.getByText("Soap")).toBeVisible();
  await expect(page.getByText("₱120.00").first()).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Daily / monthly / VAT", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await expect(page.getByText("₱120.00").first()).toBeVisible();
  await page.getByRole("tab", { name: "VAT" }).click();
  await expect(page.getByTestId("output-vat")).toBeVisible();
});

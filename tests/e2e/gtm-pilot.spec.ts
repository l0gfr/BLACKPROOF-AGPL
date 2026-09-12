import { expect, test } from "@playwright/test";

test("retired commercial routes lead to free software or the local app", async ({ page }) => {
  for (const path of ["/pilot", "/pricing", "/legal/pilot-order", "/legal/conditions-solo"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/open-source\/?$/);
    await expect(page.locator("main")).toContainText("AGPL-3.0-only");
    await expect(page.locator("main")).not.toContainText("99 €");
  }
  await page.goto("/access");
  await expect(page).toHaveURL(/\/app\/?$/);
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await page.goto("/account");
  await expect(page).toHaveURL(/\/app\/cases\/?$/);
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();
});

test("demo and discovery share the local AGPL contract", async ({ page, request }) => {
  const status = await (await request.get("/api/status.json")).json();
  expect(status.securityPosture).toMatchObject({
    publicSiteStatic: true, accessModel: "open-source", accessRequirement: "none",
    softwareLicense: "AGPL-3.0-only", publicDeliveryStatusRegistry: false,
  });
  expect(status.securityPosture).not.toHaveProperty("onlinePurchase");
  await page.goto("/open-source");
  await expect(page.locator('main a[href*="github.com/l0gfr/BLACKPROOF-AGPL"]').first()).toBeVisible();
  for (const path of ["/LICENSE.txt", "/demo/proofpack-delivery-demo.json", "/demo/proofpack-delivery-demo.zip", "/schemas/proofpack-delivery/v4.schema.json", "/schemas/proofpack-delivery/v5.schema.json"]) {
    expect((await request.get(path)).status()).toBe(200);
  }
  const license = await (await request.get("/LICENSE.txt")).text();
  expect(license).toContain("GNU AFFERO GENERAL PUBLIC LICENSE");
  const index = await (await request.get("/api/index.json")).json();
  expect(index.humanPages).toContainEqual(expect.objectContaining({ path: "/open-source", role: "software-license" }));
  for (const path of ["/sitemap.xml", "/llms.txt"]) {
    const body = await (await request.get(path)).text();
    expect(body).toContain("/open-source");
    expect(body).not.toMatch(/\/pricing|\/pilot/);
  }
  await page.goto("/demo");
  await expect(page.getByRole("link", { name: /Version client JSON/ })).toHaveAttribute("href", "/demo/proofpack-delivery-demo.json");
  await expect(page.getByRole("link", { name: /Version client ZIP/ })).toHaveAttribute("href", "/demo/proofpack-delivery-demo.zip");
});

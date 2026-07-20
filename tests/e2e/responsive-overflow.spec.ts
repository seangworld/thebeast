import { expect, test, type Page } from "@playwright/test";

test.skip(!process.env.PLAYWRIGHT_AUTH_STATE, "Set PLAYWRIGHT_AUTH_STATE to an authenticated storage-state file.");

const authenticatedRoutes = [
  "/dashboard",
  "/dashboard/today",
  "/dashboard/search",
  "/dashboard/notifications",
  "/dashboard/calendar",
  "/dashboard/timeline",
  "/dashboard/uploads",
  "/dashboard/profile",
  "/dashboard/goals",
  "/dashboard/settings",
  "/dashboard/learning",
  "/dashboard/learning/goals",
  "/dashboard/learning/activities",
  "/dashboard/money",
  "/dashboard/money/billing",
  "/dashboard/money/cashflow",
  "/dashboard/money/debts",
  "/dashboard/money/retirement",
  "/dashboard/money/velocity",
  "/dashboard/health",
  "/dashboard/home",
  "/dashboard/admin",
  "/dashboard/admin/members",
  "/dashboard/admin/modules",
] as const;

const viewports = [
  { name: "desktop-1920", width: 1920, height: 1080 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1280", width: 1280, height: 720 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "tablet-834", width: 834, height: 1112 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-320", width: 320, height: 720 },
] as const;

const zoomEquivalentViewports = [
  { name: "desktop-zoom-125", width: 1152, height: 720 },
  { name: "desktop-zoom-150", width: 960, height: 600 },
] as const;

async function expectNoDocumentOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.clientWidth);
}

for (const viewport of zoomEquivalentViewports) {
  test(`${viewport.name} keeps dashboard content inside its reduced CSS viewport`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/dashboard");
    await expectNoDocumentOverflow(page);
    await expectVisibleControlsInsideViewport(page);
  });
}

async function expectVisibleControlsInsideViewport(page: Page) {
  const failures = await page.locator("a:visible, button:visible, input:visible, select:visible, textarea:visible").evaluateAll((controls) =>
    controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const inside = rect.left >= -1 && rect.right <= window.innerWidth + 1;
      return inside ? [] : [control.getAttribute("aria-label") || control.textContent?.trim() || control.tagName];
    }),
  );
  expect(failures, `Off-screen controls: ${failures.join(", ")}`).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

for (const viewport of viewports) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of authenticatedRoutes) {
      test(`${route} reflows without document overflow`, async ({ page }) => {
        await page.goto(route);
        await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
        await expectNoDocumentOverflow(page);
        await expectVisibleControlsInsideViewport(page);
      });
    }
  });
}

test("mobile navigation dialog remains within the viewport and keyboard reachable", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/dashboard");
  const more = page.getByRole("button", { name: /more/i });
  await more.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: /more/i })).toBeVisible();
  await expectNoDocumentOverflow(page);
  await expectVisibleControlsInsideViewport(page);
});

test("wide financial tables scroll only inside their keyboard-focusable region", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard/money/debts");
  await expectNoDocumentOverflow(page);
  for (const region of await page.locator(".beast-table-wrap").all()) {
    const widths = await region.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
    expect(widths.scrollWidth).toBeGreaterThanOrEqual(widths.clientWidth);
    await expect(region).toHaveAttribute("tabindex", "0");
  }
});

test("Mentor and Tutor controls wrap and remain operable at narrow width", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/dashboard/learning");
  await expectNoDocumentOverflow(page);
  await expectVisibleControlsInsideViewport(page);
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

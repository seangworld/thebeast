import { expect, test } from "@playwright/test";

const publicAuthViewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
  { name: "narrow-mobile", width: 320, height: 720 },
] as const;

for (const viewport of publicAuthViewports) {
  test(`${viewport.name} public authentication remains usable without overflow`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    await expect(page.getByRole("navigation", { name: "Member authentication" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign Up" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Log In" }).first()).toBeVisible();

    const widths = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth);

    await page.getByRole("button", { name: "Sign Up" }).click();
    const dialog = page.getByRole("dialog", { name: "Create your account" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox", { name: "Email address" })).toBeFocused();
    await expect(dialog.getByLabel("Password")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    await expect(
      dialog.getByRole("link", { name: "Open full-screen authentication" })
    ).toHaveAttribute("href", "/login?intent=create-account");

    const dialogBox = await dialog.boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport.width);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}

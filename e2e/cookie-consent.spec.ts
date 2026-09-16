import { test, expect, type Page, type Request } from "@playwright/test";

/** Опциональные сторонние хосты до consent. Карты офиса — necessary, не блокируем. */
const BLOCKED_HOST_PARTS = [
  "mc.yandex.ru",
  "metrika",
  "roistat",
  "analytics.avgst.ru",
  "vk.com/ads",
  "top-fwz1.mail.ru",
  "an.yandex.ru",
  "ads.yandex",
  "youtube.com",
  "youtube-nocookie.com",
  "googlevideo.com",
  "rutube.ru",
  "kinescope.io",
];

function isBlockedThirdParty(url: string): boolean {
  try {
    const host = new URL(url).hostname + new URL(url).pathname;
    return BLOCKED_HOST_PARTS.some((part) => host.includes(part));
  } catch {
    return false;
  }
}

async function collectBlocked(page: Page): Promise<string[]> {
  const hits: string[] = [];
  const onRequest = (req: Request) => {
    if (isBlockedThirdParty(req.url())) hits.push(req.url());
  };
  page.on("request", onRequest);
  return hits;
}

test.describe("cookie consent network", () => {
  test("fresh user: no optional third-party before consent", async ({
    page,
  }) => {
    const hits = await collectBlocked(page);
    await page.goto("/");
    await page.waitForTimeout(1500);
    expect(hits, hits.join("\n")).toEqual([]);
    await expect(page.locator(".cookie-banner")).toBeVisible();
  });

  test("necessary only: banner gone, still no trackers", async ({ page }) => {
    const hits: string[] = [];
    page.on("request", (req) => {
      if (isBlockedThirdParty(req.url())) hits.push(req.url());
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Необходимые" }).click();
    await expect(page.locator(".cookie-banner")).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(1500);
    expect(hits.filter((u) => !u.includes("/api/consent"))).toEqual([]);
    await expect(page.locator(".cookie-banner")).toHaveCount(0);
  });

  test("office map loads without functional consent", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Необходимые" }).click();
    await page.goto("/#contacts");
    await expect(page.locator(".consent-embed-placeholder")).toHaveCount(0);
  });

  test("revoke optional after accept all", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Принять все" }).click();
    await expect(page.locator(".cookie-banner")).toHaveCount(0);
    await page.goto("/cookies");
    await page.getByRole("button", { name: "Настройки cookie" }).click();
    await page.getByRole("button", { name: "Только необходимые" }).click();
    await page.reload();
    await expect(page.locator(".cookie-banner")).toHaveCount(0);
  });
});

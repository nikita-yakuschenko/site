import { test, expect, type Page } from "@playwright/test";
import {
  modularMatrix,
  panelMatrix,
} from "../src/components/configuration-comparison/model/data";
import { hasDifferences } from "../src/components/configuration-comparison/model/types";

async function openComparison(page: Page, slug = "barnhouse-57") {
  await page.goto(`/catalog/${slug}`, { waitUntil: "domcontentloaded" });
  const consent = page.getByRole("button", {
    name: "Необходимые",
    exact: true,
  });
  if (await consent.isVisible()) await consent.click();
  const launch = page.getByRole("button", { name: "Сравнить комплектации" });
  await launch.click();
  const dialog = page.getByRole("dialog", { name: "Сравнение комплектаций" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("independent matrices have complete atomic values and semantic differences", () => {
  expect(panelMatrix.packageIds).toEqual(["start", "standard", "project"]);
  expect(modularMatrix.packageIds).toEqual(["standard", "project", "turnkey"]);
  for (const matrix of [panelMatrix, modularMatrix]) {
    const elements = matrix.sections.flatMap((s) => s.elements);
    expect(elements).toHaveLength(23);
    expect(new Set(elements.map((e) => e.id)).size).toBe(elements.length);
    for (const element of elements) {
      expect(Object.keys(element.values)).toEqual(matrix.packageIds);
      expect(element.info.summary.length).toBeGreaterThan(15);
      expect(element.icon).toBeTruthy();
    }
  }
  for (const matrix of [panelMatrix, modularMatrix]) {
    const interfloor = matrix.sections
      .flatMap((s) => s.elements)
      .find((e) => e.id === "interfloor")!;
    for (const id of matrix.packageIds) {
      expect(interfloor.values[id]?.status).toBe("included");
      expect(interfloor.values[id]?.displayValue).toBe(
        "Каркас, утепление 200 мм",
      );
    }
    const base = matrix.sections
      .flatMap((s) => s.elements)
      .find((e) => e.id === "base")!;
    expect(base.values.standard?.material).toBe("OSB-3 22 мм");
  }
  for (const element of panelMatrix.sections
    .flatMap((s) => s.elements)
    .filter((e) =>
      [
        "wallsFinish",
        "ceiling",
        "bathroom",
        "electric",
        "water",
        "sewer",
        "heating",
        "ventilation",
      ].includes(e.id),
    )) {
    for (const id of panelMatrix.packageIds)
      expect(element.values[id]?.status).toBe("excluded");
  }
  for (const matrix of [panelMatrix, modularMatrix]) {
    for (const element of matrix.sections.flatMap((s) => s.elements)) {
      for (const id of matrix.packageIds)
        expect(element.values[id]?.sourceStatus).toBe("confirmed");
      expect(element.info.qualifiers.join(" ")).not.toMatch(
        /взлом|гидроизоляц|мощност|не подтвержд|не заявлен/i,
      );
    }
  }
  const floor = modularMatrix.sections
    .flatMap((s) => s.elements)
    .find((e) => e.id === "floor")!;
  expect(hasDifferences(floor, modularMatrix.packageIds)).toBe(true);
  expect(floor.values.standard?.status).toBe("included");
  expect(floor.values.turnkey?.completionLevel).toBe("finish");
  const wall = modularMatrix.sections[0]!.elements[0]!;
  expect(hasDifferences(wall, modularMatrix.packageIds)).toBe(false);
  expect(wall.values.standard).not.toBe(
    panelMatrix.sections[0]!.elements[0]!.values.standard,
  );
  expect(
    hasDifferences(
      {
        ...wall,
        values: {
          ...wall.values,
          project: {
            ...wall.values.project!,
            displayValue: "Другая формулировка того же исполнения",
          },
        },
      },
      modularMatrix.packageIds,
    ),
  ).toBe(false);
});

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`comparison fits, filters and closes at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const dialog = await openComparison(page);
    await expect(dialog.locator("thead th:visible")).toHaveCount(
      width <= 900 ? 2 : 4,
    );
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      await dialog
        .locator(".comparison-scroll")
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    expect(await dialog.locator("thead").innerText()).not.toContain("₽");
    await expect(dialog.locator('[data-element="interfloor"]')).toHaveCount(0);
    const wall = dialog.locator('[data-element="wall"]');
    const floor = dialog.locator('[data-element="floor"]');
    await expect(wall).toHaveAttribute("data-visible", "true");
    await dialog.getByRole("switch", { name: "Только различия" }).check();
    await expect(wall).toHaveAttribute("data-visible", "false");
    await expect(floor).toHaveAttribute("data-visible", "true");
    await dialog.getByRole("switch", { name: "Только различия" }).uncheck();
    await expect(wall).toHaveAttribute("data-visible", "true");
    await dialog.getByRole("button", { name: "Свернуть разделы" }).click();
    await expect(wall).toHaveAttribute("data-visible", "false");
    await dialog.getByRole("button", { name: "Развернуть разделы" }).click();
    await expect(wall).toHaveAttribute("data-visible", "true");
    if (width <= 900) {
      await expect(
        dialog.getByRole("tablist", { name: "Выбор комплектации" }),
      ).toHaveCount(1);
      const firstTab = dialog.getByRole("tab", {
        name: "Стандартная",
        exact: true,
      });
      await firstTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        dialog.getByRole("tab", { name: "Проектная", exact: true }),
      ).toBeFocused();
      await expect(
        dialog.getByRole("tab", { name: "Проектная", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await dialog
        .getByRole("tab", { name: "Стандартная", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Следующая комплектация" })
        .click();
      await expect(
        dialog.getByRole("tab", { name: "Проектная", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await dialog.locator(".comparison-scroll").evaluate((el) =>
        el.dispatchEvent(
          new TouchEvent("touchstart", {
            touches: [
              new Touch({
                identifier: 0,
                target: el,
                clientX: 250,
                clientY: 400,
              }),
            ],
            bubbles: true,
          }),
        ),
      );
      await dialog.locator(".comparison-scroll").evaluate((el) =>
        el.dispatchEvent(
          new TouchEvent("touchend", {
            changedTouches: [
              new Touch({
                identifier: 0,
                target: el,
                clientX: 80,
                clientY: 405,
              }),
            ],
            bubbles: true,
          }),
        ),
      );
      await expect(
        dialog.getByRole("tab", { name: "Под ключ", exact: true }),
      ).toHaveAttribute("aria-selected", "true");
      await dialog.locator(".comparison-scroll").evaluate((el) =>
        el.dispatchEvent(
          new TouchEvent("touchstart", {
            touches: [
              new Touch({
                identifier: 0,
                target: el,
                clientX: 80,
                clientY: 400,
              }),
            ],
            bubbles: true,
          }),
        ),
      );
      await dialog.locator(".comparison-scroll").evaluate((el) =>
        el.dispatchEvent(
          new TouchEvent("touchend", {
            changedTouches: [
              new Touch({
                identifier: 0,
                target: el,
                clientX: 250,
                clientY: 405,
              }),
            ],
            bubbles: true,
          }),
        ),
      );
      await dialog
        .getByRole("button", {
          name: "Подробнее: Стеновые панели",
          exact: true,
        })
        .click();
      await expect(dialog.locator("#comparison-info-wall")).toHaveAttribute(
        "data-open",
        "true",
      );
      await expect(dialog.locator("#comparison-info-wall")).toContainText(
        "45×140",
      );
      await dialog
        .getByRole("button", {
          name: "Подробнее: Стеновые панели",
          exact: true,
        })
        .click();
    } else {
      await dialog
        .getByRole("button", {
          name: "Подробнее: Стеновые панели",
          exact: true,
        })
        .click();
      await expect(
        dialog.locator('[data-slot="popover-content"]'),
      ).toContainText("45×140");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-slot="popover-content"]')).toHaveCount(
        0,
      );
    }
    await dialog.locator(".comparison-scroll").evaluate((el) => {
      el.scrollTop = 0;
    });
    await expect(dialog.locator(".comparison-label > svg")).toHaveCount(0);
    const info = dialog.getByRole("button", {
      name: "Подробнее: Стеновые панели",
      exact: true,
    });
    await expect(info).toHaveCSS("padding", "0px");
    await expect(info).toHaveCSS("width", "19px");
    await expect(info).toHaveCSS("height", "19px");
    await expect(info).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await dialog.locator(".comparison-heading").click();
    await page.addStyleTag({
      content: "nextjs-portal { display:none!important; }",
    });
    await page.waitForTimeout(400);
    const rowGeometry = await dialog
      .locator('.comparison-element[data-visible="true"]')
      .evaluateAll((rows) =>
        rows.map((row) => {
          const cells = Array.from(row.children).filter(
            (cell) => getComputedStyle(cell).display !== "none",
          );
          return cells.map((cell) => ({
            top: cell.getBoundingClientRect().top,
            bottom: cell.getBoundingClientRect().bottom,
            border: getComputedStyle(cell).borderBottomWidth,
            innerBorder: getComputedStyle(
              cell.querySelector(".comparison-label, .comparison-value")!,
            ).borderBottomWidth,
          }));
        }),
      );
    for (const cells of rowGeometry) {
      expect(
        Math.max(...cells.map((cell) => cell.top)) -
          Math.min(...cells.map((cell) => cell.top)),
      ).toBeLessThan(1);
      expect(
        Math.max(...cells.map((cell) => cell.bottom)) -
          Math.min(...cells.map((cell) => cell.bottom)),
      ).toBeLessThan(1);
      for (const cell of cells) {
        expect(cell.border).toBe("1px");
        expect(cell.innerBorder).toBe("0px");
      }
    }
    if ([320, 390, 1440].includes(width))
      await dialog.screenshot({ path: `test-results/comparison-${width}.png` });
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Сравнить комплектации" }),
    ).toBeFocused();
  });
}

test("panel matrix and keyboard focus remain scoped to the dialog", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const dialog = await openComparison(page, "a-frame-52");
  const headers = dialog.locator("thead");
  await expect(headers).toContainText("Стартовая");
  await expect(headers).not.toContainText("Под ключ");
  await expect(
    dialog.locator('[data-element="wallsFinish"]'),
  ).not.toContainText("Гипсокартон");
  await expect(page.locator(".project-config__tiers")).not.toContainText(
    "Внутренней отделкой стен",
  );
  await expect(dialog.locator('[data-element="interfloor"]')).toHaveCount(1);
  for (let i = 0; i < 35; i++) {
    await page.keyboard.press("Tab");
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBe(true);
  }
  const section = dialog.getByRole("button", {
    name: /Силовой \(несущий\) каркас/,
  });
  await section.scrollIntoViewIfNeeded();
  await section.click();
  const reveal = dialog
    .locator('[data-element="wall"] .comparison-reveal')
    .first();
  const samples = await reveal.evaluate(async (el) => {
    const result: number[] = [];
    const start = performance.now();
    while (performance.now() - start < 450) {
      result.push(el.getBoundingClientRect().height);
      await new Promise(requestAnimationFrame);
    }
    return result;
  });
  expect(samples.some((h) => h > 1 && h < Math.max(...samples) - 1)).toBe(true);
  await page.getByRole("button", { name: "Закрыть сравнение" }).click();
  await expect(dialog).not.toBeVisible();
});

test("reduced motion and sticky header", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 800 });
  const dialog = await openComparison(page);
  await dialog.locator(".comparison-scroll").evaluate((el) => {
    el.scrollTop = 500;
  });
  const head = (await dialog.locator("thead").boundingBox())!;
  const scroll = (await dialog.locator(".comparison-scroll").boundingBox())!;
  expect(Math.abs(head.y - scroll.y)).toBeLessThan(2);
  expect(
    await dialog.evaluate((el) =>
      parseFloat(getComputedStyle(el).animationDuration),
    ),
  ).toBeLessThan(0.02);
  await dialog.getByRole("button", { name: "Закрыть сравнение" }).click();
  await expect(dialog).not.toBeVisible();
});

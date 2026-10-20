import { test, expect, type Page } from "@playwright/test";
import {
  modularMatrix,
  panelMatrix,
  deliveryInfoForRegion,
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
    const doors = matrix.sections.flatMap(section => section.elements).find(element => element.id === 'doors')!;
    for (const id of matrix.packageIds) {
      const value = doors.values[id]!;
      if (value.status === 'included') expect(value.displayValue).toBe('Металлическая дверь с терморазрывом');
    }
    expect(hasDifferences(doors, matrix.packageIds)).toBe(matrix.buildingTechnology === 'panel');
  }
  for (const matrix of [panelMatrix, modularMatrix]) {
    const elements = matrix.sections.flatMap((s) => s.elements);
    expect(elements).toHaveLength(22);
    expect(new Set(elements.map((e) => e.id)).size).toBe(elements.length);
    for (const element of elements) {
      expect(Object.keys(element.values)).toEqual(matrix.packageIds);
      expect(element.info.title).toBe(element.label);
      expect(element.info.summary).not.toMatch(
        /сравнивается|сравниваются|сравнивается отдельно/i,
      );
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
        "Каркас, утепление по каркасу",
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
  expect(deliveryInfoForRegion("nn").summary).toContain(
    "50 км от Нижнего Новгорода",
  );
  expect(deliveryInfoForRegion("msk").summary).toContain("50 км от Москвы");
  for (const matrix of [panelMatrix, modularMatrix]) {
    const elements = matrix.sections.flatMap((s) => s.elements);
    expect(elements.some((e) => e.id === "roofPaint")).toBe(false);
    const delivery = elements.find((e) => e.id === "delivery")!;
    for (const id of matrix.packageIds)
      expect(delivery.values[id]?.status).toBe("included");
  }
  const wallInfo = modularMatrix.sections
    .flatMap((s) => s.elements)
    .find((e) => e.id === "wall")!.info;
  expect(wallInfo.technicalFacts).toContain(
    "Ветрозащитный лист GTS9, толщиной 12,5 мм",
  );
  expect(wallInfo.technicalFacts).toContain(
    "Контрбрус 45×45 мм, сухой, строганый",
  );
  expect(wallInfo.technicalFacts).toContain(
    "Доска 45×140 мм, сухая, строганная",
  );
  expect(wallInfo.technicalFacts).toContain("Утепление по каркасу");
  expect(wallInfo.technicalFacts).toContain(
    "Пароизоляция (ПВХ-плёнка, 200 мкм)",
  );
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
    await expect(
      dialog.locator('.comparison-section button[aria-expanded="true"]'),
    ).toHaveCount(1);
    await expect(
      dialog.getByRole("button", { name: /Силовой \(несущий\) каркас/ }),
    ).toHaveAttribute("aria-expanded", "true");
    await dialog
      .getByRole("button", { name: "Развернуть разделы", exact: true })
      .click();
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
    await expect(wall.locator(".comparison-value-status")).toHaveText([
      "Входит",
      "Входит",
      "Входит",
    ]);
    await expect(wall.locator(".comparison-value-details")).toHaveCount(0);
    await expect(dialog.locator(".comparison-legend")).toHaveCount(0);
    expect(
      await dialog.locator(".comparison-value-status").allTextContents(),
    ).toEqual(expect.arrayContaining(["Входит", "Не входит"]));
    for (const status of await dialog
      .locator(".comparison-value-status")
      .allTextContents())
      expect(["Входит", "Не входит"]).toContain(status.trim());
    await expect(
      dialog.locator('[data-element="wallsFinish"] button'),
    ).toHaveCount(0);
    await expect(dialog.locator('[data-element="floor"] button')).toHaveCount(
      0,
    );
    await expect(
      dialog.locator('[data-element="electric"] button'),
    ).toHaveCount(0);
    await expect(
      dialog.locator('[data-element="windows"] .comparison-value-status'),
    ).toHaveText(["Входит", "Входит", "Входит"]);
    await expect(
      dialog.locator('[data-element="windows"] .comparison-value-details li'),
    ).toHaveText(["Базовые, 1,2×1 м", "Согласно проекту", "Согласно проекту"]);
    await expect(
      dialog.locator('[data-element="wallsFinish"] .comparison-value-status'),
    ).toHaveText(["Не входит", "Входит", "Входит"]);
    await expect(
      dialog.locator(
        '[data-element="wallsFinish"] .comparison-value-details li',
      ),
    ).toHaveText(["Гипсокартон 15 мм", "Чистовая: имитация бруса"]);
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
      expect(
        await dialog
          .locator(
            ".comparison-table thead [data-package]:visible .comparison-price",
          )
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
      ).toBe(true);
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
    await expect(dialog.locator(".comparison-price").first()).toHaveCSS(
      "color",
      "rgb(72, 176, 98)",
    );
    const sectionBorders = await dialog
      .locator(".comparison-section > th")
      .evaluateAll((cells) =>
        cells.map((cell) => {
          const css = getComputedStyle(cell);
          return [
            css.borderLeftWidth,
            css.borderRightWidth,
            css.borderBottomWidth,
            css.borderTopWidth,
          ];
        }),
      );
    for (const borders of sectionBorders)
      expect(borders).toEqual(["1px", "1px", "1px", "0px"]);
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
            textCenter: (() => {
              const rect = cell
                .querySelector(
                  ".comparison-label > span:first-child, .comparison-value-content",
                )!
                .getBoundingClientRect();
              return rect.top + rect.height / 2;
            })(),
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
        expect(
          Math.abs(cell.textCenter - (cell.top + cell.bottom) / 2),
        ).toBeLessThan(1);
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

test("mobile packages slide both ways, interrupt cleanly, and respect reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const dialog = await openComparison(page);
  const standard = dialog.getByRole("tab", {
    name: "Стандартная",
    exact: true,
  });
  const project = dialog.getByRole("tab", { name: "Проектная", exact: true });
  const turnkey = dialog.getByRole("tab", { name: "Под ключ", exact: true });
  await standard.click();
  await page.waitForTimeout(320);
  await project.click();
  const forward = await dialog
    .locator('thead [data-package="1"] .comparison-slide-viewport')
    .first()
    .evaluate(async (viewport) => {
      const frames: { incoming: number; outgoing: number }[] = [];
      const start = performance.now();
      while (performance.now() - start < 130) {
        const incoming = viewport.querySelector(
          ":scope > .comparison-slide-current",
        )!;
        const outgoing = viewport.querySelector(
          ":scope > .comparison-slide-outgoing",
        );
        if (outgoing)
          frames.push({
            incoming:
              incoming.getBoundingClientRect().x -
              viewport.getBoundingClientRect().x,
            outgoing:
              outgoing.getBoundingClientRect().x -
              viewport.getBoundingClientRect().x,
          });
        await new Promise(requestAnimationFrame);
      }
      return frames;
    });
  expect(
    forward.some((frame) => frame.incoming > 1 && frame.outgoing < -1),
  ).toBe(true);
  expect(forward.at(-1)!.incoming).toBeLessThan(forward[0]!.incoming);
  await standard.click();
  const backwards = await dialog
    .locator('thead [data-package="0"] .comparison-slide-viewport')
    .first()
    .evaluate(async (viewport) => {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const incoming = viewport.querySelector(
        ":scope > .comparison-slide-current",
      )!;
      const outgoing = viewport.querySelector(
        ":scope > .comparison-slide-outgoing",
      )!;
      return {
        incoming:
          incoming.getBoundingClientRect().x -
          viewport.getBoundingClientRect().x,
        outgoing:
          outgoing.getBoundingClientRect().x -
          viewport.getBoundingClientRect().x,
      };
    });
  expect(backwards.incoming).toBeLessThan(0);
  expect(backwards.outgoing).toBeGreaterThan(0);
  await turnkey.click();
  await project.click();
  await page.waitForTimeout(350);
  await expect(dialog.locator(".comparison-slide-outgoing")).toHaveCount(0);
  await expect(project).toHaveAttribute("aria-selected", "true");
  expect(
    await dialog
      .locator(".comparison-scroll")
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
  ).toBe(true);
  await expect(project).toHaveCSS("border-top-width", "0px");
  await expect(project).toHaveCSS("outline-style", "none");
  await expect(dialog.locator(".comparison-switch > span")).toHaveCSS(
    "border-top-width",
    "0px",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await standard.click();
  await expect(dialog.locator(".comparison-slide-outgoing")).toHaveCount(0);
  await expect(standard).toHaveAttribute("aria-selected", "true");
});

test("delivery inclusion stays in the table and the zone follows the selected region", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let dialog = await openComparison(page);
  for (const [index, city] of ["Нижнего Новгорода", "Москвы"].entries()) {
    if (index === 1) {
      await page.locator(".site-region__trigger:visible").first().click();
      await page
        .getByRole("option", { name: "Московская область", exact: true })
        .click();
      await page.getByRole("button", { name: "Сравнить комплектации" }).click();
      dialog = page.getByRole("dialog", { name: "Сравнение комплектаций" });
    }
    await dialog
      .getByRole("button", { name: /Дополнительные конструкции и работы/ })
      .click();
    const delivery = dialog.locator('[data-element="delivery"]');
    await expect(delivery.locator("td")).toContainText([
      "Входит",
      "Входит",
      "Входит",
    ]);
    expect(await delivery.innerText()).not.toMatch(/600|50|Моск|Новгор/);
    await dialog
      .getByRole("button", { name: "Подробнее: Доставка", exact: true })
      .click();
    await expect(dialog.locator('[data-slot="popover-content"]')).toContainText(
      `50 км от ${city}`,
    );
    await page.keyboard.press("Escape");
    await expect(dialog.locator('[data-slot="popover-content"]')).toHaveCount(
      0,
    );
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  }
});

test("drag follows the finger before release and a short drag returns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const dialog = await openComparison(page);
  await dialog.getByRole("tab", { name: "Стандартная", exact: true }).click();
  await page.waitForTimeout(320);
  const scroll = dialog.locator(".comparison-scroll");
  const touch = async (type: string, x: number, y = 250) => {
    await scroll.evaluate(
      (element, { type, x, y }) => {
        const point = new Touch({
          identifier: 1,
          target: element,
          clientX: x,
          clientY: y,
        });
        element.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            touches:
              type === "touchend" || type === "touchcancel" ? [] : [point],
            changedTouches: [point],
          }),
        );
      },
      { type, x, y },
    );
  };
  const offset = () =>
    dialog
      .locator('thead [data-package="1"] .comparison-slide-outgoing')
      .evaluate(
        (element) =>
          element.getBoundingClientRect().x -
          element.parentElement!.getBoundingClientRect().x,
      );
  await touch("touchstart", 300);
  await touch("touchmove", 270);
  await expect.poll(offset).toBeCloseTo(-30, 0);
  await page.waitForTimeout(130);
  expect(await offset()).toBeCloseTo(-30, 0);
  await touch("touchmove", 230);
  await expect.poll(offset).toBeCloseTo(-70, 0);
  await touch("touchend", 230);
  await page.waitForTimeout(250);
  await expect(
    dialog.getByRole("tab", { name: "Проектная", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(dialog.locator(".comparison-slide-outgoing")).toHaveCount(0);
  await touch("touchstart", 200);
  await touch("touchmove", 220);
  await page.waitForTimeout(130);
  await touch("touchend", 220);
  await page.waitForTimeout(250);
  await expect(
    dialog.getByRole("tab", { name: "Проектная", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await touch("touchstart", 200);
  await touch("touchmove", 260);
  await touch("touchcancel", 260);
  await page.waitForTimeout(250);
  await expect(
    dialog.getByRole("tab", { name: "Проектная", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await touch("touchstart", 200);
  await touch("touchmove", 190, 160);
  await touch("touchend", 180, 100);
  await expect(
    dialog.getByRole("tab", { name: "Проектная", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});

test("desktop overlay covers the viewport and restores the root canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const dialog = await openComparison(page);
  await page.waitForTimeout(300);
  const geometry = await page
    .locator(".comparison-overlay")
    .evaluate((overlay) => ({
      right: overlay.getBoundingClientRect().right,
      viewport: innerWidth,
      rootBackground: getComputedStyle(document.documentElement)
        .backgroundColor,
    }));
  expect(geometry.right).toBeGreaterThanOrEqual(geometry.viewport);
  expect(geometry.rootBackground).not.toBe("rgba(0, 0, 0, 0)");
  expect(geometry.rootBackground).not.toBe("rgb(255, 255, 255)");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".comparison-overlay")).toHaveCount(0);
});

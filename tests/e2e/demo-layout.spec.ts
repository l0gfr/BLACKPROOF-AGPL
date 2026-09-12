import { expect, test } from "@playwright/test";

test("demo walkthrough keeps readable columns on desktop and stacks cleanly on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/demo");

  const desktop = await page.evaluate(() => {
    const walkthrough = document.querySelector<HTMLElement>(".demo-walkthrough")!;
    const cards = [...document.querySelectorAll<HTMLElement>(".step-list article")];
    return {
      walkthroughWidth: walkthrough.getBoundingClientRect().width,
      cards: cards.map((card) => ({
        width: card.getBoundingClientRect().width,
        childWidths: [...card.children].map((child) => child.getBoundingClientRect().width),
      })),
    };
  });

  expect(desktop.walkthroughWidth).toBeGreaterThan(900);
  expect(desktop.cards).toHaveLength(5);
  for (const card of desktop.cards) {
    expect(card.width).toBeGreaterThan(900);
    expect(card.childWidths[1]).toBeGreaterThan(280);
    expect(card.childWidths[2]).toBeGreaterThan(180);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const mobile = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".step-list article")!;
    const button = card.querySelector<HTMLElement>(".button")!;
    const cardRect = card.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    return {
      noHorizontalOverflow: document.documentElement.scrollWidth === window.innerWidth,
      columns: getComputedStyle(card).gridTemplateColumns.split(" ").length,
      buttonInsideCard: buttonRect.left >= cardRect.left && buttonRect.right <= cardRect.right,
    };
  });

  expect(mobile).toEqual({
    noHorizontalOverflow: true,
    columns: 1,
    buttonInsideCard: true,
  });
});

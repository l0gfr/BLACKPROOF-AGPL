import { expect, test } from "@playwright/test";

const visualAuditRoutes = [
  "/",
  "/about",
  "/start",
  "/use-cases",
  "/grc",
  "/status",
  "/demo",
  "/security",
  "/analyses",
  "/analyses/fuite-de-donnees-etablir-avant-de-conclure",
  "/resources",
  "/faq",
  "/open-source",
  "/method",
  "/evidence-library",
  "/frameworks",
  "/proofpack",
  "/proofpack-example",
  "/proofdebt",
  "/api",
  "/app",
  "/app/cases",
  "/questionnaire-import",
  "/questionnaire-crusher",
  "/verify",
  "/legal",
  "/rgpd",
] as const;

test("BLACKPROOF keeps its evidence-register identity across viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/");

  await expect(page.locator(".logo-mark svg").first()).toBeVisible();
  await expect(page.locator(".proof-rail")).toBeVisible();
  await expect(page.locator(".proof-word")).toBeVisible();

  const desktopSignature = await page.evaluate(() => {
    const rail = document.querySelector<HTMLElement>(".proof-rail")!;
    const eyebrow = document.querySelector<HTMLElement>(".eyebrow")!;
    const proofWord = document.querySelector<HTMLElement>(".proof-word")!;
    const icon = document.querySelector<HTMLElement>("[data-card-icon]")!;
    const bodySpine = getComputedStyle(document.body, "::after");
    const eyebrowBracket = getComputedStyle(eyebrow, "::before");
    const eyebrowSeal = getComputedStyle(eyebrow, "::after");
    const proofUnderline = getComputedStyle(proofWord, "::after");
    const iconStyle = getComputedStyle(icon);

    return {
      railHeight: rail.getBoundingClientRect().height,
      railFont: getComputedStyle(rail.querySelector(".proof-rail-inner")!).fontFamily.toLowerCase(),
      spineWidth: Number.parseFloat(bodySpine.width),
      spinePattern: bodySpine.backgroundImage,
      bracketLeft: eyebrowBracket.borderLeftWidth,
      bracketBottom: eyebrowBracket.borderBottomWidth,
      sealSize: Number.parseFloat(eyebrowSeal.width),
      underlineHeight: Number.parseFloat(proofUnderline.height),
      iconBottomLeftRadius: Number.parseFloat(iconStyle.borderBottomLeftRadius),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  expect(desktopSignature.railHeight).toBe(24);
  expect(desktopSignature.railFont).toContain("mono");
  expect(desktopSignature.spineWidth).toBe(3);
  expect(desktopSignature.spinePattern).toContain("repeating-linear-gradient");
  expect(desktopSignature.bracketLeft).toBe("1px");
  expect(desktopSignature.bracketBottom).toBe("1px");
  expect(desktopSignature.sealSize).toBeGreaterThan(3);
  expect(desktopSignature.underlineHeight).toBeGreaterThan(3);
  expect(desktopSignature.iconBottomLeftRadius).toBe(4);
  expect(desktopSignature.horizontalOverflow).toBe(false);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const mobileSignature = await page.evaluate(() => ({
    railVisible: getComputedStyle(document.querySelector<HTMLElement>(".proof-rail")!).display !== "none",
    masterDeliveryHidden: getComputedStyle(document.querySelector<HTMLElement>(".proof-rail-inner span:nth-child(2)")!).display === "none",
    proofWordWidth: document.querySelector<HTMLElement>(".proof-word")!.getBoundingClientRect().width,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));

  expect(mobileSignature.railVisible).toBe(true);
  expect(mobileSignature.masterDeliveryHidden).toBe(true);
  expect(mobileSignature.proofWordWidth).toBeGreaterThan(100);
  expect(mobileSignature.horizontalOverflow).toBe(false);
});

test("professional visual system keeps page titles refined and app surfaces spacious", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });

  for (const path of ["/", "/app", "/questionnaire-import", "/verify", "/app/cases"]) {
    await page.goto(path);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();

    const visualState = await heading.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontFamily: style.fontFamily.toLowerCase(),
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: Number.parseInt(style.fontWeight, 10),
        letterSpacing: Number.parseFloat(style.letterSpacing),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    expect(visualState.fontFamily).not.toContain("monospace");
    expect(visualState.fontSize).toBeLessThanOrEqual(60);
    expect(visualState.fontWeight).toBeLessThanOrEqual(500);
    expect(visualState.letterSpacing).toBeGreaterThanOrEqual(-2.5);
    expect(visualState.horizontalOverflow).toBe(false);
  }

  await page.goto("/app");
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();
  await expect(page.locator(".form-section").first()).toBeVisible();
  const appComposition = await page.evaluate(() => {
    const panel = document.querySelector<HTMLElement>(".app-panel")!;
    const intro = document.querySelector<HTMLElement>(".page-intro")!;
    const form = document.querySelector<HTMLElement>(".form-section")!;
    const panelStyle = getComputedStyle(panel);
    const introStyle = getComputedStyle(intro);
    const formStyle = getComputedStyle(form);

    return {
      panelBorderWidth: panelStyle.borderTopWidth,
      panelBackground: panelStyle.backgroundImage,
      introColumns: introStyle.gridTemplateColumns.split(" ").length,
      formRadius: Number.parseFloat(formStyle.borderRadius),
      formPadding: Number.parseFloat(formStyle.paddingTop),
    };
  });

  expect(appComposition).toEqual({
    panelBorderWidth: "0px",
    panelBackground: "none",
    introColumns: 2,
    formRadius: 22,
    formPadding: 28,
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('[data-blackproof-component="proof-app"][data-blackproof-hydrated="true"]')).toBeVisible();

  const mobile = await page.evaluate(() => ({
    headingSize: Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>("h1")!).fontSize),
    introColumns: getComputedStyle(document.querySelector<HTMLElement>(".page-intro")!).gridTemplateColumns.split(" ").length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));

  expect(mobile.headingSize).toBeLessThanOrEqual(47);
  expect(mobile.introColumns).toBe(1);
  expect(mobile.horizontalOverflow).toBe(false);
});

test("structural cards share one restrained line-icon language", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });

  for (const [path, minimumIcons] of [
    ["/", 6],
    ["/security", 6],
    ["/start", 4],
    ["/resources", 3],
    ["/use-cases", 6],
  ] as const) {
    await page.goto(path);
    const icons = page.locator("[data-card-icon]");
    await expect(icons).toHaveCount(minimumIcons);

    const iconState = await icons.evaluateAll((elements) => ({
      colors: new Set(elements.map((element) => getComputedStyle(element).color)).size,
      consistentSize: elements.every((element) => {
        const style = getComputedStyle(element);
        return style.width === "44px" && style.height === "44px";
      }),
      consistentStroke: elements.every((element) => {
        const svg = element.querySelector("svg");
        return svg && Number.parseFloat(getComputedStyle(svg).strokeWidth) >= 1.5;
      }),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    }));

    expect(iconState.colors).toBeGreaterThanOrEqual(3);
    expect(iconState.consistentSize).toBe(true);
    expect(iconState.consistentStroke).toBe(true);
    expect(iconState.horizontalOverflow).toBe(false);
  }
});

test("site-wide surfaces keep a deliberate rhythm without clipped controls", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);

    for (const path of visualAuditRoutes) {
      await page.goto(path);

      const layout = await page.evaluate(() => {
        const isVisible = (element: Element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return rect.width > 40 && rect.height > 12 && style.display !== "none" && style.visibility !== "hidden";
        };
        const isSurface = (element: Element) => {
          const style = getComputedStyle(element);
          const className = String(element.className || "");
          return /(panel|card|note|guide|strip|box|stage|board|visual|actions|section)/.test(className)
            && (Number.parseFloat(style.borderTopWidth) > 0
              || Number.parseFloat(style.borderLeftWidth) > 0
              || style.backgroundImage !== "none"
              || style.backgroundColor !== "rgba(0, 0, 0, 0)");
        };

        const collisions: Array<{ first: string; second: string; gap: number }> = [];
        for (const parent of document.querySelectorAll("main *, body > div, [data-blackproof-component]")) {
          const children = [...parent.children].filter((element) => isVisible(element) && isSurface(element));
          for (let index = 0; index < children.length - 1; index += 1) {
            const first = children[index];
            const second = children[index + 1];
            const firstRect = first.getBoundingClientRect();
            const secondRect = second.getBoundingClientRect();
            const overlap = Math.max(0, Math.min(firstRect.right, secondRect.right) - Math.max(firstRect.left, secondRect.left));
            const minimumWidth = Math.min(firstRect.width, secondRect.width);
            const gap = secondRect.top - firstRect.bottom;

            if (secondRect.top >= firstRect.bottom - 1 && minimumWidth > 0 && overlap / minimumWidth > 0.6 && gap < 12) {
              collisions.push({
                first: String(first.className || first.tagName),
                second: String(second.className || second.tagName),
                gap,
              });
            }
          }
        }

        const offscreenControls = [...document.querySelectorAll("main a, main button, main input, main select, main textarea")]
          .filter(isVisible)
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.left < -1 || rect.right > window.innerWidth + 1;
          })
          .map((element) => String(element.className || element.tagName));

        return {
          collisions,
          offscreenControls,
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        };
      });

      expect(layout.horizontalOverflow, `${path} overflows at ${viewport.width}px`).toBe(false);
      expect(layout.offscreenControls, `${path} has offscreen controls at ${viewport.width}px`).toEqual([]);
      expect(layout.collisions, `${path} has touching surfaces at ${viewport.width}px`).toEqual([]);
    }
  }

  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/app/cases");
  await expect(page.locator('[data-blackproof-ready="true"]')).toBeVisible();

  const casesRhythm = await page.evaluate(() => {
    const gap = (first: Element, second: Element) => second.getBoundingClientRect().top - first.getBoundingClientRect().bottom;
    return {
      noteToGuide: gap(document.querySelector(".security-note")!, document.querySelector(".journey-guide")!),
      guideToPrimary: gap(document.querySelector(".journey-guide")!, document.querySelector(".primary-actions")!),
      primaryToUtility: gap(document.querySelector(".primary-actions")!, document.querySelector(".utility-actions")!),
    };
  });

  expect(casesRhythm.noteToGuide).toBeGreaterThanOrEqual(18);
  expect(casesRhythm.guideToPrimary).toBeGreaterThanOrEqual(18);
  expect(casesRhythm.primaryToUtility).toBeGreaterThanOrEqual(14);

  await page.goto("/");
  await expect(page.locator(".video-frame img")).toHaveCSS("display", "block");
});

test("public routes keep readable sibling text from overlapping", async ({ page }) => {
  test.setTimeout(180_000);

  for (const viewport of [
    { width: 1280, height: 820 },
    { width: 768, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);

    for (const path of visualAuditRoutes) {
      await page.goto(path);
      await page.waitForFunction(() => !document.querySelector('[data-blackproof-hydrated="false"]'));

      const overlaps = await page.evaluate(() => {
        const readableSelector = [
          "a",
          "b",
          "button",
          "code",
          "dd",
          "dt",
          "em",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "label",
          "legend",
          "li",
          "p",
          "small",
          "span",
          "strong",
        ].join(",");

        const isReadable = (element: Element) => {
          if (!element.matches(readableSelector) || element.closest('[aria-hidden="true"]')) return false;
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (element.textContent || "").trim().length > 0
            && rect.width > 1
            && rect.height > 1
            && style.display !== "none"
            && style.visibility !== "hidden"
            && Number.parseFloat(style.opacity) > 0;
        };

        const describe = (element: Element) => {
          const className = String(element.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).join(".");
          const text = (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
          return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""} \"${text}\"`;
        };

        const collisions: Array<{ first: string; second: string; width: number; height: number }> = [];
        const parents = [document.querySelector("main"), ...document.querySelectorAll("main *")].filter(Boolean) as Element[];

        for (const parent of parents) {
          const children = [...parent.children].filter(isReadable);
          for (let firstIndex = 0; firstIndex < children.length; firstIndex += 1) {
            for (let secondIndex = firstIndex + 1; secondIndex < children.length; secondIndex += 1) {
              const first = children[firstIndex];
              const second = children[secondIndex];
              const firstRects = [...first.getClientRects()];
              const secondRects = [...second.getClientRects()];

              const intersection = firstRects.flatMap((firstRect) => secondRects.map((secondRect) => ({
                width: Math.min(firstRect.right, secondRect.right) - Math.max(firstRect.left, secondRect.left),
                height: Math.min(firstRect.bottom, secondRect.bottom) - Math.max(firstRect.top, secondRect.top),
              }))).find(({ width, height }) => width > 1 && height > 1);

              if (intersection) {
                collisions.push({
                  first: describe(first),
                  second: describe(second),
                  width: Math.round(intersection.width * 10) / 10,
                  height: Math.round(intersection.height * 10) / 10,
                });
              }
            }
          }
        }

        return collisions;
      });

      expect(overlaps, `${path} has overlapping text at ${viewport.width}px`).toEqual([]);
    }
  }
});

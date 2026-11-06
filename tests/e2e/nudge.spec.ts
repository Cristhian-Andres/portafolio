import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const recruiter = (page: Page) => page.locator('[data-gate-answer="recruiter"]');
const curious = (page: Page) => page.locator('[data-gate-answer="curious"]');
const nudge = (page: Page) => page.locator("[data-persuasion-nudge]");

/** Elige y espera la recarga que desbloquea la página. Devuelve cuándo terminó de cargar la nueva página. */
async function enterAs(page: Page, pick: (page: Page) => ReturnType<typeof recruiter>) {
  await page.goto("/");
  await expect(pick(page)).toBeEnabled({ timeout: 25_000 });
  await pick(page).click();
  await expect
    .poll(
      () =>
        page
          .evaluate(
            () => (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming).type
          )
          .catch(() => "navegando"),
      { timeout: 10_000 }
    )
    .toBe("reload");
  await expect(page.locator(".gate-veil")).toHaveCount(0);
  return Date.now();
}

test.describe("frases de revelación: las palabras salen separadas", () => {
  for (const [name, pick, phrase] of [
    ["Soy reclutador", recruiter, "Ahora te muestro todo mi potencial"],
    ["Ando de curioso", curious, "Bienvenido a mi mundo"],
  ] as const) {
    test(`«${name}»: «${phrase}» se lee con espacio entre palabras`, async ({ page }) => {
      await page.goto("/");
      await expect(pick(page)).toBeEnabled({ timeout: 25_000 });
      await pick(page).click();
      const words = page.locator("[data-reveal-word]");
      await expect(words).toHaveCount(phrase.split(" ").length);
      // Se mide en cuanto todas las palabras terminaron de aparecer (la página recarga ~1,4 s después de elegir).
      let gaps: number[] = [];
      await expect
        .poll(
          async () => {
            const measured = await words
              .evaluateAll((els) => {
                if (!els.every((el) => getComputedStyle(el).opacity === "1")) return null;
                const boxes = els.map((el) => el.getBoundingClientRect());
                const out: number[] = [];
                for (let i = 1; i < boxes.length; i++) {
                  const sameLine = Math.abs(boxes[i].top - boxes[i - 1].top) < boxes[i].height / 2;
                  if (sameLine) out.push(boxes[i].left - boxes[i - 1].right);
                }
                return out;
              })
              .catch(() => null);
            if (measured) gaps = measured;
            return measured !== null;
          },
          { intervals: [30], timeout: 4_000 }
        )
        .toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
      for (const gap of gaps) expect(gap).toBeGreaterThan(3); // un espacio real, no palabras pegadas
    });
  }
});

/** La tarjeta es un modal: centrado en la ventana, con la página detrás difusa y sin desplazarse. */
async function expectCenteredModal(page: Page) {
  const box = (await nudge(page).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(3);
  expect(Math.abs(box.y + box.height / 2 - viewport.height / 2)).toBeLessThan(viewport.height * 0.05);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);

  const backdrop = page.locator("[data-persuasion-backdrop]");
  await expect(backdrop).toHaveCSS("position", "fixed");
  expect(await backdrop.evaluate((el) => getComputedStyle(el).backdropFilter)).toContain("blur");
  const bb = (await backdrop.boundingBox())!;
  expect(Math.round(bb.width)).toBe(viewport.width);
  expect(Math.round(bb.height)).toBe(viewport.height);
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden"); // la página detrás no se desplaza
  await expect(nudge(page)).toHaveAttribute("aria-modal", "true");
}

/** Al cerrar, la página vuelve a la normalidad: sin fondo difuso, con scroll y con clics. */
async function expectPageUsableAgain(page: Page) {
  await expect(page.locator("[data-persuasion-backdrop]")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await page.locator("#skills").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
}

test.describe("tarjeta de persuasión: a los 3 s de elegir", () => {
  test("reclutador: aparece a los ~3 s, invita a escribir, no bloquea y al cerrarla se pone triste", async ({
    page,
  }) => {
    const loadedAt = await enterAs(page, recruiter);
    await expect(nudge(page)).toHaveCount(0); // todavía no
    await expect(nudge(page)).toBeVisible({ timeout: 8_000 });
    const elapsed = Date.now() - loadedAt;
    expect(elapsed).toBeGreaterThan(1_500); // no sale de golpe…
    expect(elapsed).toBeLessThan(6_500); // …pero sí pronto (3 s, con margen de equipo lento)

    await expect(nudge(page)).toHaveAttribute("data-audience", "recruiter");
    await expect(nudge(page).getByText(/contratar/i)).toBeVisible();
    const cta = nudge(page).getByRole("link", { name: /contrátame/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /mailto:|gmail\.com/);

    await expectCenteredModal(page);

    // Cerrar: se pone triste (emoji y mensaje) y luego desaparece.
    await nudge(page).getByRole("button", { name: /cerrar/i }).click();
    await expect(nudge(page)).toHaveAttribute("data-leaving", "sad");
    await expect(nudge(page)).toContainText("😭");
    await expect(nudge(page)).toContainText(/triste/i);
    await expect(nudge(page)).toHaveCount(0, { timeout: 4_000 });
    await expectPageUsableAgain(page);
  });

  test("curioso: aparece a los ~3 s, invita a seguir en redes y al cerrarla NO se pone triste", async ({
    page,
  }) => {
    const loadedAt = await enterAs(page, curious);
    await expect(nudge(page)).toHaveCount(0);
    await expect(nudge(page)).toBeVisible({ timeout: 8_000 });
    const elapsed = Date.now() - loadedAt;
    expect(elapsed).toBeGreaterThan(1_500);
    expect(elapsed).toBeLessThan(6_500);

    await expect(nudge(page)).toHaveAttribute("data-audience", "curious");
    await expect(nudge(page).getByText(/sígueme/i)).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: "LinkedIn" })).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: "Instagram" })).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: /contrátame/i })).toHaveCount(0);
    await expectCenteredModal(page);

    await nudge(page).getByRole("button", { name: /cerrar/i }).click();
    await expect(nudge(page)).toHaveAttribute("data-leaving", "fade");
    await expect(nudge(page)).not.toContainText("😭");
    await expect(nudge(page)).not.toContainText(/triste/i);
    await expect(nudge(page)).toHaveCount(0, { timeout: 3_000 });
    await expectPageUsableAgain(page);
  });

  test("Escape y un clic en el fondo también la cierran", async ({ page }) => {
    await enterAs(page, curious);
    await expect(nudge(page)).toBeVisible({ timeout: 8_000 });
    await page.keyboard.press("Escape");
    await expect(nudge(page)).toHaveCount(0, { timeout: 3_000 });
    await expectPageUsableAgain(page);

    // otra elección → vuelve a salir; esta vez se cierra tocando el fondo difuso
    await page.evaluate(() => sessionStorage.clear());
    await enterAs(page, curious);
    await expect(nudge(page)).toBeVisible({ timeout: 8_000 });
    await page.mouse.click(4, 4);
    await expect(nudge(page)).toHaveCount(0, { timeout: 3_000 });
  });

  test("una sola vez por elección: tras cerrarla, la recarga posterior no la vuelve a mostrar", async ({
    page,
  }) => {
    await enterAs(page, recruiter);
    await expect(nudge(page)).toBeVisible({ timeout: 8_000 });
    await nudge(page).getByRole("button", { name: /cerrar/i }).click();
    await expect(nudge(page)).toHaveCount(0, { timeout: 4_000 });

    await page.reload();
    await page.waitForTimeout(4_500); // más que los 3 s: si fuera a aparecer, ya lo habría hecho
    await expect(nudge(page)).toHaveCount(0);
  });
});

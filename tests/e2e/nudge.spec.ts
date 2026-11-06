import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const recruiter = (page: Page) => page.locator('[data-gate-answer="recruiter"]');
const curious = (page: Page) => page.locator('[data-gate-answer="curious"]');
const nudge = (page: Page) => page.locator("[data-persuasion-nudge]");

/** Acelera el temporizador de 20 s de la tarjeta de persuasión para no esperarlo de verdad. */
async function speedUpNudgeDelay(page: Page) {
  await page.addInitScript(() => {
    const realSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
      realSetTimeout(fn, ms === 20_000 ? 50 : ms, ...args)) as typeof window.setTimeout;
  });
}

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
}

test.describe("tarjeta de persuasión: segundo toque tras elegir", () => {
  test("reclutador: invita a escribir por correo, no bloquea la página y se puede cerrar", async ({
    page,
  }) => {
    await speedUpNudgeDelay(page);
    await enterAs(page, recruiter);

    await expect(nudge(page)).toBeVisible({ timeout: 5_000 });
    await expect(nudge(page)).toHaveAttribute("data-audience", "recruiter");
    await expect(nudge(page).getByText(/contratar/i)).toBeVisible();
    const cta = nudge(page).getByRole("link", { name: /contrátame/i });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", /mailto:|gmail\.com/);

    // No bloquea: se puede seguir usando la página con la tarjeta visible.
    await page.locator("#skills").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

    // Cerrar: breve emoji llorando y luego desaparece.
    await nudge(page).getByRole("button", { name: /cerrar/i }).click();
    await expect(nudge(page)).toContainText("😭");
    await expect(nudge(page)).toHaveCount(0, { timeout: 3_000 });
  });

  test("curioso: invita a seguir en redes (LinkedIn e Instagram) en vez de contratar", async ({
    page,
  }) => {
    await speedUpNudgeDelay(page);
    await enterAs(page, curious);

    await expect(nudge(page)).toBeVisible({ timeout: 5_000 });
    await expect(nudge(page)).toHaveAttribute("data-audience", "curious");
    await expect(nudge(page).getByText(/sígueme/i)).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: "LinkedIn" })).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: "Instagram" })).toBeVisible();
    await expect(nudge(page).getByRole("link", { name: /contrátame/i })).toHaveCount(0);
  });

  test("solo aparece una vez por sesión: tras cerrarla, una recarga posterior no vuelve a mostrarla", async ({
    page,
  }) => {
    await speedUpNudgeDelay(page);
    await enterAs(page, recruiter);
    await expect(nudge(page)).toBeVisible({ timeout: 5_000 });
    await nudge(page).getByRole("button", { name: /cerrar/i }).click();
    await expect(nudge(page)).toHaveCount(0, { timeout: 3_000 });

    await page.reload();
    await page.waitForTimeout(200); // más que el retraso acelerado: si fuera a aparecer, ya lo habría hecho
    await expect(nudge(page)).toHaveCount(0);
  });
});

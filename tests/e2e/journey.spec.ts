import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const recruiter = (page: Page) => page.locator('[data-gate-answer="recruiter"]');
const scrollY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));
const waterState = (page: Page) => page.getByTestId("water-ripple").getAttribute("data-state");

/** Espera la recarga real (tipo de navegación = reload) y que la página nueva termine de hidratar. */
async function expectReloadedAndReady(page: Page) {
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

/**
 * Simula que ya pasó el margen de desbloqueo (10 s): una recarga posterior vuelve a mostrar la introducción.
 * (La recarga inmediata tras pulsar un botón muestra todo directamente, por diseño.)
 */
async function ageUnlock(page: Page) {
  await page.evaluate(() => {
    const key = "portfolio-gatekeeper";
    const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
    if (!saved) return;
    saved.state.answeredAt = Date.now() - 60_000;
    sessionStorage.setItem(key, JSON.stringify(saved));
  });
}

/** Escape desbloquea (recarga) sin esperar la animación: camino de accesibilidad. */
async function unlockWithEscape(page: Page) {
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expectReloadedAndReady(page);
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator("div[inert]")).toHaveCount(0);
}

/** Baja por la página hasta el contacto (como lo haría una persona). */
async function scrollDownToContact(page: Page) {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect.poll(() => scrollY(page)).toBeGreaterThan(1500);
}

test.describe("recorrido completo, de principio a fin", () => {
  test("entrar → introducción → botón → recarga → inicio → usar la página → recargar a mitad de página → inicio", async ({
    page,
    isMobile,
  }) => {
    // 1) Primera visita: arriba, con la introducción blanca cargando (sin botón de saltar).
    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    expect(await scrollY(page)).toBe(0);
    await expect(page.locator("[data-intro-gate]")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(dialog.getByText("Cargando perfil…")).toBeVisible();
    await expect(page.getByRole("button", { name: /saltar/i })).toHaveCount(0);
    await expect(page.locator("[data-intro-role]")).toHaveText(/process automation engineer/i);

    // 2) Termina de cargar y pregunta; elige un botón.
    await expect(recruiter(page)).toBeEnabled({ timeout: 25_000 });
    await expect(page.getByRole("heading", { name: /qué haces aquí/i })).toBeVisible();
    await recruiter(page).click();

    // 3) La página se recarga y muestra TODO desde el inicio.
    await expectReloadedAndReady(page);
    await expect(dialog).toBeHidden();
    await expect(page.locator("div[inert]")).toHaveCount(0);
    expect(await scrollY(page)).toBe(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Cristhian");
    await expect(page.getByRole("link", { name: /descargar cv/i })).toBeVisible();

    // 4) Se usa la página: el efecto de agua responde y se puede navegar.
    if (isMobile) {
      await page.touchscreen.tap(200, 400);
    } else {
      await page.mouse.move(300, 300);
      await page.mouse.move(520, 340, { steps: 8 });
    }
    await expect.poll(() => waterState(page)).toBe("active");
    await scrollDownToContact(page);
    await expect(page.getByRole("link", { name: "Escríbeme" }).first()).toBeVisible();

    // 5) Recarga con la página a mitad de camino: vuelve SIEMPRE al inicio (y vuelve a verse la introducción).
    const deep = await scrollY(page);
    expect(deep).toBeGreaterThan(1500);
    await ageUnlock(page);
    await page.reload();
    await expect(dialog).toBeVisible();
    expect(await scrollY(page)).toBe(0);

    // 6) Se desbloquea otra vez: de nuevo todo, y de nuevo desde el inicio.
    await unlockWithEscape(page);
    expect(await scrollY(page)).toBe(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("siempre desde el inicio de la página", () => {
  test("recargar con la página a mitad de camino vuelve al inicio, y NO hay un instante restaurado", async ({
    page,
  }) => {
    // Registra el scroll más alto visto durante la carga: con restauración automática pasaría de 0.
    await page.addInitScript(() => {
      const w = window as unknown as { __maxY: number };
      w.__maxY = 0;
      window.addEventListener("scroll", () => (w.__maxY = Math.max(w.__maxY, window.scrollY)), {
        passive: true,
      });
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(recruiter(page)).toBeEnabled();
    await recruiter(page).click();
    await expectReloadedAndReady(page);

    await scrollDownToContact(page);
    expect(await scrollY(page)).toBeGreaterThan(1500);

    await ageUnlock(page);
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(800);
    expect(await scrollY(page)).toBe(0);
    expect(await page.evaluate(() => (window as unknown as { __maxY: number }).__maxY)).toBe(0);
  });

  test("también tras desbloquear: la recarga de desbloqueo termina arriba aunque se haya estado abajo", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(recruiter(page)).toBeEnabled();
    // Se baja con la introducción abierta (la página de atrás está inerte pero el documento puede moverse).
    await page.evaluate(() => window.scrollTo({ top: 2500, behavior: "instant" }));
    await recruiter(page).click();
    await expectReloadedAndReady(page);
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(await scrollY(page)).toBe(0);
  });

  test("entrar con un #ancla (por ejemplo /#skills) también empieza arriba y limpia la URL", async ({
    page,
  }) => {
    await page.goto("/#skills");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(600);
    expect(await scrollY(page)).toBe(0);
    expect(await page.evaluate(() => window.location.hash)).toBe("");

    await unlockWithEscape(page);
    expect(await scrollY(page)).toBe(0);
    expect(await page.evaluate(() => window.location.hash)).toBe("");
  });

  test("volver con «atrás» desde otra página no deja la página a mitad de camino", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(recruiter(page)).toBeEnabled();
    await recruiter(page).click();
    await expectReloadedAndReady(page);
    await scrollDownToContact(page);

    await page.goto("about:blank");
    await page.goBack();
    await expect(page.locator("main, [role='dialog']").first()).toBeAttached();
    await expect.poll(() => scrollY(page), { timeout: 10_000 }).toBe(0);
  });

  test("navegar por el menú sigue funcionando (el reinicio solo ocurre al cargar)", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "el menú de escritorio; en móvil se prueba en portfolio.spec");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(recruiter(page)).toBeEnabled();
    await recruiter(page).click();
    await expectReloadedAndReady(page);

    await page.getByRole("link", { name: "Educación" }).first().click();
    await expect(page).toHaveURL(/#education$/);
    await expect(page.locator("#education")).toBeInViewport();
    expect(await scrollY(page)).toBeGreaterThan(1000); // la navegación interna NO sube al inicio
  });
});

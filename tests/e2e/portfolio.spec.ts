import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/** Espera a que el modal hidrate y lo cierra con Escape. */
async function dismissGate(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

const SECTIONS = ["about", "experience", "skills", "education", "projects", "contact"];

test.describe("portafolio", () => {
  test("el HTML inicial trae el contenido completo (SEO) y metadatos para compartir", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    expect(html).toContain("Cristhian");
    expect(html).toContain("Analytics Engineer");
    for (const id of SECTIONS) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain("application/ld+json");
  });

  test("robots, sitemap e imagen OG responden", async ({ request }) => {
    expect((await request.get("/robots.txt")).ok()).toBe(true);
    expect((await request.get("/sitemap.xml")).ok()).toBe(true);
    const og = await request.get("/opengraph-image");
    expect(og.ok()).toBe(true);
    expect(og.headers()["content-type"]).toContain("image/png");
  });

  test("el gatekeeper bloquea el fondo, responde y deja explorar", async ({ page, isMobile }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("main")).not.toBeFocused();
    await expect(page.locator("div[inert]")).toHaveCount(1);

    await page.getByRole("button", { name: /soy reclutador/i }).click();
    await expect(dialog).toBeHidden();
    if (isMobile) {
      await expect(page.getByRole("link", { name: /escríbeme por correo/i })).toBeVisible();
    } else {
      await expect(page.getByRole("complementary", { name: /mensaje del gato/i })).toBeVisible();
    }
    await expect(page.locator("div[inert]")).toHaveCount(0);

    // El contenido es navegable sin tener que "desbloquear" nada.
    await page.locator("#skills").scrollIntoViewIfNeeded();
    await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

    if (!isMobile) await page.getByRole("button", { name: /seguir explorando/i }).click();
    await expect(page.getByRole("link", { name: /escríbeme por correo/i })).toBeVisible();
  });

  test("la respuesta del gatekeeper persiste en la sesión", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /solo soy curioso/i }).click();
    await page.reload();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("el modal se cierra con Escape", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await dismissGate(page);
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("el cambio de tema alterna la clase dark y persiste", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    const html = page.locator("html");
    await expect(html).toHaveClass(/dark/);
    await page.getByRole("button", { name: /cambiar a tema claro/i }).click();
    await expect(html).not.toHaveClass(/dark/);
    await page.reload();
    await expect(html).not.toHaveClass(/dark/);
  });

  test("las imágenes y el gif se cargan sin errores de red", async ({ page }) => {
    const failed: string[] = [];
    page.on("response", (r) => {
      if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
    });
    await page.goto("/");
    await dismissGate(page);
    await page.locator("#projects").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    expect(failed).toEqual([]);
    const broken = await page.$$eval("img", (imgs) =>
      imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src)
    );
    expect(broken).toEqual([]);
  });

  test("sin errores de consola ni de página", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await dismissGate(page);
    await page.waitForTimeout(500);
    expect(errors).toEqual([]);
  });

  test("no hay scroll horizontal", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("al cerrar el modal el foco vuelve al contenido (no se pierde)", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    await expect(page.locator("main")).toBeFocused();
  });

  test("la skip-link es visible al enfocarla y salta al contenido", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    const skip = page.getByRole("link", { name: /saltar al contenido/i });
    await skip.focus();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe("responsive", () => {
  test("en móvil existe el menú hamburguesa y navega a una sección", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "solo móvil");
    await page.goto("/");
    await dismissGate(page);
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await page.getByRole("link", { name: "Educación" }).click();
    await expect(page.locator("#education")).toBeInViewport();
  });
});


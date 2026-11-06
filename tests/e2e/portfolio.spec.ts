import { expect, test } from "@playwright/test";

import type { Page } from "@playwright/test";

/**
 * Cierra la introducción con Escape. Eso la desbloquea y recarga la página, así que se espera
 * a que la página nueva termine de hidratar (el velo desaparece) y el contenido esté activo.
 */
async function dismissGate(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.locator(".gate-veil")).toHaveCount(0);
  await expect(page.locator("div[inert]")).toHaveCount(0);
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


test.describe("skills", () => {
  test("cada skill muestra su logo y el chip reacciona al pasar el cursor", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, "hover solo en escritorio");
    await page.goto("/");
    await dismissGate(page);

    const section = page.locator("#skills");
    await section.scrollIntoViewIfNeeded();
    const chips = section.locator("ul > li").filter({ has: page.locator("svg, span[aria-hidden]") });
    expect(await chips.count()).toBeGreaterThanOrEqual(28);

    const chip = section.getByRole("listitem").filter({ hasText: "Google BigQuery" }).first();
    await chip.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const before = await chip.boundingBox();
    await chip.hover();
    await page.waitForTimeout(500);
    const after = await chip.boundingBox();
    expect(after!.y).toBeLessThan(before!.y); // se eleva al pasar el cursor
  });
});

test.describe("botón Escríbeme", () => {
  test("es compacto, sin imagen, y se oculta sobre el footer", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);

    const pill = page.locator('a[aria-label="Escríbeme por correo"]');
    await expect(pill).toBeVisible();
    await expect(pill.locator("img")).toHaveCount(0);
    await expect(pill).toContainText("Escríbeme");

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(pill.locator("..")).toHaveCSS("opacity", "0");

    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pill.locator("..")).toHaveCSS("opacity", "1");
  });

  test("el resplandor de la frase corre en bucle", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    const letter = page.locator("footer p[aria-label] span.animate-letter-glow").first();
    await letter.scrollIntoViewIfNeeded();
    await expect(letter).toHaveCSS("animation-iteration-count", "infinite");
  });
});

test("el número de teléfono no aparece en ninguna parte del sitio", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("324 587 9364");
  expect(html).not.toContain("Teléfono");
});

test.describe("contacto por Gmail", () => {
  async function enter(page: Page) {
    await page.goto("/");
    await dismissGate(page);
  }

  test("no hay formulario ni enlaces mailto: en toda la página", async ({ page }) => {
    await enter(page);
    await expect(page.locator("form, #contact input, #contact textarea")).toHaveCount(0);
    await expect(page.locator('a[href^="mailto:"]')).toHaveCount(0);
  });

  test("todos los botones de correo apuntan a Gmail con mi destinatario", async ({ page }) => {
    await enter(page);
    const hrefs = await page
      .locator('a[href*="mail.google.com"]')
      .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).href));
    // sección Contacto + ícono del footer + botón/panel flotante
    expect(hrefs.length).toBeGreaterThanOrEqual(3);
    for (const href of hrefs) {
      const url = new URL(href);
      expect(url.hostname).toBe("mail.google.com");
      expect(url.searchParams.get("to")).toBe("cral2204@gmail.com");
      expect(url.searchParams.get("view")).toBe("cm");
    }
  });

  test("en escritorio, Escríbeme abre Gmail web en una ventana emergente aparte", async ({
    page,
    context,
    isMobile,
  }) => {
    test.skip(isMobile, "en móvil abre la app de Gmail (intent), no una pestaña");
    await context.route("https://mail.google.com/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<title>Gmail simulado</title>" })
    );
    // Registra cómo se invoca window.open sin alterar su comportamiento.
    await page.addInitScript(() => {
      const original = window.open.bind(window);
      (window as unknown as { __opens: unknown[][] }).__opens = [];
      window.open = (...args: Parameters<typeof window.open>) => {
        (window as unknown as { __opens: unknown[][] }).__opens.push(args);
        return original(...args);
      };
    });
    await enter(page);
    await page.locator("#contact").scrollIntoViewIfNeeded();

    const [popup] = await Promise.all([
      context.waitForEvent("page"),
      page.locator("#contact").getByRole("link", { name: "Escríbeme" }).click(),
    ]);
    await popup.waitForLoadState();
    const url = new URL(popup.url());
    expect(url.hostname).toBe("mail.google.com");
    expect(url.searchParams.get("to")).toBe("cral2204@gmail.com");
    expect(url.searchParams.get("su")).toContain("portafolio");

    // Se pidió como ventana emergente con tamaño propio (no como una pestaña más).
    const opens = await page.evaluate(
      () => (window as unknown as { __opens: [string, string, string][] }).__opens
    );
    expect(opens).toHaveLength(1);
    const [openedUrl, target, features] = opens[0];
    expect(openedUrl).toContain("mail.google.com");
    expect(target).toBe("gmail-compose");
    expect(features).toMatch(/popup=yes/);
    expect(features).toMatch(/width=\d+,height=\d+/);
    // y la ventana de Gmail no puede controlar el portafolio
    expect(await popup.evaluate(() => window.opener)).toBeNull();
  });
});

test.describe("footer: proporciones", () => {
  test("nombre y frase tienen tamaños parejos, con aire y redes grandes", async ({ page }) => {
    await page.goto("/");
    await dismissGate(page);
    await page.locator("footer").scrollIntoViewIfNeeded();
    await page.waitForTimeout(2500); // termina la entrada en cascada de la frase

    const m = await page.evaluate(() => {
      const footer = document.querySelector("footer")!;
      const name = footer.querySelector("p:not([aria-label])") as HTMLElement;
      const quote = footer.querySelector("p[aria-label]") as HTMLElement;
      const icons = [...footer.querySelectorAll("svg")].map((s) => s.getBoundingClientRect());
      const iconRow = icons[0];
      const nb = name.getBoundingClientRect();
      const qb = quote.getBoundingClientRect();
      const lastIcon = icons[icons.length - 1];
      return {
        nameSize: parseFloat(getComputedStyle(name).fontSize),
        quoteSize: parseFloat(getComputedStyle(quote).fontSize),
        iconSize: iconRow.width,
        iconCount: icons.length,
        gapNameIcons: iconRow.top - nb.bottom,
        gapIconsQuote: qb.top - lastIcon.bottom,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });

    // La frase es apenas un escalón mayor que el nombre: simétrica, sin dominar.
    expect(m.quoteSize).toBeGreaterThanOrEqual(m.nameSize);
    expect(m.quoteSize / m.nameSize).toBeLessThanOrEqual(1.4);
    // Redes sociales grandes (≥ 28 px) y los cuatro íconos presentes.
    expect(m.iconSize).toBeGreaterThanOrEqual(28);
    expect(m.iconCount).toBe(4);
    // Separación clara entre nombre, íconos y frase.
    expect(m.gapNameIcons).toBeGreaterThanOrEqual(16);
    expect(m.gapIconsQuote).toBeGreaterThanOrEqual(16);
    expect(m.overflow).toBeLessThanOrEqual(0);
  });
});

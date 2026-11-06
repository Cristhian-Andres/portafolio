import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import sharp from "sharp";

type LoggedEvent = {
  event: string;
  audience?: string;
  gate_step?: string;
  hasCallback: boolean;
};

/**
 * Registra en sessionStorage todo lo que se empuja a `dataLayer`. La página se recarga al
 * elegir un botón, así que el registro sobrevive y permite comprobar que el evento salió ANTES.
 */
async function logDataLayer(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { dataLayer: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    const original = w.dataLayer.push.bind(w.dataLayer);
    w.dataLayer.push = (...items: Record<string, unknown>[]) => {
      const log = JSON.parse(sessionStorage.getItem("__dl") || "[]");
      for (const item of items) {
        log.push({
          event: item.event,
          audience: item.audience,
          gate_step: item.gate_step,
          hasCallback: typeof item.eventCallback === "function",
        });
      }
      sessionStorage.setItem("__dl", JSON.stringify(log));
      return original(...items);
    };
  });
}

const readLog = (page: Page): Promise<LoggedEvent[]> =>
  page.evaluate(() => JSON.parse(sessionStorage.getItem("__dl") || "[]"));

/** Espera a que la recarga ocurra de verdad (tipo de navegación = reload). */
async function expectReloaded(page: Page) {
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
}

/** Tras desbloquear se ve TODO, desde el principio: sin introducción, sin contenido inerte, arriba. */
async function expectFullSiteVisible(page: Page) {
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".gate-veil")).toHaveCount(0);
  await expect(page.locator("div[inert]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Cristhian");
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0); // siempre desde el inicio
  for (const id of ["about", "experience", "skills", "education", "projects", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await page.locator("#skills").scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
  await expect(page.locator('a[aria-label="Escríbeme por correo"]')).toBeAttached();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
}

const recruiter = (page: Page) => page.locator('[data-gate-answer="recruiter"]');
const curious = (page: Page) => page.locator('[data-gate-answer="curious"]');

/**
 * Camino real de «reducir movimiento»: la introducción muestra la pregunta de inmediato.
 * Sirve para probar el flujo de botones, eventos y recarga sin esperar la animación completa.
 */
async function openQuestionFast(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(recruiter(page)).toBeEnabled();
}

test.describe("introducción: perfil → carga → corte → pregunta", () => {
  test("el CV se escribe con su indicador de carga, se corta y aparece la pregunta con dos botones", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __stages: string[] };
      w.__stages = [];
      new MutationObserver(() => {
        const el = document.querySelector("[data-stage]");
        const value = el?.getAttribute("data-stage");
        if (value && w.__stages[w.__stages.length - 1] !== value) w.__stages.push(value);
      }).observe(document, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-stage"],
      });
    });

    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(page.locator("div[inert]")).toHaveCount(1); // el sitio queda detrás, inerte

    // Sin botón para saltar: solo carga. Con indicador y barra de progreso.
    await expect(page.getByRole("button", { name: /saltar/i })).toHaveCount(0);
    await expect(dialog.getByText("Cargando perfil…")).toBeVisible();
    await expect(dialog.getByRole("progressbar", { name: /progreso de carga/i })).toBeVisible();
    await expect(dialog.locator(".animate-spin")).toBeVisible();

    // Los botones de respuesta aún no responden: primero se «escribe» el perfil.
    await expect(recruiter(page)).toBeDisabled();
    await expect(curious(page)).toBeDisabled();
    await expect(dialog.getByText("Analytics Engineer / IT Analyst")).toBeVisible({ timeout: 10_000 });

    // Después de cargar viene el corte y, por último, la pregunta (el indicador desaparece).
    await expect(recruiter(page)).toBeEnabled({ timeout: 25_000 });
    await expect(curious(page)).toBeEnabled();
    await expect(dialog.getByText("Cargando perfil…")).toHaveCount(0);
    await expect(recruiter(page)).toContainText("Soy reclutador");
    await expect(curious(page)).toContainText("chismoso");
    await expect(page.getByRole("heading", { name: /qué haces aquí/i })).toHaveCSS("opacity", "1");

    const stages = await page.evaluate(() => (window as unknown as { __stages: string[] }).__stages);
    expect(stages).toEqual(["typing", "cut", "question"]);
  });

  test("bajo el nombre dice «Process Automation Engineer» (y no «Analytics Engineer»)", async ({
    page,
  }) => {
    await page.goto("/");
    const role = page.locator("[data-intro-role]");
    await expect(role).toBeVisible();
    await expect(role).toHaveText(/process automation engineer/i);
    const card = page.getByRole("dialog").locator("article");
    await expect(card.getByText(/^analytics engineer$/i)).toHaveCount(0);
  });

  test("en pantalla chica la pregunta y los dos botones caben sin desbordar", async ({ page }) => {
    await openQuestionFast(page);

    // Espera a que termine de acomodarse la hoja: posición estable.
    let previous = "";
    await expect
      .poll(
        async () => {
          const now = JSON.stringify(await recruiter(page).boundingBox());
          const settled = now === previous;
          previous = now;
          return settled;
        },
        { timeout: 25_000 }
      )
      .toBe(true);

    const viewport = page.viewportSize()!;
    for (const button of [recruiter(page), curious(page)]) {
      const box = (await button.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(box.height).toBeGreaterThanOrEqual(40); // cómodo para el dedo
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("introducción: la pregunta solo muestra el título y los dos botones", () => {
  test("título sin emoji, sin frases de relleno ni nota de privacidad", async ({ page }) => {
    await openQuestionFast(page);
    const dialog = page.getByRole("dialog");
    const heading = dialog.getByRole("heading", { name: /qué haces aquí/i });
    await expect(heading).toHaveText("¿Qué haces aquí?");
    await expect(dialog.getByText(/elijas lo que elijas/i)).toHaveCount(0);
    await expect(dialog.getByText(/te muestro todo mi potencial/i)).toHaveCount(0);
    await expect(dialog.getByText(/solo cuento/i)).toHaveCount(0);
    await expect(dialog.getByText(/datos personales/i)).toHaveCount(0);
    await expect(recruiter(page)).toHaveText("Soy reclutador 🕵️");
    await expect(curious(page)).toHaveText("Ando de chismoso 👀");
  });

  test("con menos contenido, el título y los botones siguen centrados y dentro de la hoja", async ({
    page,
  }) => {
    await openQuestionFast(page);
    await page.waitForTimeout(800);
    const card = (await page.getByRole("dialog").locator("article").boundingBox())!;
    const heading = (await page.getByRole("heading", { name: /qué haces aquí/i }).boundingBox())!;
    for (const box of [heading, (await recruiter(page).boundingBox())!, (await curious(page).boundingBox())!]) {
      expect(box.x).toBeGreaterThanOrEqual(card.x);
      expect(box.x + box.width).toBeLessThanOrEqual(card.x + card.width);
      expect(box.y).toBeGreaterThanOrEqual(card.y);
      expect(box.y + box.height).toBeLessThanOrEqual(card.y + card.height);
    }
    // el bloque ocupa la parte baja de la hoja, bajo el corte: el título va antes que los botones
    const first = (await recruiter(page).boundingBox())!;
    const second = (await curious(page).boundingBox())!;
    expect(heading.y + heading.height).toBeLessThan(first.y);
    expect(first.y + first.height).toBeLessThan(second.y);
  });
});

test.describe("introducción: siempre toda blanca, sin importar el tema del sitio", () => {
  /** Promedio de color de una franja de la pantalla (0–255 por canal). */
  async function mean(page: Page, clip: { x: number; y: number; width: number; height: number }) {
    const { data, info } = await sharp(await page.screenshot({ clip }))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const sum = [0, 0, 0];
    for (let i = 0; i < data.length; i += 3) {
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
    }
    const n = info.width * info.height;
    return sum.map((s) => s / n);
  }

  for (const theme of ["dark", "light"] as const) {
    test(`con el sitio en tema ${theme}: el fondo que rodea la hoja es blanco puro`, async ({
      page,
    }) => {
      await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
      await page.goto("/");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.locator("html")).toHaveClass(theme === "dark" ? /dark/ : /^(?!.*dark)/);
      // Sin esperas: el fondo blanco debe estar completo desde el primer cuadro (sin destello oscuro).

      const viewport = page.viewportSize()!;
      const card = (await page.getByRole("dialog").locator("article").boundingBox())!;
      const strips = [
        { x: 0, y: 0, width: viewport.width, height: Math.max(8, Math.floor(card.y) - 6) }, // arriba de la hoja
        { x: 0, y: Math.ceil(card.y + card.height) + 6, width: viewport.width, height: Math.max(8, viewport.height - Math.ceil(card.y + card.height) - 6) }, // abajo
        { x: 0, y: 0, width: 10, height: viewport.height }, // borde izquierdo
        { x: viewport.width - 10, y: 0, width: 10, height: viewport.height }, // borde derecho
      ];
      for (const [index, strip] of strips.entries()) {
        if (strip.width <= 0 || strip.height <= 0) continue;
        const [r, g, b] = await mean(page, strip);
        // Arriba no llega la sombra: blanco casi puro. Abajo y a los lados llega la sombra muy tenue de la hoja
        // (hasta ~3 niveles de 255, imperceptible); lo que se descarta aquí es cualquier fondo oscuro del tema.
        const floor = index === 0 ? 254 : 251;
        expect(Math.min(r, g, b), JSON.stringify(strip)).toBeGreaterThanOrEqual(floor);
      }
    });
  }

  test("la hoja no tiene marco de foco alrededor (solo los botones lo muestran al enfocarse)", async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused(); // el foco entra al diálogo (accesibilidad)…
    await expect(dialog).toHaveCSS("outline-style", "none"); // …pero sin dibujar un marco alrededor de la hoja
  });

  test("el fondo blanco cubre toda la pantalla hasta el último píxel del borde", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    const viewport = page.viewportSize()!;
    const box = (await page.locator("[data-intro-gate]").boundingBox())!;
    expect(box.x).toBeLessThanOrEqual(0);
    expect(box.y).toBeLessThanOrEqual(0);
    expect(box.x + box.width).toBeGreaterThanOrEqual(viewport.width);
    expect(box.y + box.height).toBeGreaterThanOrEqual(viewport.height);
  });

  test("fondo y hoja usan los colores blancos fijos, no los del tema", async ({ page }) => {
    await page.goto("/");
    const gate = page.locator("[data-intro-gate]");
    await expect(gate).toBeVisible();
    await expect(gate).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(page.getByRole("dialog").locator("article")).toHaveCSS(
      "background-color",
      "rgb(255, 255, 255)"
    );
    await expect(gate).toHaveCSS("color-scheme", "light");
  });

  test("la pregunta con sus botones tampoco se tiñe de oscuro", async ({ page }) => {
    await openQuestionFast(page);
    await page.waitForTimeout(600);
    const viewport = page.viewportSize()!;
    const [r, g, b] = await mean(page, { x: 0, y: 0, width: viewport.width, height: 30 });
    expect(Math.min(r, g, b)).toBeGreaterThanOrEqual(253);
    // Tailwind v4 devuelve los colores en lab(); se convierten a RGB para compararlos.
    const [hr, hg, hb] = await page
      .getByRole("heading", { name: /qué haces aquí/i })
      .evaluate((el) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = getComputedStyle(el).color;
        ctx.fillRect(0, 0, 1, 1);
        return Array.from(ctx.getImageData(0, 0, 1, 1).data);
      });
    expect(Math.abs(hr - 15)).toBeLessThanOrEqual(8); // slate-900: casi negro azulado, no el blanco del tema oscuro
    expect(Math.abs(hg - 23)).toBeLessThanOrEqual(8);
    expect(Math.abs(hb - 42)).toBeLessThanOrEqual(8);
  });
});

test.describe("medición con Google Tag Manager + recarga", () => {
  const cases = [
    {
      name: "Soy reclutador",
      pick: recruiter,
      event: "gate_recruiter_click",
      audience: "recruiter",
      other: "gate_curious_click",
    },
    {
      name: "Ando de chismoso",
      pick: curious,
      event: "gate_curious_click",
      audience: "curious",
      other: "gate_recruiter_click",
    },
  ] as const;

  for (const c of cases) {
    test(`«${c.name}»: envía ${c.event}, recarga y muestra todo desde el inicio`, async ({ page }) => {
      await logDataLayer(page);
      await openQuestionFast(page);

      await c.pick(page).click();
      await expectReloaded(page);
      await expectFullSiteVisible(page);

      const log = await readLog(page);
      const events = log.map((e) => e.event);

      // 1) se contó la visita y el clic del botón correcto (y no el del otro)
      expect(events).toContain("gate_view");
      expect(events).toContain(c.event);
      expect(events).not.toContain(c.other);
      expect(events).not.toContain("gate_skip_intro"); // ya no existe esa acción
      const click = log.find((e) => e.event === c.event)!;
      expect(click.audience).toBe(c.audience);
      expect(click.gate_step).toBe("question");
      // 2) incluye `eventCallback`: GTM avisa cuando terminó de enviar y entonces se recarga
      expect(click.hasCallback).toBe(true);
      // 3) el clic se registró antes de recargar, y la página recargada no vuelve a contar visita
      expect(events.filter((e) => e === c.event)).toHaveLength(1);
      expect(events.filter((e) => e === "gate_view")).toHaveLength(1);
    });
  }

  test("sin importar qué botón pulse, el resultado visible es idéntico", async ({ browser }) => {
    const snapshots: string[] = [];
    for (const c of cases) {
      const context = await browser.newContext({ reducedMotion: "reduce" });
      const page = await context.newPage();
      await page.goto("/");
      await expect(c.pick(page)).toBeEnabled();
      await c.pick(page).click();
      await expectReloaded(page);
      await expectFullSiteVisible(page);
      snapshots.push(
        await page.evaluate(() =>
          [...document.querySelectorAll("main section")].map((s) => s.id).join(",")
        )
      );
      await context.close();
    }
    expect(snapshots[0]).toBe(snapshots[1]);
    expect(snapshots[0]).toContain("skills");
  });

  test("tras elegir, la recarga inmediata muestra todo; una carga posterior vuelve a mostrar la introducción", async ({
    page,
  }) => {
    await logDataLayer(page);
    await openQuestionFast(page);
    await curious(page).click();
    await expectReloaded(page);
    await expectFullSiteVisible(page);

    // Una recarga dentro del margen (la que desbloquea) sigue mostrando todo.
    await page.reload();
    await expectFullSiteVisible(page);

    // Pasado el margen, recargar vuelve a mostrar la introducción (y cuenta otra visita).
    await page.evaluate(() => {
      const key = "portfolio-gatekeeper";
      const saved = JSON.parse(sessionStorage.getItem(key)!);
      saved.state.answeredAt = Date.now() - 60_000;
      sessionStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(recruiter(page)).toBeEnabled(); // los botones aparecen y se pueden pulsar
    await expect(curious(page)).toBeEnabled();
    const views = (await readLog(page)).filter((e) => e.event === "gate_view");
    expect(views).toHaveLength(2);
  });

  test("REGRESIÓN: una pestaña con la respuesta de la versión anterior guardada sí ve la introducción y los botones", async ({
    page,
  }) => {
    // Es el estado que dejaba el gato: respondió «normal» y nunca vencía durante la sesión.
    await page.addInitScript(() =>
      sessionStorage.setItem(
        "portfolio-gatekeeper",
        JSON.stringify({ state: { hasAnswered: true, audience: "normal" }, version: 0 })
      )
    );
    await openQuestionFast(page);
    await expect(recruiter(page)).toBeVisible();
    await expect(curious(page)).toBeVisible();
  });

  test("recargar varias veces seguidas siempre muestra la introducción con sus botones", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (let i = 0; i < 3; i++) {
      await page.goto("/");
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(recruiter(page)).toBeEnabled();
      await page.reload(); // recarga manual sin haber elegido nada
    }
  });

  test("Escape cierra sin elegir: evento gate_dismiss y también desbloquea todo", async ({ page }) => {
    await logDataLayer(page);
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expectReloaded(page);
    await expectFullSiteVisible(page);
    const dismiss = (await readLog(page)).find((e) => e.event === "gate_dismiss");
    expect(dismiss?.audience).toBe("unknown");
  });

  test("mientras se envía el evento el botón muestra «Desbloqueando…» y no admite otro clic", async ({
    page,
  }) => {
    await logDataLayer(page);
    // Frena el temporizador para poder observar el estado intermedio.
    await page.addInitScript(() => {
      const realSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = ((fn: TimerHandler, ms?: number, ...args: unknown[]) =>
        realSetTimeout(fn, ms === 250 ? 4000 : ms, ...args)) as typeof window.setTimeout;
    });
    await openQuestionFast(page);
    await recruiter(page).click();
    await expect(recruiter(page)).toContainText("Desbloqueando");
    await expect(recruiter(page)).toBeDisabled();
    await expect(curious(page)).toBeDisabled();
    await curious(page).click({ force: true }).catch(() => undefined);
    await expectReloaded(page);
    const events = (await readLog(page)).map((e) => e.event);
    expect(events).not.toContain("gate_curious_click");
    expect(events.filter((e) => e === "gate_recruiter_click")).toHaveLength(1);
  });
});

test.describe("GTM sin configurar", () => {
  test("sin NEXT_PUBLIC_GTM_ID no se carga ningún script externo y dataLayer funciona", async ({
    page,
  }) => {
    const external: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) external.push(request.url());
    });
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    const hasLayer = await page.evaluate(() =>
      Array.isArray((window as unknown as { dataLayer?: unknown[] }).dataLayer)
    );
    expect(hasLayer).toBe(true);
    expect(external).toEqual([]);
  });
});

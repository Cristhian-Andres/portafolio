import { devices, expect, test, webkit } from "@playwright/test";
import type { Page } from "@playwright/test";
import sharp from "sharp";

type Clip = { x: number; y: number; width: number; height: number };

/** Pasa la introducción (Escape la desbloquea y recarga) y espera la página ya hidratada. */
async function enter(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".gate-veil")).toHaveCount(0);
  await expect(page.locator("div[inert]")).toHaveCount(0);
  await expect(page.getByTestId("water-ripple")).toBeAttached();
  await page.waitForTimeout(800); // deja asentarse las animaciones de entrada
}

const lens = (page: Page) => page.getByTestId("water-lens");
const sheen = (page: Page) => page.getByTestId("water-ripple");
const waterState = (page: Page) => sheen(page).getAttribute("data-state");
const backdrop = (page: Page) =>
  lens(page).evaluate((el) => (el as HTMLElement).style.backdropFilter);

/**
 * El párrafo del Hero (texto estático, sin animaciones propias) dividido en zonas para medir
 * LOCALIDAD dentro del mismo texto: cerca del toque, a media distancia y lejos.
 */
async function heroParagraph(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  const paragraph = page.locator("#home p").filter({ hasText: "Transformo datos" }).first();
  await expect(paragraph).toBeVisible();
  const box = (await paragraph.boundingBox())!;
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const zone = (dx: number, width: number): Clip => ({
    x: Math.max(0, Math.round(cx + dx - width / 2)),
    y: Math.floor(box.y) - 6,
    width,
    height: Math.ceil(box.height) + 12,
  });
  const whole: Clip = {
    x: Math.max(0, Math.floor(box.x) - 20),
    y: Math.max(0, Math.floor(box.y) - 10),
    width: Math.ceil(box.width) + 40,
    height: Math.ceil(box.height) + 20,
  };
  return { box, cx, cy, whole, near: zone(0, 110), mid: zone(-210, 110), far: zone(230, 110) };
}

async function pixels(page: Page, clip: Clip) {
  return sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
}

/** Cuánto cambió una imagen respecto de otra: media por canal y % de píxeles muy distintos. */
function compare(a: Buffer, b: Buffer) {
  let sum = 0;
  let changed = 0;
  const n = a.length / 3;
  for (let i = 0; i < a.length; i += 3) {
    const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
    sum += d / 3;
    if (d > 60) changed++;
  }
  return { mean: sum / n, changedPct: (100 * changed) / n };
}

/** Píxeles de brillo dibujados (solo el respaldo sin refracción los usa de verdad). */
const sheenStats = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="water-ripple"]') as HTMLCanvasElement;
    const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    let max = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 0) {
        lit++;
        if (data[i] > max) max = data[i];
      }
    }
    return { lit, max };
  });

test.describe("agua local: refracción real (Chrome, Edge, Android)", () => {
  test("el lente cubre toda la pantalla, no captura clics y en reposo no tiene filtro", async ({
    page,
  }) => {
    await enter(page);
    await expect(sheen(page)).toHaveAttribute("data-mode", "refraction");
    await expect(lens(page)).toHaveAttribute("aria-hidden", "true");
    await expect(lens(page)).toHaveCSS("pointer-events", "none");
    await expect(lens(page)).toHaveCSS("position", "fixed");

    const box = (await lens(page).boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);

    expect(await waterState(page)).toBe("idle");
    expect(await backdrop(page)).toBe("none"); // en reposo no cuesta nada ni toca el texto
  });

  test("un clic deforma SOLO lo que toca: el texto cercano cambia y el de 210 px o más, no", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    const p = await heroParagraph(page);
    const base = {
      near: await pixels(page, p.near),
      mid: await pixels(page, p.mid),
      far: await pixels(page, p.far),
    };

    await page.mouse.click(p.cx, p.cy);
    await expect.poll(() => backdrop(page)).toContain("water-ripple-filter"); // el filtro se enciende
    // Se mide de inmediato: la marca dura menos de un segundo.
    const near = compare(base.near, await pixels(page, p.near));
    const mid = compare(base.mid, await pixels(page, p.mid));
    const far = compare(base.far, await pixels(page, p.far));

    expect(near.mean).toBeGreaterThan(0.5); // se nota donde se toca…
    expect(near.mean).toBeLessThan(8); // …y es sutil
    expect(mid.mean).toBeLessThan(0.3); // a 210 px no llega nada
    expect(far.mean).toBeLessThan(0.3);
    expect(mid.changedPct).toBe(0);
    expect(far.changedPct).toBe(0);
  });

  test("NO se propaga: pasado un instante tampoco aparecen ondas en lo lejano", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    const p = await heroParagraph(page);
    const baseFar = await pixels(page, p.far);
    const baseMid = await pixels(page, p.mid);
    const farthest: number[] = [];

    await page.mouse.click(p.cx, p.cy);
    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(120);
      farthest.push(
        Math.max(
          compare(baseFar, await pixels(page, p.far)).mean,
          compare(baseMid, await pixels(page, p.mid)).mean
        )
      );
    }
    // en ningún momento llega algo a las zonas alejadas (una onda viajera las habría alcanzado)
    for (const value of farthest) expect(value).toBeLessThan(0.3);
  });

  test("la estela del mouse deforma lo que cruza y no lo que queda lejos del camino", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    const p = await heroParagraph(page);
    const badge = page.locator("#home p").first(); // la etiqueta «whoami», lejos del párrafo
    const bbox = (await badge.boundingBox())!;
    const awayClip: Clip = {
      x: Math.floor(bbox.x),
      y: Math.floor(bbox.y) - 4,
      width: Math.ceil(bbox.width),
      height: Math.ceil(bbox.height) + 8,
    };
    const baseWhole = await pixels(page, p.whole);
    const baseAway = await pixels(page, awayClip);

    await page.mouse.move(p.box.x + 10, p.cy);
    for (let i = 1; i <= 14; i++) {
      await page.mouse.move(p.box.x + 10 + i * (p.box.width / 16), p.cy + Math.sin(i / 2) * 4);
      await page.waitForTimeout(12);
    }
    const along = compare(baseWhole, await pixels(page, p.whole));
    const away = compare(baseAway, await pixels(page, awayClip));
    expect(along.mean).toBeGreaterThan(0.2); // deforma lo que cruza
    expect(along.mean).toBeLessThan(6);
    expect(away.mean).toBeLessThan(0.4); // lo que no toca queda intacto
  });

  test("la marca desaparece sola y todo vuelve EXACTAMENTE a como estaba", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    const p = await heroParagraph(page);
    const base = await pixels(page, p.whole);

    await page.mouse.click(p.cx, p.cy);
    await expect.poll(() => waterState(page)).toBe("active");
    // dura poco: en pocos segundos ya no queda nada y el filtro se retira
    await expect.poll(() => waterState(page), { timeout: 6_000 }).toBe("idle");

    expect(await backdrop(page)).toBe("none");
    const after = compare(base, await pixels(page, p.whole));
    expect(after.mean).toBeLessThan(0.3);
    expect(after.changedPct).toBe(0);
  });

  test("es liviano: poco JavaScript por cuadro", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await page.mouse.click(600, 420);
    await expect.poll(() => waterState(page), { timeout: 6_000 }).toBe("idle");
    const frameMs = Number(await sheen(page).getAttribute("data-frame-ms"));
    expect(frameMs).toBeGreaterThan(0);
    expect(frameMs).toBeLessThan(8); // presupuesto: la mitad de un cuadro a 60 fps
  });

  test("no estorba: los clics atraviesan el lente y la página sigue funcionando", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    await page.mouse.move(300, 300, { steps: 5 }); // marca activa encima del contenido
    await page.getByRole("link", { name: "Educación" }).first().click();
    await expect(page).toHaveURL(/#education$/);
    await expect(page.locator("#education")).toBeInViewport();
  });

  test("con el tema claro también deforma, solo donde se toca", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await enter(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    const p = await heroParagraph(page);
    const baseNear = await pixels(page, p.near);
    const baseFar = await pixels(page, p.far);
    await page.mouse.click(p.cx, p.cy);
    expect(compare(baseNear, await pixels(page, p.near)).mean).toBeGreaterThan(0.5);
    expect(compare(baseFar, await pixels(page, p.far)).mean).toBeLessThan(0.3);
  });

  test("funciona también encima de la introducción", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.mouse.move(100, 200);
    await page.mouse.move(400, 260, { steps: 10 });
    await expect.poll(() => waterState(page)).toBe("active");
    expect(await backdrop(page)).toContain("water-ripple-filter");
  });

  test("con «reducir movimiento» no existe nada del efecto", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("water-ripple")).toHaveCount(0);
    await expect(page.getByTestId("water-lens")).toHaveCount(0);
    await expect(page.locator("#water-ripple-filter")).toHaveCount(0);
  });

  test("sin errores de consola al usarlo", async ({ page, isMobile }) => {
    test.skip(isMobile);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await enter(page);
    for (let i = 0; i < 6; i++) await page.mouse.move(100 + i * 180, 200 + i * 60, { steps: 8 });
    await page.mouse.click(700, 400);
    await page.waitForTimeout(400);
    expect(errors).toEqual([]);
  });
});

test.describe("agua local: según el motor del navegador", () => {
  test("Safari REAL (WebKit en iPhone): solo un brillo sutil y local, sin filtro y sin deformar", async ({
    baseURL,
    isMobile,
  }) => {
    test.skip(isMobile, "se lanza su propio WebKit una sola vez");
    const browser = await webkit.launch();
    const context = await browser.newContext({ ...devices["iPhone 15"] });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".gate-veil")).toHaveCount(0);
    await expect(page.locator("div[inert]")).toHaveCount(0);
    await page.waitForTimeout(800);

    await expect(sheen(page)).toHaveAttribute("data-mode", "sheen"); // detecta que no puede deformar
    // Se toca en el centro de la ventana VISIBLE (en un iPhone el párrafo del Hero queda bajo el pliegue).
    const viewport = page.viewportSize()!;
    await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
    await expect.poll(() => waterState(page)).toBe("active");

    expect(await backdrop(page)).toBe("none"); // nunca se activa el filtro
    // WebKit sin interfaz dibuja pocos cuadros por segundo: se espera al primer dibujo del brillo.
    await expect
      .poll(async () => (await sheenStats(page)).lit, { timeout: 20_000 })
      .toBeGreaterThan(5); // el brillo sí aparece…
    expect((await sheenStats(page)).max).toBeLessThanOrEqual(Math.round(0.12 * 255) + 1); // …y es discreto
    // …y es local: en una pantalla de iPhone ocupa menos del 10 % (las ondas anteriores cubrían ~la mitad)
    const canvasArea = await sheen(page).evaluate((c) => (c as HTMLCanvasElement).width * (c as HTMLCanvasElement).height);
    expect((await sheenStats(page)).lit / canvasArea).toBeLessThan(0.1);
    expect(await backdrop(page)).toBe("none");
    await browser.close();
  });

  test("REGRESIÓN: Chromium con identificación de iPhone (modo dispositivo de Chrome) SÍ deforma", async ({
    browser,
    baseURL,
    isMobile,
  }) => {
    test.skip(isMobile);
    // Es lo que ocurre al elegir «iPhone» en las herramientas de desarrollo de Chrome:
    // la identificación dice Safari, pero el motor sigue siendo Chromium.
    const context = await browser.newContext({
      userAgent: devices["iPhone 15"].userAgent,
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();
    await page.goto(baseURL!);
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".gate-veil")).toHaveCount(0);
    await expect(page.locator("div[inert]")).toHaveCount(0);
    await page.waitForTimeout(800);

    await expect(sheen(page)).toHaveAttribute("data-mode", "refraction");
    const p = await heroParagraph(page);
    const base = await pixels(page, p.near);
    await page.mouse.click(p.cx, p.cy);
    await expect.poll(() => backdrop(page)).toContain("water-ripple-filter");
    expect(compare(base, await pixels(page, p.near)).mean).toBeGreaterThan(0.5);
    await context.close();
  });
});

test.describe("agua local con el dedo (móvil)", () => {
  /** Toques reales (no simulados con JS) mediante el protocolo de Chrome. */
  async function finger(page: Page) {
    const cdp = await page.context().newCDPSession(page);
    const send = (
      type: "touchStart" | "touchMove" | "touchEnd",
      points: { x: number; y: number }[]
    ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
    return {
      down: (x: number, y: number) => send("touchStart", [{ x, y }]),
      move: (x: number, y: number) => send("touchMove", [{ x, y }]),
      up: () => send("touchEnd", []),
      cdp,
    };
  }

  test("tocar deforma el texto donde está el dedo y no el que queda lejos", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    await expect(sheen(page)).toHaveAttribute("data-mode", "refraction"); // Chrome de Android
    const p = await heroParagraph(page);
    const baseNear = await pixels(page, p.near);
    const baseFar = await pixels(page, p.far);
    const touch = await finger(page);

    await touch.down(p.cx, p.cy);
    await expect.poll(() => waterState(page)).toBe("active");
    const near = compare(baseNear, await pixels(page, p.near));
    const far = compare(baseFar, await pixels(page, p.far));
    expect(near.mean).toBeGreaterThan(0.5);
    expect(near.mean).toBeLessThan(8);
    expect(far.mean).toBeLessThan(0.3); // lo que el dedo no toca queda intacto
    await touch.up();
  });

  test("arrastrar el dedo deja una marca solo por donde pasa", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const p = await heroParagraph(page);
    // Zonas del párrafo: la izquierda (por donde pasa el dedo) y la derecha (adonde no llega).
    // Cada una se captura por separado: las capturas del móvil tienen más píxeles que unidades CSS.
    const left: Clip = { ...p.whole, width: Math.round(p.whole.width * 0.4) };
    const right: Clip = {
      ...p.whole,
      x: p.whole.x + Math.round(p.whole.width * 0.75),
      width: Math.round(p.whole.width * 0.25),
    };
    const baseLeft = await pixels(page, left);
    const baseRight = await pixels(page, right);
    const touch = await finger(page);

    // el dedo recorre solo el primer cuarto del párrafo (la marca llega ~100 px más allá del dedo)
    await touch.down(p.box.x + 8, p.cy);
    for (let i = 1; i <= 5; i++) {
      await touch.move(p.box.x + 8 + i * (p.box.width / 20), p.cy + Math.sin(i) * 4);
      await page.waitForTimeout(12);
    }
    const afterLeft = compare(baseLeft, await pixels(page, left));
    const afterRight = compare(baseRight, await pixels(page, right));
    expect(afterLeft.mean).toBeGreaterThan(0.2); // por donde pasó el dedo, hay marca
    expect(afterRight.mean).toBeLessThan(0.3); // donde no llegó, nada
    expect(afterRight.changedPct).toBe(0);
    await touch.up();
  });

  test("el dedo sigue pudiendo hacer scroll: el efecto no lo bloquea", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const touch = await finger(page);
    const before = await page.evaluate(() => window.scrollY);
    await touch.cdp.send("Input.synthesizeScrollGesture", {
      x: 200,
      y: 600,
      yDistance: -400, // desliza el dedo hacia arriba: la página baja
      speed: 800,
    });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 150);
  });

  test("tocar un botón funciona aunque haya marca encima", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const touch = await finger(page);
    await touch.down(200, 300);
    await touch.up();
    await page.getByRole("button", { name: "Abrir menú" }).tap();
    await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeVisible();
  });

  test("la marca del dedo desaparece sola y el texto vuelve exactamente a su sitio", async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const p = await heroParagraph(page);
    const base = await pixels(page, p.whole);
    const touch = await finger(page);
    await touch.down(p.cx, p.cy);
    await touch.up();
    await expect.poll(() => waterState(page), { timeout: 6_000 }).toBe("idle");
    expect(await backdrop(page)).toBe("none");
    expect(compare(base, await pixels(page, p.whole)).changedPct).toBeLessThan(0.3);
  });
});

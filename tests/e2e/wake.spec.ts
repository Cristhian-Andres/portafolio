import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

/** Pasa la introducción (Escape la desbloquea y recarga) y espera la página ya hidratada. */
async function enter(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.locator(".gate-veil")).toHaveCount(0);
  await expect(page.locator("div[inert]")).toHaveCount(0);
  await expect(page.getByTestId("water-wake")).toBeAttached();
  await page.waitForTimeout(800);
}

/** Lo que hay dibujado en el lienzo de la estela: píxeles encendidos, color medio, caja y grosor. */
const wakeStats = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="water-wake"]') as HTMLCanvasElement;
    const scale = canvas.width / window.innerWidth;
    const { data, width, height } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    let maxAlpha = 0;
    let minX = Infinity;
    let maxX = -1;
    let minY = Infinity;
    let maxY = -1;
    const colLit = new Map<number, number>();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = data[i + 3];
        if (a < 4) continue;
        lit++;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        if (a > maxAlpha) maxAlpha = a;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        colLit.set(x, (colLit.get(x) ?? 0) + 1);
      }
    }
    const thickest = Math.max(0, ...colLit.values());
    return {
      lit,
      rgb: lit ? [r / lit, g / lit, b / lit].map((v) => Math.round(v)) : [0, 0, 0],
      maxAlpha: maxAlpha / 255,
      box: lit ? { x0: minX / scale, x1: maxX / scale, y0: minY / scale, y1: maxY / scale } : null,
      thickness: thickest / scale, // grosor máximo en px CSS
    };
  });

/**
 * Espera a que la línea esté dibujada y devuelve esa medición. Se sondea porque el dibujo ocurre en el
 * siguiente cuadro y en un equipo lento (CI) tarda más; la línea vive menos de 1 s, así que se mira de inmediato.
 */
async function seenWake(page: Page) {
  let seen: Awaited<ReturnType<typeof wakeStats>> | undefined;
  await expect
    .poll(
      async () => {
        const s = await wakeStats(page);
        if (s.lit > 20) seen = s;
        return s.lit > 20;
      },
      { intervals: [20, 20, 30], timeout: 4_000 }
    )
    .toBe(true);
  return seen!;
}

/** Recorre una línea horizontal con el mouse en un solo gesto (no depende de la velocidad del equipo). */
async function sweep(page: Page, y = 300, from = 300, to = 640) {
  await page.mouse.move(from, y);
  await page.mouse.move(to, y, { steps: 16 });
}

test.describe("estela de barco: línea fina por donde pasa el puntero", () => {
  test("el lienzo de la estela no estorba: cubre la pantalla, no captura clics, oculto a lectores", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    const wake = page.getByTestId("water-wake");
    await expect(wake).toHaveCSS("pointer-events", "none");
    await expect(wake).toHaveCSS("position", "fixed");
    await expect(wake).toHaveAttribute("aria-hidden", "true");
    const box = (await wake.boundingBox())!;
    expect(Math.round(box.width)).toBe(page.viewportSize()!.width);
    expect(Math.round(box.height)).toBe(page.viewportSize()!.height);
    expect((await wakeStats(page)).lit).toBe(0); // en reposo no hay nada dibujado
  });

  test("con la pantalla OSCURA la línea es BLANCA, fina y sutil", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await sweep(page);
    const s = await seenWake(page);
    expect(s.lit).toBeGreaterThan(20);
    expect(s.rgb.every((v) => v >= 250)).toBe(true);
    expect(s.maxAlpha).toBeLessThanOrEqual(0.5);
    expect(s.thickness).toBeLessThanOrEqual(4);
  });

  test("con la pantalla CLARA la línea es NEGRA", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.addInitScript(() => localStorage.setItem("theme", "light"));
    await enter(page);
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await sweep(page);
    const s = await seenWake(page);
    expect(s.lit).toBeGreaterThan(20);
    expect(s.rgb.every((v) => v <= 5)).toBe(true);
    expect(s.maxAlpha).toBeLessThanOrEqual(0.5);
    expect(s.thickness).toBeLessThanOrEqual(4);
  });

  test("sobre la introducción (siempre blanca) la línea es NEGRA", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await page.goto("/");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByTestId("water-wake")).toBeAttached();
    await sweep(page, 260, 200, 560);
    const s = await seenWake(page);
    expect(s.lit).toBeGreaterThan(20);
    expect(s.rgb.every((v) => v <= 5)).toBe(true);
  });

  test("marca la dirección: queda sobre el camino recorrido y llega hasta el puntero", async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile);
    await enter(page);
    await sweep(page, 300, 300, 640);
    const s = await seenWake(page);
    expect(s.box).not.toBeNull();
    expect(s.box!.x1).toBeGreaterThan(600);
    expect(s.box!.x1).toBeLessThanOrEqual(645);
    expect(s.box!.x0).toBeGreaterThan(295);
    expect(s.box!.y0).toBeGreaterThan(294);
    expect(s.box!.y1).toBeLessThan(306);
  });

  test("en diagonal la línea sigue el recorrido en ambos ejes", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await page.mouse.move(300, 200);
    // un solo gesto con pasos: no depende de la carga de la máquina (la línea vive menos de 1 s)
    await page.mouse.move(620, 424, { steps: 16 });
    const s = await seenWake(page);
    expect(s.box!.x1 - s.box!.x0).toBeGreaterThan(40);
    expect(s.box!.y1 - s.box!.y0).toBeGreaterThan(30);
  });

  test("se desvanece sola en menos de un segundo y medio", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await sweep(page);
    await seenWake(page);
    // se desvanece sola: en menos de 1,5 s (más margen para un equipo lento) no queda nada
    await expect.poll(async () => (await wakeStats(page)).lit, { timeout: 4_000 }).toBe(0);
    await expect(page.getByTestId("water-wake")).toHaveAttribute("data-live", "false");
  });

  test("un clic quieto NO deja línea", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await page.mouse.click(500, 400);
    await page.waitForTimeout(100);
    expect((await wakeStats(page)).lit).toBe(0);
  });

  test("los clics atraviesan la línea y la página sigue funcionando", async ({ page, isMobile }) => {
    test.skip(isMobile);
    await enter(page);
    await sweep(page);
    await page.getByRole("link", { name: "Educación" }).first().click();
    await expect(page).toHaveURL(/#education$/);
  });
});

test.describe("estela de barco con el dedo (móvil)", () => {
  test("arrastrar el dedo dibuja la línea; al soltar se desvanece", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const cdp = await page.context().newCDPSession(page);
    const send = (type: "touchStart" | "touchMove" | "touchEnd", pts: { x: number; y: number }[]) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: pts });

    await send("touchStart", [{ x: 60, y: 300 }]);
    for (let i = 1; i <= 14; i++) {
      await send("touchMove", [{ x: 60 + i * 18, y: 300 + Math.sin(i / 2) * 6 }]);
    }
    const s = await seenWake(page);
    expect(s.lit).toBeGreaterThan(20);
    expect(s.rgb.every((v) => v >= 250)).toBe(true);
    expect(s.maxAlpha).toBeLessThanOrEqual(0.5);
    expect(s.thickness).toBeLessThanOrEqual(4);
    await send("touchEnd", []);
    await expect.poll(async () => (await wakeStats(page)).lit, { timeout: 4_000 }).toBe(0);
  });

  test("un toque simple no deja línea", async ({ page, isMobile }) => {
    test.skip(!isMobile, "solo móvil");
    await enter(page);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 200, y: 400 }] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(100);
    expect((await wakeStats(page)).lit).toBe(0);
  });
});

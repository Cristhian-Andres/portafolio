import { describe, expect, it } from "vitest";
import { TrailField } from "@/lib/trailField";
import {
  DEFAULT_DISPLACEMENT,
  DisplacementEncoder,
  NEUTRAL,
  decodeDisplacement,
} from "@/lib/rippleMap";
import { supportsSvgBackdropFilter } from "@/lib/browserSupport";

const W = 61;
const H = 41;

function encode(field: TrailField, options: Partial<typeof DEFAULT_DISPLACEMENT> = {}) {
  const encoder = new DisplacementEncoder(field.width, field.height);
  const out = new Uint8ClampedArray(field.width * field.height * 4);
  const peak = encoder.encode(field, out, options);
  return { out, peak };
}
const px = (out: Uint8ClampedArray, x: number, y: number, channel: 0 | 1, maxPx = DEFAULT_DISPLACEMENT.maxPx) =>
  decodeDisplacement(out[(y * W + x) * 4 + channel], maxPx);

function stepMany(field: TrailField, n: number) {
  for (let i = 0; i < n; i++) field.step();
}

describe("mapa de deformación: sin marca", () => {
  it("es completamente neutro (128,128,128,255): no deforma nada", () => {
    const { out, peak } = encode(new TrailField(W, H));
    expect(peak).toBe(0);
    for (let i = 0; i < out.length; i += 4) {
      expect([out[i], out[i + 1], out[i + 2], out[i + 3]]).toEqual([NEUTRAL, NEUTRAL, NEUTRAL, 255]);
    }
  });

  it("la suavización repetida no inventa deformación donde no hay agua", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.2, 3);
    stepMany(field, 3);
    const { out } = encode(field, { smoothing: 4 });
    expect(Math.abs(px(out, 2, 2, 0))).toBeLessThan(0.01); // lejos de la gota
    expect(Math.abs(px(out, W - 3, H - 3, 1))).toBeLessThan(0.01);
  });

  it("el byte neutro equivale a ~0 px (sin desvío visible)", () => {
    expect(Math.abs(decodeDisplacement(NEUTRAL, 3))).toBe(0);
    expect(Math.abs(decodeDisplacement(NEUTRAL, 3))).toBeLessThan(0.01);
  });

  it("tras desvanecerse la marca vuelve a ser neutro (no queda deformación residual)", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.6, 2.4);
    let guard = 0;
    while (!field.isCalm && guard++ < 2000) field.step();
    const { peak } = encode(field);
    expect(peak).toBeLessThan(0.25); // < ~0,25 px: imperceptible
  });
});

describe("mapa de deformación: control del desplazamiento", () => {
  it("NUNCA supera el tope, ni con gotas enormes ni con muchas a la vez", () => {
    const field = new TrailField(W, H);
    for (let i = 0; i < 30; i++) field.stamp(5 + ((i * 7) % 50), 5 + ((i * 11) % 30), -4, 3);
    for (const maxPx of [1, 2, 3, 5]) {
      for (let f = 0; f < 6; f++) {
        field.step();
        const { out, peak } = encode(field, { gain: 40, maxPx }); // ganancia exagerada a propósito
        expect(peak).toBeLessThanOrEqual(maxPx + 1e-9);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            expect(Math.abs(px(out, x, y, 0, maxPx))).toBeLessThanOrEqual(maxPx + 0.03);
            expect(Math.abs(px(out, x, y, 1, maxPx))).toBeLessThanOrEqual(maxPx + 0.03);
          }
        }
      }
    }
  });

  it("el tope es suave: duplicar la pendiente no duplica la deformación cuando ya es grande", () => {
    const small = new TrailField(W, H);
    const big = new TrailField(W, H);
    small.stamp(30, 20, -0.4, 3.2);
    big.stamp(30, 20, -4, 3.2);
    stepMany(small, 6);
    stepMany(big, 6);
    const a = encode(small).peak;
    const b = encode(big).peak;
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(a * 10); // la gota es 10× mayor, la deformación NO
    expect(b).toBeLessThanOrEqual(DEFAULT_DISPLACEMENT.maxPx);
    expect(DEFAULT_DISPLACEMENT.maxPx).toBeLessThanOrEqual(3); // el tope es sutil por diseño (la marca es local y breve)
  });

  it("la deformación típica de un clic es leve (legible): bien por debajo de un carácter", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.2, 3); // el toque del componente
    let strongest = 0;
    for (let f = 0; f < 30; f++) {
      field.step();
      strongest = Math.max(strongest, encode(field).peak);
    }
    expect(strongest).toBeGreaterThan(0.7); // se nota
    expect(strongest).toBeLessThan(1.6); // y es sutil: ni siquiera roza el tope de 2 px
  });
});

describe("mapa de deformación: forma", () => {
  it("es simétrico: a la izquierda y a la derecha de la gota empuja en sentidos opuestos", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.2, 3);
    stepMany(field, 7);
    const { out } = encode(field);
    for (const d of [3, 5, 8]) {
      expect(px(out, 30 - d, 20, 0)).toBeCloseTo(-px(out, 30 + d, 20, 0), 1);
      expect(px(out, 30, 20 - d, 1)).toBeCloseTo(-px(out, 30, 20 + d, 1), 1);
    }
    // y en el eje horizontal no hay empuje vertical
    expect(Math.abs(px(out, 30 - 6, 20, 1))).toBeLessThan(0.05);
  });

  it("es suave: celdas vecinas no saltan bruscamente (las letras se curvan, no se rompen)", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.2, 3); // el splash del componente
    let worst = 0;
    for (let f = 0; f < 40; f++) {
      field.step();
      const { out } = encode(field);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 2; x++) {
          worst = Math.max(worst, Math.abs(px(out, x + 1, y, 0) - px(out, x, y, 0)));
        }
      }
    }
    // < 0,6 px de diferencia entre celdas contiguas (8 px de pantalla): sin cizallar las letras
    expect(worst).toBeLessThan(0.6);
  });

  it("los bordes del mapa son siempre neutros", () => {
    const field = new TrailField(W, H);
    field.stamp(2, 2, -3, 3);
    stepMany(field, 5);
    const { out } = encode(field);
    for (let x = 0; x < W; x++) {
      expect(out[(0 * W + x) * 4]).toBe(NEUTRAL);
      expect(out[((H - 1) * W + x) * 4]).toBe(NEUTRAL);
    }
    for (let y = 0; y < H; y++) {
      expect(out[(y * W) * 4]).toBe(NEUTRAL);
      expect(out[(y * W + W - 1) * 4]).toBe(NEUTRAL);
    }
  });

  it("el canal azul es neutro y la opacidad total (condición de feDisplacementMap)", () => {
    const field = new TrailField(W, H);
    field.stamp(30, 20, -1.5, 2.4);
    stepMany(field, 5);
    const { out } = encode(field);
    for (let i = 0; i < out.length; i += 4) {
      expect(out[i + 2]).toBe(NEUTRAL);
      expect(out[i + 3]).toBe(255);
    }
  });

  it("rechaza un codificador de otro tamaño que la malla", () => {
    const encoder = new DisplacementEncoder(10, 10);
    expect(() => encoder.encode(new TrailField(20, 20), new Uint8ClampedArray(20 * 20 * 4))).toThrow(
      RangeError
    );
  });
});

describe("supportsSvgBackdropFilter: señales del motor (anulan la identificación)", () => {
  const IPHONE_UA =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

  it("REGRESIÓN: el modo dispositivo «iPhone» de Chrome (motor Chromium con identificación de Safari) SÍ deforma", () => {
    expect(supportsSvgBackdropFilter(IPHONE_UA, { webkitRequestFileSystem: true })).toBe(true);
    expect(supportsSvgBackdropFilter(IPHONE_UA, { userAgentData: true })).toBe(true);
  });

  it("un iPhone real (WebKit, sin señales de Chromium) NO deforma", () => {
    expect(supportsSvgBackdropFilter(IPHONE_UA, {})).toBe(false);
    expect(supportsSvgBackdropFilter(IPHONE_UA, { webkitRequestFileSystem: false, userAgentData: false })).toBe(false);
  });

  it("Firefox nunca, aunque trajera señales", () => {
    const ff = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0";
    expect(supportsSvgBackdropFilter(ff, { webkitRequestFileSystem: true })).toBe(false);
    expect(supportsSvgBackdropFilter("... FxiOS/130 ...", { userAgentData: true })).toBe(false);
  });

  it("Chromium sin interfaz (sin «Chrome/» limpio) se reconoce por el motor", () => {
    expect(supportsSvgBackdropFilter("ua rara", { webkitRequestFileSystem: true })).toBe(true);
  });
});

describe("supportsSvgBackdropFilter", () => {
  const cases: [string, string, boolean][] = [
    ["Chrome escritorio", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", true],
    ["Edge", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0", true],
    ["Chrome de Android", "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", true],
    ["Samsung Internet", "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36", true],
    ["Chromium headless", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0.0.0 Safari/537.36", true],
    ["Safari macOS", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15", false],
    ["Safari iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", false],
    ["Chrome en iPhone (usa WebKit)", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1", false],
    ["Edge en iPhone (usa WebKit)", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/130.0.0.0 Version/17.0 Mobile/15E148 Safari/604.1", false],
    ["Firefox", "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:130.0) Gecko/20100101 Firefox/130.0", false],
    ["iPad", "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1", false],
    ["cadena vacía", "", false],
  ];
  for (const [name, ua, expected] of cases) {
    it(`${name}: ${expected ? "sí" : "no"}`, () => {
      expect(supportsSvgBackdropFilter(ua)).toBe(expected);
    });
  }
});

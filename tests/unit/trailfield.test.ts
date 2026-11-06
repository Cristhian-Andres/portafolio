import { describe, expect, it } from "vitest";
import {
  DEFAULT_DECAY,
  DEFAULT_LIMIT,
  SLEEP_PEAK,
  TrailField,
  wakeStrength,
} from "@/lib/trailField";
import type { RippleStyle } from "@/lib/trailField";

const STYLE: RippleStyle = {
  highlight: [200, 255, 120],
  shadow: [0, 10, 0],
  maxAlpha: 0.5,
  gain: 2,
};

function steps(field: TrailField, n: number) {
  for (let i = 0; i < n; i++) field.step();
}

function maxAbs(field: TrailField): number {
  let max = 0;
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) max = Math.max(max, Math.abs(field.heightAt(x, y)));
  }
  return max;
}

/** Mayor distancia (en celdas) desde (cx, cy) a una celda con |altura| > umbral. */
function reach(field: TrailField, cx: number, cy: number, threshold: number): number {
  let far = 0;
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      if (Math.abs(field.heightAt(x, y)) > threshold) far = Math.max(far, Math.hypot(x - cx, y - cy));
    }
  }
  return far;
}

describe("TrailField: creación", () => {
  it("rechaza mallas demasiado pequeñas", () => {
    expect(() => new TrailField(2, 10)).toThrow(RangeError);
    expect(() => new TrailField(10, 2)).toThrow(RangeError);
  });

  it("empieza en calma", () => {
    const field = new TrailField(20, 20);
    expect(field.peak).toBe(0);
    expect(field.isCalm).toBe(true);
    expect(maxAbs(field)).toBe(0);
  });
});

describe("TrailField: la marca", () => {
  it("un toque hunde el agua justo donde cae y menos a su alrededor", () => {
    const field = new TrailField(41, 41);
    field.stamp(20, 20, -1, 2);
    expect(field.heightAt(20, 20)).toBeCloseTo(-1, 5);
    expect(field.heightAt(20, 20)).toBeLessThan(field.heightAt(22, 20));
    expect(field.heightAt(20, 20)).toBeLessThan(field.heightAt(20, 23));
  });

  it("también puede elevar el agua", () => {
    const field = new TrailField(41, 41);
    field.stamp(20, 20, 1, 2);
    expect(field.heightAt(20, 20)).toBeGreaterThan(0.9);
  });

  it("es LOCAL: lejos del punto tocado no pasa nada", () => {
    const field = new TrailField(81, 61);
    field.stamp(40, 30, -1.2, 3);
    // radio 3 → la campana llega a unas 6 celdas; más allá, nada
    expect(reach(field, 40, 30, 1e-4)).toBeLessThanOrEqual(13);
    expect(Math.abs(field.heightAt(70, 30))).toBe(0);
    expect(Math.abs(field.heightAt(40, 55))).toBe(0);
  });

  it("al marcar se activa de inmediato (isCalm = falso sin esperar al primer paso)", () => {
    const field = new TrailField(60, 40);
    expect(field.isCalm).toBe(true);
    field.stamp(30, 20, -1, 2);
    expect(field.isCalm).toBe(false);
    expect(field.peak).toBeGreaterThan(0.9);
  });

  it("una marca fuera de la malla no la agita", () => {
    const field = new TrailField(60, 40);
    field.stamp(-50, -50, -3, 2);
    field.stamp(500, 500, -3, 2);
    expect(field.isCalm).toBe(true);
  });

  it("nunca toca los bordes", () => {
    const field = new TrailField(30, 20);
    field.stamp(0, 0, -3, 3);
    field.stamp(29, 19, -3, 3);
    steps(field, 20);
    for (let x = 0; x < field.width; x++) {
      expect(field.heightAt(x, 0)).toBe(0);
      expect(field.heightAt(x, field.height - 1)).toBe(0);
    }
    for (let y = 0; y < field.height; y++) {
      expect(field.heightAt(0, y)).toBe(0);
      expect(field.heightAt(field.width - 1, y)).toBe(0);
    }
  });

  it("pasar muchas veces por el mismo sitio no se acumula sin límite (tope)", () => {
    const field = new TrailField(41, 41);
    for (let i = 0; i < 200; i++) field.stamp(20, 20, -0.9, 2);
    expect(maxAbs(field)).toBeLessThanOrEqual(DEFAULT_LIMIT + 1e-6);
    expect(field.heightAt(20, 20)).toBeCloseTo(-DEFAULT_LIMIT, 5);
  });
});

describe("TrailField: NO es una onda (no viaja ni rebota)", () => {
  it("la marca no se expande por la pantalla: su alcance apenas crece al relajarse", () => {
    const field = new TrailField(121, 81);
    field.stamp(60, 40, -1.2, 3);
    const initial = reach(field, 60, 40, 1e-3);
    let widest = initial;
    for (let i = 0; i < 60; i++) {
      field.step();
      widest = Math.max(widest, reach(field, 60, 40, 1e-3));
    }
    // se ensancha un poco al relajarse, pero nunca viaja: a lo sumo ~4 celdas (≈ 32 px)
    expect(widest - initial).toBeLessThan(5);
    expect(widest).toBeLessThan(20); // ~160 px: lejos del ancho de la pantalla
  });

  it("nunca hay anillos que se alejen: nada aparece lejos del punto en ningún momento", () => {
    const field = new TrailField(171, 100);
    field.stamp(85, 50, -1.2, 3);
    for (let i = 0; i < 80; i++) {
      field.step();
      expect(Math.abs(field.heightAt(85 + 30, 50))).toBeLessThan(1e-3); // 240 px a la derecha
      expect(Math.abs(field.heightAt(85, 50 + 25))).toBeLessThan(1e-3); // 200 px abajo
    }
  });

  it("no rebota: el centro nunca cambia de signo (una onda oscilaría)", () => {
    const field = new TrailField(81, 61);
    field.stamp(40, 30, -1.2, 3);
    for (let i = 0; i < 80; i++) {
      field.step();
      expect(field.heightAt(40, 30)).toBeLessThanOrEqual(0);
    }
  });

  it("solo decae: el pico nunca aumenta tras la marca", () => {
    const field = new TrailField(81, 61);
    field.stamp(40, 30, -1.2, 3);
    let previous = field.peak;
    for (let i = 0; i < 80; i++) {
      field.step();
      expect(field.peak).toBeLessThanOrEqual(previous + 1e-9);
      previous = field.peak;
    }
  });
});

describe("TrailField: desaparece rápido", () => {
  it("se apaga en ~1 s (menos de 75 pasos) y no antes de ~0,4 s", () => {
    const field = new TrailField(171, 100);
    field.stamp(85, 50, -1.2, 3);
    let n = 0;
    while (!field.isCalm && n < 600) {
      field.step();
      n++;
    }
    expect(field.isCalm).toBe(true);
    expect(field.peak).toBeLessThan(SLEEP_PEAK);
    expect(n).toBeGreaterThan(24); // se ve: no desaparece de golpe
    expect(n).toBeLessThan(75); // pero tampoco se queda: ~1 s
  });

  it("la mitad se va en unos 150 ms (decaimiento exponencial)", () => {
    const field = new TrailField(81, 61, { relax: 0 });
    field.stamp(40, 30, -1, 2);
    steps(field, 7);
    expect(Math.abs(field.heightAt(40, 30))).toBeCloseTo(Math.pow(DEFAULT_DECAY, 7), 4);
    expect(Math.abs(field.heightAt(40, 30))).toBeLessThan(0.62); // tras ~117 ms queda menos de dos tercios
  });

  it("una estela larga también se apaga en ~1 s tras el último trazo", () => {
    const field = new TrailField(171, 100);
    for (let i = 0; i < 40; i++) field.stamp(30 + i * 3, 50, -wakeStrength(3), 2.2);
    let n = 0;
    while (!field.isCalm && n < 600) {
      field.step();
      n++;
    }
    expect(n).toBeLessThan(75);
  });

  it("clear() deja el agua completamente quieta", () => {
    const field = new TrailField(30, 30);
    field.stamp(15, 15, -2, 3);
    steps(field, 3);
    field.clear();
    expect(maxAbs(field)).toBe(0);
    expect(field.isCalm).toBe(true);
    steps(field, 10);
    expect(maxAbs(field)).toBe(0);
  });

  it("sin desvanecimiento (decay = 1) la marca no se apaga: es el decay lo que la quita", () => {
    const field = new TrailField(41, 41, { decay: 1, relax: 0 });
    field.stamp(20, 20, -1, 2);
    steps(field, 200);
    expect(field.isCalm).toBe(false);
  });
});

describe("TrailField: dibujo del brillo", () => {
  it("en calma no dibuja nada", () => {
    const field = new TrailField(20, 20);
    const out = new Uint8ClampedArray(20 * 20 * 4);
    expect(field.render(out, STYLE)).toBe(false);
    expect(out.every((v) => v === 0)).toBe(true);
  });

  it("dibuja solo cerca de la marca, con luz y sombra, sin pasar la opacidad máxima", () => {
    const field = new TrailField(100, 60);
    field.stamp(50, 30, -1.2, 3);
    steps(field, 3);
    const out = new Uint8ClampedArray(100 * 60 * 4);
    expect(field.render(out, STYLE)).toBe(true);

    let lights = 0;
    let shades = 0;
    let maxAlpha = 0;
    let farthest = 0;
    for (let i = 0; i < out.length; i += 4) {
      const a = out[i + 3];
      if (a === 0) continue;
      const p = i / 4;
      farthest = Math.max(farthest, Math.hypot((p % 100) - 50, Math.floor(p / 100) - 30));
      maxAlpha = Math.max(maxAlpha, a);
      if (out[i] === STYLE.highlight[0] && out[i + 1] === STYLE.highlight[1]) lights++;
      else if (out[i] === STYLE.shadow[0] && out[i + 1] === STYLE.shadow[1]) shades++;
    }
    expect(lights).toBeGreaterThan(5);
    expect(shades).toBeGreaterThan(5);
    expect(maxAlpha).toBeLessThanOrEqual(Math.round(STYLE.maxAlpha * 255));
    expect(farthest).toBeLessThan(16); // el brillo también es local (~130 px)
  });

  it("no pinta los píxeles de los bordes", () => {
    const field = new TrailField(40, 30);
    field.stamp(2, 2, -3, 3);
    const out = new Uint8ClampedArray(40 * 30 * 4);
    field.render(out, STYLE);
    for (let x = 0; x < 40; x++) {
      expect(out[(0 * 40 + x) * 4 + 3]).toBe(0);
      expect(out[(29 * 40 + x) * 4 + 3]).toBe(0);
    }
    for (let y = 0; y < 30; y++) {
      expect(out[(y * 40 + 0) * 4 + 3]).toBe(0);
      expect(out[(y * 40 + 39) * 4 + 3]).toBe(0);
    }
  });

  it("al desvanecerse no queda rastro que dibujar", () => {
    const field = new TrailField(120, 70);
    field.stamp(60, 35, -1.2, 3);
    let n = 0;
    while (!field.isCalm && n < 600) {
      field.step();
      n++;
    }
    const out = new Uint8ClampedArray(120 * 70 * 4);
    field.render(out, STYLE);
    let maxAlpha = 0;
    for (let i = 3; i < out.length; i += 4) maxAlpha = Math.max(maxAlpha, out[i]);
    expect(maxAlpha).toBeLessThanOrEqual(8); // ≤ ~3 % de opacidad: imperceptible
  });
});

describe("wakeStrength", () => {
  it("crece con la velocidad, con un mínimo audible y un tope", () => {
    expect(wakeStrength(0)).toBeGreaterThan(0.1);
    expect(wakeStrength(5)).toBeGreaterThan(wakeStrength(1));
    expect(wakeStrength(1000)).toBe(0.55);
  });
});

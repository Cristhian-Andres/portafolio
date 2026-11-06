import { describe, expect, it } from "vitest";
import {
  WAKE_BREAK_GAP_MS,
  WAKE_BREAK_JUMP_PX,
  WAKE_HEAD_ALPHA,
  WAKE_HEAD_WIDTH,
  WAKE_LIFETIME_MS,
  WAKE_MAX_LENGTH_PX,
  WAKE_MIN_STEP_PX,
  WAKE_TAIL_WIDTH,
  WakeTrail,
  wakeRgb,
} from "@/lib/wakeTrail";

/** Recorre una línea recta de izquierda a derecha, un punto cada `step` px y `dt` ms. */
function drawLine(trail: WakeTrail, count: number, step = 10, dt = 16, y = 100, t0 = 0, x0 = 50) {
  for (let i = 0; i < count; i++) trail.add(x0 + i * step, y, t0 + i * dt);
  return t0 + (count - 1) * dt;
}

describe("color de la estela", () => {
  it("blanca sobre fondo oscuro y negra sobre fondo claro", () => {
    expect(wakeRgb(true)).toBe("255,255,255");
    expect(wakeRgb(false)).toBe("0,0,0");
  });
});

describe("WakeTrail: vida", () => {
  it("vacía: no hay nada que dibujar ni está viva", () => {
    const trail = new WakeTrail();
    expect(trail.segments(0)).toEqual([]);
    expect(trail.isAlive(0)).toBe(false);
  });

  it("un solo punto no dibuja nada (hace falta un recorrido)", () => {
    const trail = new WakeTrail();
    trail.add(100, 100, 0);
    expect(trail.segments(0)).toEqual([]);
  });

  it("con un recorrido dibuja una línea y está viva", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 8);
    expect(trail.segments(now).length).toBeGreaterThan(5);
    expect(trail.isAlive(now)).toBe(true);
  });

  it("se desvanece por completo pasado su tiempo de vida", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 8);
    expect(trail.isAlive(now + WAKE_LIFETIME_MS - 1)).toBe(true);
    expect(trail.isAlive(now + WAKE_LIFETIME_MS + 1)).toBe(false);
    expect(trail.segments(now + WAKE_LIFETIME_MS + 1)).toEqual([]);
  });

  it("dura menos de un segundo", () => {
    expect(WAKE_LIFETIME_MS).toBeLessThan(1000);
    expect(WAKE_LIFETIME_MS).toBeGreaterThan(400);
  });

  it("prune quita lo vencido y clear() lo borra todo", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 10);
    expect(trail.size).toBe(10);
    trail.prune(now + WAKE_LIFETIME_MS - 40); // los primeros puntos ya vencieron, los últimos no
    expect(trail.size).toBeLessThan(10);
    trail.prune(now + WAKE_LIFETIME_MS * 2);
    expect(trail.size).toBe(0);
    drawLine(trail, 5);
    trail.clear();
    expect(trail.size).toBe(0);
  });
});

describe("WakeTrail: forma de la línea", () => {
  it("la cabeza llega exactamente al puntero", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 8, 10, 16, 120, 0, 50);
    const segments = trail.segments(now);
    const head = segments[segments.length - 1];
    expect(head.x1).toBe(50 + 7 * 10);
    expect(head.y1).toBe(120);
  });

  it("es una curva continua: cada tramo empieza donde terminó el anterior", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 12);
    const segments = trail.segments(now);
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].x0).toBeCloseTo(segments[i - 1].x1, 6);
      expect(segments[i].y0).toBeCloseTo(segments[i - 1].y1, 6);
    }
  });

  it("sigue la dirección del movimiento: va de la cola (vieja) a la cabeza (nueva)", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 10); // de izquierda a derecha
    const segments = trail.segments(now);
    expect(segments[0].x0).toBeLessThan(segments[segments.length - 1].x1);
    // y también hacia abajo-derecha
    const diagonal = new WakeTrail();
    for (let i = 0; i < 8; i++) diagonal.add(50 + i * 8, 50 + i * 8, i * 16);
    const d = diagonal.segments(7 * 16);
    expect(d[d.length - 1].y1).toBeGreaterThan(d[0].y0);
    expect(d[d.length - 1].x1).toBeGreaterThan(d[0].x0);
  });

  it("se afina hacia atrás: más grueso y más opaco junto al puntero que en la cola", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 30, 8, 16); // ~0,5 s de recorrido
    const segments = trail.segments(now);
    const widths = segments.map((s) => s.width);
    const alphas = segments.map((s) => s.alpha);
    for (let i = 1; i < segments.length; i++) {
      expect(widths[i]).toBeGreaterThanOrEqual(widths[i - 1] - 1e-9);
      expect(alphas[i]).toBeGreaterThanOrEqual(alphas[i - 1] - 1e-9);
    }
    expect(widths[widths.length - 1]).toBeGreaterThan(widths[0] * 1.5);
    expect(alphas[alphas.length - 1]).toBeGreaterThan(alphas[0] * 1.5);
  });

  it("es fina y sutil: nunca pasa del grosor ni de la opacidad máximos", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 40);
    for (const s of trail.segments(now)) {
      expect(s.width).toBeLessThanOrEqual(WAKE_HEAD_WIDTH + 1e-9);
      expect(s.width).toBeGreaterThanOrEqual(WAKE_TAIL_WIDTH - 1e-9);
      expect(s.alpha).toBeLessThanOrEqual(WAKE_HEAD_ALPHA + 1e-9);
      expect(s.alpha).toBeGreaterThanOrEqual(0);
    }
    expect(WAKE_HEAD_WIDTH).toBeLessThanOrEqual(3); // «línea pequeña»
    expect(WAKE_HEAD_ALPHA).toBeLessThanOrEqual(0.5); // sutil
  });

  it("al pasar el tiempo la línea entera se vuelve más tenue y fina", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 12);
    const fresh = trail.segments(now);
    const later = trail.segments(now + WAKE_LIFETIME_MS / 2);
    const freshMax = Math.max(...fresh.map((s) => s.alpha));
    const laterMax = Math.max(...later.map((s) => s.alpha));
    expect(laterMax).toBeLessThan(freshMax);
    expect(Math.max(...later.map((s) => s.width))).toBeLessThan(Math.max(...fresh.map((s) => s.width)));
  });
});

describe("WakeTrail: la cola siempre se desvanece (sin cortes duros)", () => {
  it("con el mouse muy rápido (el largo máximo corta la cola) el extremo llega casi a cero", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 100, 12, 6); // 1200 px en 600 ms: el trazo supera el largo máximo
    const segments = trail.segments(now);
    const tail = segments[0];
    const head = segments[segments.length - 1];
    expect(tail.alpha).toBeLessThan(0.05); // casi invisible en la punta de la cola
    expect(tail.width).toBeLessThan(WAKE_TAIL_WIDTH + 0.6);
    expect(head.alpha).toBeGreaterThan(0.3); // y la cabeza sí se ve
    expect(head.width).toBeGreaterThan(1.8);
  });

  it("con un recorrido corto la cola también es más fina que la cabeza", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 8, 8, 16); // 56 px
    const segments = trail.segments(now);
    expect(segments[0].alpha).toBeLessThan(segments[segments.length - 1].alpha);
  });

  it("la opacidad baja de forma continua hacia la cola (sin saltos bruscos entre tramos)", () => {
    const trail = new WakeTrail();
    const now = drawLine(trail, 100, 12, 6);
    const alphas = trail.segments(now).map((s) => s.alpha);
    for (let i = 1; i < alphas.length; i++) expect(Math.abs(alphas[i] - alphas[i - 1])).toBeLessThan(0.06);
  });
});

describe("WakeTrail: trazos y límites", () => {
  it("ignora movimientos de menos de unos pocos píxeles (no amontona puntos)", () => {
    const trail = new WakeTrail();
    trail.add(100, 100, 0);
    for (let i = 1; i <= 20; i++) trail.add(100 + i * 0.1, 100, i); // se mueve 2 px en total
    expect(trail.size).toBeLessThanOrEqual(2);
    trail.add(100 + WAKE_MIN_STEP_PX + 1, 100, 30);
    expect(trail.size).toBeGreaterThanOrEqual(2);
  });

  it("una pausa larga empieza un trazo nuevo: no se unen con una línea", () => {
    const trail = new WakeTrail();
    drawLine(trail, 5, 10, 16, 100, 0, 50);
    const after = 5 * 16 + WAKE_BREAK_GAP_MS + 50;
    drawLine(trail, 5, 10, 16, 300, after, 400);
    const segments = trail.segments(after + 4 * 16);
    // ningún tramo une la zona y=100 con la zona y=300
    for (const s of segments) expect(Math.abs(s.y1 - s.y0)).toBeLessThan(50);
    expect(segments.some((s) => s.y1 === 100)).toBe(true);
    expect(segments.some((s) => s.y1 === 300)).toBe(true);
  });

  it("un salto enorme (p. ej. el puntero reaparece en otro sitio) también corta el trazo", () => {
    const trail = new WakeTrail();
    drawLine(trail, 5, 10, 16, 100, 0, 50);
    drawLine(trail, 5, 10, 16, 100, 5 * 16, 50 + WAKE_BREAK_JUMP_PX + 400);
    for (const s of trail.segments(10 * 16)) expect(Math.hypot(s.x1 - s.x0, s.y1 - s.y0)).toBeLessThan(WAKE_BREAK_JUMP_PX);
  });

  it("endStroke() separa los trazos aunque vayan seguidos", () => {
    const trail = new WakeTrail();
    drawLine(trail, 5, 10, 16, 100, 0, 50);
    trail.endStroke();
    drawLine(trail, 5, 10, 16, 140, 5 * 16, 50);
    for (const s of trail.segments(10 * 16)) expect(Math.abs(s.y1 - s.y0)).toBeLessThan(20);
  });

  it("aunque el mouse vaya muy rápido o lejos, la estela no se alarga sin fin", () => {
    const trail = new WakeTrail();
    drawLine(trail, 100, 12, 6); // 1200 px en 600 ms
    let length = 0;
    const segments = trail.segments(99 * 6);
    for (const s of segments) length += Math.hypot(s.x1 - s.x0, s.y1 - s.y0);
    expect(length).toBeLessThanOrEqual(WAKE_MAX_LENGTH_PX + 40);
    expect(length).toBeGreaterThan(100); // pero sí es una línea apreciable
  });

  it("endStroke sin puntos no rompe nada", () => {
    const trail = new WakeTrail();
    expect(() => {
      trail.endStroke();
      trail.endStroke();
    }).not.toThrow();
    expect(trail.isAlive(0)).toBe(false);
  });
});

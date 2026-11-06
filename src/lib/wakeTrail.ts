/**
 * Estela de barco: la línea fina que deja el puntero (o el dedo) al pasar.
 * Se afina hacia atrás (gruesa junto al puntero, casi invisible en la cola), se suaviza como una
 * curva y se desvanece en menos de un segundo. Marca la dirección del movimiento.
 *
 * Es pura (sin DOM): solo calcula qué segmentos hay que dibujar; el componente los pinta.
 */

export interface WakePoint {
  x: number;
  y: number;
  t: number;
}

/** Un tramo curvo listo para dibujar: de (x0,y0) a (x1,y1) con control (cx,cy). */
export interface WakeSegment {
  x0: number;
  y0: number;
  cx: number;
  cy: number;
  x1: number;
  y1: number;
  /** Grosor en píxeles CSS. */
  width: number;
  /** Opacidad 0–1. */
  alpha: number;
}

/** Cuánto vive la estela (ms). */
export const WAKE_LIFETIME_MS = 800;
/** Largo máximo de la estela (px): aunque el mouse vaya muy rápido, la línea no se alarga sin fin. */
export const WAKE_MAX_LENGTH_PX = 260;
/** Distancia mínima entre puntos (px): evita amontonar puntos cuando el puntero casi no se mueve. */
export const WAKE_MIN_STEP_PX = 2.5;
/** Un salto mayor que esto (px) empieza un trazo nuevo (no se une con una línea recta enorme). */
export const WAKE_BREAK_JUMP_PX = 180;
/** Una pausa mayor que esto (ms) empieza un trazo nuevo. */
export const WAKE_BREAK_GAP_MS = 140;
/** Grosor junto al puntero y en la cola (px). */
export const WAKE_HEAD_WIDTH = 2.2;
export const WAKE_TAIL_WIDTH = 0.25;
/** Opacidad junto al puntero: sutil, no debe estorbar la lectura. */
export const WAKE_HEAD_ALPHA = 0.45;

const clamp01 = (value: number) => (value < 0 ? 0 : value > 1 ? 1 : value);

/** Color de la línea: blanca sobre fondo oscuro, negra sobre fondo claro. Devuelve «r,g,b». */
export function wakeRgb(onDarkBackground: boolean): string {
  return onDarkBackground ? "255,255,255" : "0,0,0";
}

export class WakeTrail {
  private strokes: WakePoint[][] = [];

  /** ¿Queda algún trazo vivo? */
  isAlive(now: number): boolean {
    return this.strokes.some((stroke) => stroke.some((p) => now - p.t < WAKE_LIFETIME_MS));
  }

  /** Cierra el trazo actual (el siguiente punto empezará una línea nueva). */
  endStroke(): void {
    const last = this.strokes[this.strokes.length - 1];
    if (last && last.length > 0) this.strokes.push([]);
  }

  /** Agrega un punto del recorrido del puntero. */
  add(x: number, y: number, t: number): void {
    let stroke = this.strokes[this.strokes.length - 1];
    if (!stroke) {
      stroke = [];
      this.strokes.push(stroke);
    }
    const last = stroke[stroke.length - 1];
    if (last) {
      const distance = Math.hypot(x - last.x, y - last.y);
      if (t - last.t > WAKE_BREAK_GAP_MS || distance > WAKE_BREAK_JUMP_PX) {
        stroke = [];
        this.strokes.push(stroke);
      } else if (distance < WAKE_MIN_STEP_PX) {
        return;
      }
    }
    stroke.push({ x, y, t });
    this.limitLength(stroke);
    this.prune(t);
  }

  /** Quita lo que ya se desvaneció y los trazos vacíos. */
  prune(now: number): void {
    for (const stroke of this.strokes) {
      while (stroke.length > 0 && now - stroke[0].t >= WAKE_LIFETIME_MS) stroke.shift();
    }
    this.strokes = this.strokes.filter((stroke, index) => stroke.length > 0 || index === this.strokes.length - 1);
  }

  /** Borra todo. */
  clear(): void {
    this.strokes = [];
  }

  /** Cantidad de puntos vivos (útil para pruebas). */
  get size(): number {
    return this.strokes.reduce((sum, stroke) => sum + stroke.length, 0);
  }

  /** Tramos curvos a dibujar ahora: suaves, afinados hacia atrás y cada vez más tenues. */
  segments(now: number): WakeSegment[] {
    const out: WakeSegment[] = [];
    for (const stroke of this.strokes) {
      const n = stroke.length;
      if (n < 2) continue;
      const mid = (a: WakePoint, b: WakePoint) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

      // Distancia de cada punto a la cabeza (el punto más reciente): la cola siempre se afina hasta
      // cero al llegar al largo máximo, así no termina con un corte duro aunque el mouse vaya rápido.
      const fromHead = new Array<number>(n).fill(0);
      for (let i = n - 2; i >= 0; i--) {
        fromHead[i] = fromHead[i + 1] + Math.hypot(stroke[i + 1].x - stroke[i].x, stroke[i + 1].y - stroke[i].y);
      }

      for (let i = 0; i < n; i++) {
        const age = clamp01((now - stroke[i].t) / WAKE_LIFETIME_MS);
        if (age >= 1) continue;
        // «vida» del tramo: combina cuánto hace que se dibujó y qué tan lejos queda de la cabeza
        const fade = (1 - age) * (1 - clamp01(fromHead[i] / WAKE_MAX_LENGTH_PX));
        const width = WAKE_TAIL_WIDTH + (WAKE_HEAD_WIDTH - WAKE_TAIL_WIDTH) * Math.pow(fade, 1.2);
        const alpha = WAKE_HEAD_ALPHA * Math.pow(fade, 1.6);

        if (i === 0) {
          // arranque: del primer punto al punto medio con el siguiente
          const m = mid(stroke[0], stroke[1]);
          out.push({ x0: stroke[0].x, y0: stroke[0].y, cx: (stroke[0].x + m.x) / 2, cy: (stroke[0].y + m.y) / 2, x1: m.x, y1: m.y, width, alpha });
        } else if (i === n - 1) {
          // cabeza: del punto medio anterior hasta el puntero
          const m = mid(stroke[n - 2], stroke[n - 1]);
          out.push({ x0: m.x, y0: m.y, cx: (m.x + stroke[n - 1].x) / 2, cy: (m.y + stroke[n - 1].y) / 2, x1: stroke[n - 1].x, y1: stroke[n - 1].y, width, alpha });
        } else {
          // tramo suave: de un punto medio al siguiente, con el punto real como control
          const a = mid(stroke[i - 1], stroke[i]);
          const b = mid(stroke[i], stroke[i + 1]);
          out.push({ x0: a.x, y0: a.y, cx: stroke[i].x, cy: stroke[i].y, x1: b.x, y1: b.y, width, alpha });
        }
      }
    }
    return out;
  }

  /** Descarta los puntos más viejos hasta que el trazo no pase del largo máximo. */
  private limitLength(stroke: WakePoint[]): void {
    let length = 0;
    for (let i = stroke.length - 1; i > 0; i--) {
      length += Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y);
      if (length > WAKE_MAX_LENGTH_PX) {
        stroke.splice(0, i - 1);
        return;
      }
    }
  }
}

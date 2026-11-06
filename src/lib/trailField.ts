/**
 * Campo de «huella»: una superficie de agua que se hunde SOLO donde pasa el puntero o el dedo
 * y se relaja enseguida. A diferencia de una ecuación de onda, la perturbación NO viaja ni se
 * propaga por la pantalla: queda donde se estampó, se suaviza un poco y se desvanece.
 *
 * Es pura (sin DOM) para poder probarla: el componente solo la alimenta y la dibuja.
 */

export type RGB = readonly [number, number, number];

export interface RippleStyle {
  /** Color de las crestas (luz). */
  highlight: RGB;
  /** Color de los valles (sombra). */
  shadow: RGB;
  /** Opacidad máxima (0–1) para no tapar el contenido. */
  maxAlpha: number;
  /** Cuánto se exagera la pendiente al convertirla en luz. */
  gain: number;
}

/** Fuente de alturas que puede convertirse en mapa de deformación. */
export interface HeightSource {
  readonly width: number;
  readonly height: number;
  heightAt(x: number, y: number): number;
}

/** Por debajo de esta amplitud máxima la huella ya no se ve y la superficie está en calma. */
export const SLEEP_PEAK = 0.012;

/**
 * Cuánto de la huella queda tras cada paso de 1/60 s. Con 0,925 la mitad se va en ~150 ms, la parte
 * realmente visible dura ~0,4 s y en ~1 s ya no queda nada: «una marca que aparece donde tocas y
 * desaparece rápido».
 */
export const DEFAULT_DECAY = 0.925;

/** Cuánto se suaviza (se ensancha un poco) la huella en cada paso, como agua que se relaja. */
export const DEFAULT_RELAX = 0.12;

/** Tope de la altura acumulada: pasar muchas veces por el mismo sitio no se acumula sin límite. */
export const DEFAULT_LIMIT = 1.3;

export interface TrailOptions {
  decay?: number;
  relax?: number;
  limit?: number;
}

export class TrailField implements HeightSource {
  readonly width: number;
  readonly height: number;
  readonly decay: number;
  readonly relax: number;
  readonly limit: number;

  private cur: Float32Array;
  private tmp: Float32Array;
  private peakValue = 0;

  constructor(width: number, height: number, options: TrailOptions = {}) {
    if (width < 3 || height < 3) throw new RangeError("La malla debe ser de al menos 3×3 celdas");
    this.width = width;
    this.height = height;
    this.decay = options.decay ?? DEFAULT_DECAY;
    this.relax = options.relax ?? DEFAULT_RELAX;
    this.limit = options.limit ?? DEFAULT_LIMIT;
    this.cur = new Float32Array(width * height);
    this.tmp = new Float32Array(width * height);
  }

  /** Mayor |altura| de la superficie. */
  get peak(): number {
    return this.peakValue;
  }

  get isCalm(): boolean {
    return this.peakValue < SLEEP_PEAK;
  }

  heightAt(x: number, y: number): number {
    return this.cur[y * this.width + x];
  }

  /**
   * Hunde (strength < 0) o eleva (strength > 0) el agua alrededor de (x, y), en celdas.
   * Cae en forma de campana. Los bordes quedan siempre quietos y la altura nunca pasa de `limit`.
   */
  stamp(x: number, y: number, strength: number, radius = 2): void {
    const { width: w, height: h, cur, limit } = this;
    const reach = Math.ceil(radius * 2);
    const x0 = Math.max(1, Math.floor(x) - reach);
    const x1 = Math.min(w - 2, Math.ceil(x) + reach);
    const y0 = Math.max(1, Math.floor(y) - reach);
    const y1 = Math.min(h - 2, Math.ceil(y) + reach);
    const spread = 2 * radius * radius;
    let peak = this.peakValue;
    for (let j = y0; j <= y1; j++) {
      for (let i = x0; i <= x1; i++) {
        const d2 = (i - x) * (i - x) + (j - y) * (j - y);
        const index = j * w + i;
        const value = cur[index] + strength * Math.exp(-d2 / spread);
        const clamped = value > limit ? limit : value < -limit ? -limit : value;
        cur[index] = clamped;
        const magnitude = clamped < 0 ? -clamped : clamped;
        if (magnitude > peak) peak = magnitude;
      }
    }
    // La huella cuenta como activa de inmediato, sin esperar al siguiente paso.
    this.peakValue = peak;
  }

  /** Avanza 1/60 s: la huella se suaviza un poco y se desvanece. */
  step(): void {
    const { width: w, height: h, cur, tmp, decay, relax } = this;
    let peak = 0;
    for (let y = 1; y < h - 1; y++) {
      let i = y * w + 1;
      for (let x = 1; x < w - 1; x++, i++) {
        const average = (cur[i - 1] + cur[i + 1] + cur[i - w] + cur[i + w]) * 0.25;
        const value = (cur[i] * (1 - relax) + average * relax) * decay;
        tmp[i] = value;
        const magnitude = value < 0 ? -value : value;
        if (magnitude > peak) peak = magnitude;
      }
    }
    // Los bordes de `tmp` nunca se escriben: se quedan en 0.
    this.cur = tmp;
    this.tmp = cur;
    this.peakValue = peak;
  }

  /** Aplana la superficie por completo. */
  clear(): void {
    this.cur.fill(0);
    this.tmp.fill(0);
    this.peakValue = 0;
  }

  /**
   * Dibuja la superficie en `out` (RGBA, width×height). La luz viene de arriba a la izquierda:
   * las pendientes que miran hacia ella brillan y las contrarias oscurecen.
   * Devuelve si hay algún píxel visible.
   */
  render(out: Uint8ClampedArray, style: RippleStyle): boolean {
    const { width: w, height: h, cur } = this;
    const { highlight, shadow, maxAlpha, gain } = style;
    let visible = false;
    out.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const slope = (cur[i - 1] - cur[i + 1] + (cur[i - w] - cur[i + w])) * gain;
        const strength = Math.min(maxAlpha, slope < 0 ? -slope : slope);
        if (strength < 0.01) continue;
        const color = slope > 0 ? highlight : shadow;
        const o = i * 4;
        out[o] = color[0];
        out[o + 1] = color[1];
        out[o + 2] = color[2];
        out[o + 3] = Math.round(strength * 255);
        visible = true;
      }
    }
    return visible;
  }
}

/** Fuerza de la huella según la velocidad del puntero (en celdas por evento). */
export function wakeStrength(distanceInCells: number): number {
  return Math.min(0.55, 0.2 + distanceInCells * 0.05);
}

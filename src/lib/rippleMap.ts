import type { HeightSource } from "@/lib/trailField";

/**
 * Convierte la huella del agua en un «mapa de deformación» (RGBA) para `feDisplacementMap`:
 * R = desplazamiento horizontal, G = vertical, 128 = sin desplazamiento.
 *
 * Está pensado para que sea CONTROLADO: el desplazamiento nunca supera `maxPx` (tope suave con tanh,
 * sin recortes bruscos) y el mapa se suaviza para que las letras se curven en vez de romperse.
 */

export interface DisplacementOptions {
  /** Píxeles de desplazamiento por unidad de pendiente del agua. */
  gain: number;
  /** Desplazamiento máximo absoluto, en píxeles. Nunca se supera. */
  maxPx: number;
  /** Pasadas de suavizado 3×3: más pasadas, curvas más suaves. */
  smoothing: number;
}

/**
 * Valores medidos (ver tests) para una HUELLA LOCAL: un toque deforma ~1,2 px en un radio de ~60 px,
 * la estela rápida del mouse ~1,8 px, entre celdas vecinas (8 px) el salto queda bajo ~0,55 px y todo
 * desaparece en ~0,7 s. El tope de 3 px es solo una red de seguridad: con más ganancia el surco
 * satura el tope y las letras se cizallan; con menos, no se nota.
 */
export const DEFAULT_DISPLACEMENT: DisplacementOptions = { gain: 3.5, maxPx: 3, smoothing: 2 };

/** Byte que representa «sin desplazamiento». */
export const NEUTRAL = 128;

/** Desplazamiento en píxeles que representa un byte del mapa. */
export function decodeDisplacement(byte: number, maxPx: number): number {
  return ((byte - NEUTRAL) / 127) * maxPx;
}

export class DisplacementEncoder {
  readonly width: number;
  readonly height: number;
  private slopeX: Float32Array;
  private slopeY: Float32Array;
  private tempX: Float32Array;
  private tempY: Float32Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.slopeX = new Float32Array(width * height);
    this.slopeY = new Float32Array(width * height);
    this.tempX = new Float32Array(width * height);
    this.tempY = new Float32Array(width * height);
  }

  /**
   * Escribe el mapa en `out` (RGBA, width×height). Devuelve el mayor desplazamiento absoluto
   * (en píxeles) presente, útil para saber si el mapa es prácticamente neutro.
   */
  encode(
    field: HeightSource,
    out: Uint8ClampedArray,
    overrides: Partial<DisplacementOptions> = {}
  ): number {
    const options = { ...DEFAULT_DISPLACEMENT, ...overrides };
    if (field.width !== this.width || field.height !== this.height) {
      throw new RangeError("El codificador y la malla deben tener el mismo tamaño");
    }
    const { width: w, height: h } = this;
    let slopeX = this.slopeX;
    let slopeY = this.slopeY;
    const { gain, maxPx, smoothing } = options;

    // 1) pendiente del agua (diferencia central) en el interior de la malla
    slopeX.fill(0);
    slopeY.fill(0);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        slopeX[i] = field.heightAt(x - 1, y) - field.heightAt(x + 1, y);
        slopeY[i] = field.heightAt(x, y - 1) - field.heightAt(x, y + 1);
      }
    }

    // 2) suavizado: varias pasadas 3×3 (las letras se curvan en vez de cizallarse)
    let tempX = this.tempX;
    let tempY = this.tempY;
    for (let pass = 0; pass < smoothing; pass++) {
      tempX.fill(0);
      tempY.fill(0);
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let sx = 0;
          let sy = 0;
          for (let j = -1; j <= 1; j++) {
            for (let k = -1; k <= 1; k++) {
              const n = (y + j) * w + (x + k);
              sx += slopeX[n];
              sy += slopeY[n];
            }
          }
          tempX[y * w + x] = sx / 9;
          tempY[y * w + x] = sy / 9;
        }
      }
      [slopeX, tempX] = [tempX, slopeX];
      [slopeY, tempY] = [tempY, slopeY];
    }

    // 3) codificación con tope suave (tanh): nunca se supera maxPx
    let peak = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          out[o] = out[o + 1] = out[o + 2] = NEUTRAL;
          out[o + 3] = 255;
          continue;
        }
        const i = y * w + x;
        const dx = Math.tanh((slopeX[i] * gain) / maxPx) * maxPx;
        const dy = Math.tanh((slopeY[i] * gain) / maxPx) * maxPx;
        const magnitude = Math.max(Math.abs(dx), Math.abs(dy));
        if (magnitude > peak) peak = magnitude;
        out[o] = NEUTRAL + (dx / maxPx) * 127;
        out[o + 1] = NEUTRAL + (dy / maxPx) * 127;
        out[o + 2] = NEUTRAL;
        out[o + 3] = 255;
      }
    }
    return peak;
  }
}

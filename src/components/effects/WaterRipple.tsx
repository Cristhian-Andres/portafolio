"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { readEngineHints, supportsSvgBackdropFilter } from "@/lib/browserSupport";
import { DEFAULT_DISPLACEMENT, DisplacementEncoder, NEUTRAL } from "@/lib/rippleMap";
import { TrailField, wakeStrength } from "@/lib/trailField";
import type { RippleStyle } from "@/lib/trailField";

/** Tamaño de cada celda de la simulación, en píxeles de pantalla. */
export const CELL_PX = 8;
export const FILTER_ID = "water-ripple-filter";

/** La huella avanza a 60 pasos por segundo REALES, sin importar los cuadros que dibuje el navegador. */
export const SIM_STEP_MS = 1000 / 60;
/** Tope de pasos por cuadro: si la pestaña se congela no se «recupera» de golpe. */
const MAX_STEPS_PER_FRAME = 4;

/**
 * Brillo de las crestas. Con refracción es apenas un destello (la deformación hace el trabajo);
 * sin refracción (Safari, Firefox) es el único efecto, así que es algo mayor pero igual de discreto.
 */
export const SHEEN_ALPHA = { refraction: 0.03, fallback: 0.12 } as const;

function sheenStyle(isDark: boolean, refraction: boolean): RippleStyle {
  const strength = refraction ? SHEEN_ALPHA.refraction : SHEEN_ALPHA.fallback;
  return isDark
    ? { highlight: [215, 255, 160], shadow: [0, 20, 4], maxAlpha: strength, gain: 0.7 }
    : { highlight: [255, 255, 255], shadow: [30, 100, 30], maxAlpha: strength * 0.9, gain: 0.7 };
}

/**
 * Efecto de agua LOCAL. Donde pasa el puntero (o el dedo) la superficie se hunde un instante y
 * deforma suavemente lo que hay debajo, como si dejara una marca en el agua que se relaja y
 * desaparece en menos de un segundo. No hay ondas que viajen por la pantalla.
 *
 * - Chrome / Edge / Android: refracción real con un filtro SVG (máx. ~3 px), solo donde se toca.
 * - Safari / Firefox: solo un brillo muy sutil en el mismo sitio (no pueden aplicar el filtro).
 * - Solo trabaja mientras la marca es visible; en reposo no consume nada.
 * - No se monta con «reducir movimiento».
 */
export function WaterRipple() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<SVGFilterElement>(null);
  const feImageRef = useRef<SVGFEImageElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const lens = lensRef.current;
    const filter = filterRef.current;
    const feImage = feImageRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !lens || !filter || !feImage || !ctx) return;

    const refraction = supportsSvgBackdropFilter(navigator.userAgent, readEngineHints());
    canvas.dataset.mode = refraction ? "refraction" : "sheen";

    // Lienzo auxiliar donde se dibuja el mapa de deformación que lee el filtro.
    const mapCanvas = refraction ? document.createElement("canvas") : null;
    const mapCtx = mapCanvas?.getContext("2d") ?? null;

    let field: TrailField;
    let image: ImageData;
    let mapImage: ImageData | null = null;
    let encoder: DisplacementEncoder | null = null;
    let frame = 0;
    let running = false;
    let last: { x: number; y: number } | null = null;
    let frameMs = 0;
    let lastTime = 0;
    let accumulator = 0;

    function build() {
      const cols = Math.max(3, Math.ceil(window.innerWidth / CELL_PX));
      const rows = Math.max(3, Math.ceil(window.innerHeight / CELL_PX));
      canvas!.width = cols;
      canvas!.height = rows;
      field = new TrailField(cols, rows);
      image = ctx!.createImageData(cols, rows);

      if (refraction && mapCanvas && mapCtx) {
        mapCanvas.width = cols;
        mapCanvas.height = rows;
        mapImage = mapCtx.createImageData(cols, rows);
        encoder = new DisplacementEncoder(cols, rows);
        // El filtro y su imagen abarcan exactamente la ventana.
        for (const el of [filter!, feImage!]) {
          el.setAttribute("x", "0");
          el.setAttribute("y", "0");
          el.setAttribute("width", String(window.innerWidth));
          el.setAttribute("height", String(window.innerHeight));
        }
        // Mapa neutro inicial: evita que el filtro arranque sin imagen.
        for (let i = 0; i < mapImage.data.length; i += 4) {
          mapImage.data[i] = mapImage.data[i + 1] = mapImage.data[i + 2] = NEUTRAL;
          mapImage.data[i + 3] = 255;
        }
        mapCtx.putImageData(mapImage, 0, 0);
        feImage!.setAttribute("href", mapCanvas.toDataURL("image/png"));
      }
    }

    function setState(state: "active" | "idle") {
      canvas!.dataset.state = state;
      lens!.dataset.state = state;
    }

    /** El filtro solo existe mientras hay ondas: en reposo no cuesta nada y no toca el texto. */
    function setLens(on: boolean) {
      lens!.style.backdropFilter = on && refraction ? `url(#${FILTER_ID})` : "none";
    }

    function tick() {
      const started = performance.now();

      // Tiempo fijo: la huella se desvanece igual a 30, 60 o 144 fps y dura lo mismo en tiempo real.
      accumulator += Math.max(0, Math.min(started - lastTime, SIM_STEP_MS * MAX_STEPS_PER_FRAME));
      lastTime = started;
      let steps = 0;
      while (accumulator >= SIM_STEP_MS && steps < MAX_STEPS_PER_FRAME) {
        field.step();
        accumulator -= SIM_STEP_MS;
        steps++;
      }

      if (refraction && encoder && mapImage && mapCtx && mapCanvas) {
        encoder.encode(field, mapImage.data, DEFAULT_DISPLACEMENT);
        mapCtx.putImageData(mapImage, 0, 0);
        feImage!.setAttribute("href", mapCanvas.toDataURL("image/png"));
      }

      // La introducción es siempre blanca: sobre ella se usa la paleta clara aunque el sitio esté en oscuro.
      const onWhiteIntro = document.querySelector("[data-intro-gate]") !== null;
      const isDark = document.documentElement.classList.contains("dark") && !onWhiteIntro;
      field.render(image.data, sheenStyle(isDark, refraction));
      ctx!.putImageData(image, 0, 0);

      frameMs = frameMs === 0 ? performance.now() - started : frameMs * 0.9 + (performance.now() - started) * 0.1;

      if (field.isCalm) {
        field.clear();
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
        setLens(false);
        running = false;
        canvas!.dataset.frameMs = frameMs.toFixed(2);
        setState("idle");
        return;
      }
      frame = requestAnimationFrame(tick);
    }

    function wake() {
      if (running || document.hidden) return;
      running = true;
      lastTime = performance.now();
      accumulator = SIM_STEP_MS; // el primer cuadro avanza un paso
      setLens(true);
      setState("active");
      frame = requestAnimationFrame(tick);
    }

    /** Estela del puntero: huellas pequeñas a lo largo del recorrido, para que no queden huecos. */
    function trail(clientX: number, clientY: number) {
      const x = clientX / CELL_PX;
      const y = clientY / CELL_PX;
      if (last) {
        const distance = Math.hypot(x - last.x, y - last.y);
        const steps = Math.max(1, Math.ceil(distance / 1.5));
        const strength = wakeStrength(distance) / Math.sqrt(steps);
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          field.stamp(last.x + (x - last.x) * t, last.y + (y - last.y) * t, -strength, 2.2);
        }
      } else {
        field.stamp(x, y, -0.25, 2.2);
      }
      last = { x, y };
      wake();
    }

    /** Marca mayor: clic o toque. */
    function splash(clientX: number, clientY: number) {
      field.stamp(clientX / CELL_PX, clientY / CELL_PX, -1.2, 3.0);
      last = { x: clientX / CELL_PX, y: clientY / CELL_PX };
      wake();
    }

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return; // el dedo se atiende con eventos táctiles
      trail(event.clientX, event.clientY);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      splash(event.clientX, event.clientY);
    };
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) splash(touch.clientX, touch.clientY);
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (touch) trail(touch.clientX, touch.clientY);
    };
    const onRelease = () => {
      last = null;
    };
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        running = false;
        field.clear();
        setLens(false);
        setState("idle");
      }
    };
    let resizeFrame = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        cancelAnimationFrame(frame);
        running = false;
        setLens(false);
        build();
        setState("idle");
      });
    };

    build();
    setLens(false);
    setState("idle");

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerleave", onRelease);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onRelease, { passive: true });
    window.addEventListener("touchcancel", onRelease, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      setLens(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerleave", onRelease);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onRelease);
      window.removeEventListener("touchcancel", onRelease);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <>
      {/* Filtro de deformación: lee el mapa que genera la simulación. Sin tamaño, no se ve. */}
      <svg
        aria-hidden="true"
        focusable="false"
        width="0"
        height="0"
        className="pointer-events-none fixed left-0 top-0 h-0 w-0"
      >
        <filter
          ref={filterRef}
          id={FILTER_ID}
          filterUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="1"
          height="1"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            ref={feImageRef}
            x="0"
            y="0"
            width="1"
            height="1"
            preserveAspectRatio="none"
            result="map"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="map"
            scale={DEFAULT_DISPLACEMENT.maxPx * 2}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* Lente: aplica el filtro a lo que hay detrás, sin capturar clics. */}
      <div
        ref={lensRef}
        data-testid="water-lens"
        data-state="idle"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[60]"
      />

      {/* Destellos sutiles sobre las crestas. */}
      <canvas
        ref={canvasRef}
        data-testid="water-ripple"
        data-state="idle"
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[61] h-full w-full [filter:blur(0.6px)]"
      />
    </>
  );
}

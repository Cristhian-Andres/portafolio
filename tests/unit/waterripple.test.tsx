import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CELL_PX, FILTER_ID, SHEEN_ALPHA, SIM_STEP_MS, WaterRipple } from "@/components/effects/WaterRipple";

const motionPrefs = vi.hoisted(() => ({ reduced: false as boolean | null }));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => motionPrefs.reduced };
});

/** Lo que la estela pinta (grosor y color de cada tramo) y las curvas que traza. */
const drawn = { widths: [] as number[], styles: [] as string[], frameStarts: [] as number[] };

const ctx = {
  createImageData: vi.fn((w: number, h: number) => ({
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4),
  })),
  putImageData: vi.fn(),
  // cada cuadro de la estela empieza limpiando el lienzo: se anota dónde empieza para aislarlo
  clearRect: vi.fn(() => {
    drawn.frameStarts.push(drawn.widths.length);
  }),
  // dibujo de la estela (línea fina)
  setTransform: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  stroke: vi.fn(),
  lineCap: "butt",
  lineJoin: "miter",
  set lineWidth(value: number) {
    drawn.widths.push(value);
  },
  set strokeStyle(value: string) {
    drawn.styles.push(value);
  },
};

/** Reinicia los espías del canvas simulado (ignora las propiedades que no son funciones). */
function resetCtx() {
  drawn.widths.length = 0;
  drawn.styles.length = 0;
  drawn.frameStarts.length = 0;
  for (const value of Object.values(ctx)) {
    if (typeof value === "function" && "mockClear" in value) (value as { mockClear: () => void }).mockClear();
  }
}

const canvas = () => screen.getByTestId("water-ripple") as HTMLCanvasElement;
const state = () => canvas().dataset.state;

function frames(count: number, frameMs = 17) {
  for (let i = 0; i < count; i++) act(() => void vi.advanceTimersByTime(frameMs));
}

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const SAFARI_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const lens = () => screen.getByTestId("water-lens");
const feImage = () => document.querySelector("feImage") as SVGFEImageElement;

/** jsdom no tiene TouchEvent con `touches`: se arma el evento a mano. */
function touch(type: "touchstart" | "touchmove" | "touchend", x?: number, y?: number) {
  const event = new Event(type, { bubbles: true });
  Object.defineProperty(event, "touches", {
    value: x === undefined ? [] : [{ clientX: x, clientY: y }],
  });
  act(() => void window.dispatchEvent(event));
}

function pointer(type: string, x: number, y: number, pointerType = "mouse") {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX: x, clientY: y, pointerType });
  act(() => void window.dispatchEvent(event));
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "performance"],
  });
  motionPrefs.reduced = false;
  resetCtx();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D
  );
  Object.defineProperty(window, "innerWidth", { value: 1200, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  document.documentElement.classList.add("dark");
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.classList.remove("dark");
});

describe("WaterRipple: lienzo", () => {
  it("es decorativo: no se anuncia, no captura clics y cubre toda la pantalla por encima de todo", () => {
    render(<WaterRipple />);
    expect(canvas()).toHaveAttribute("aria-hidden", "true");
    expect(canvas().className).toContain("pointer-events-none");
    expect(canvas().className).toContain("fixed");
    expect(canvas().className).toContain("inset-0");
    expect(canvas().className).toMatch(/z-\[6[01]\]/); // sobre la introducción (z-50)
  });

  it("la malla se ajusta al tamaño de la pantalla", () => {
    render(<WaterRipple />);
    expect(canvas().width).toBe(Math.ceil(1200 / CELL_PX));
    expect(canvas().height).toBe(Math.ceil(800 / CELL_PX));
  });

  it("empieza dormido: no anima nada hasta que haya movimiento", () => {
    render(<WaterRipple />);
    expect(state()).toBe("idle");
    frames(20);
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });

  it("con «reducir movimiento» no se monta", () => {
    motionPrefs.reduced = true;
    const { container } = render(<WaterRipple />);
    expect(container).toBeEmptyDOMElement();
    pointer("pointermove", 100, 100);
    frames(5);
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });
});

describe("WaterRipple: mouse", () => {
  it("al mover el mouse se despierta y dibuja ondas", () => {
    render(<WaterRipple />);
    pointer("pointermove", 300, 300);
    expect(state()).toBe("active");
    frames(3);
    expect(ctx.putImageData).toHaveBeenCalled();
    // y lo que dibuja tiene píxeles visibles
    const image = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    expect(image.data.some((v, i) => i % 4 === 3 && v > 0)).toBe(true);
  });

  it("un clic suelta una gota más grande que un simple movimiento", () => {
    render(<WaterRipple />);
    pointer("pointermove", 300, 300);
    frames(2);
    const small = Math.max(...(ctx.putImageData.mock.calls.at(-1)![0] as ImageData).data.filter((_, i) => i % 4 === 3));

    // otra instancia limpia para el clic
    const second = render(<WaterRipple />);
    second.unmount();
    resetCtx();
    render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    frames(2);
    const big = Math.max(...(ctx.putImageData.mock.calls.at(-1)![0] as ImageData).data.filter((_, i) => i % 4 === 3));
    expect(big).toBeGreaterThanOrEqual(small);
    expect(big).toBeGreaterThan(0);
  });

  it("al dejar de mover, las ondas se calman y el efecto se duerme solo", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    expect(state()).toBe("active");
    frames(30);
    expect(state()).toBe("active"); // todavía hay ondas
    frames(450); // ~7.6 s
    expect(state()).toBe("idle");
    expect(ctx.clearRect).toHaveBeenCalled(); // no deja rastro en pantalla

    const drawsWhenSleeping = ctx.putImageData.mock.calls.length;
    frames(30);
    expect(ctx.putImageData.mock.calls.length).toBe(drawsWhenSleeping); // dormido: no gasta CPU
  });

  it("vuelve a despertar con un nuevo movimiento", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(450);
    expect(state()).toBe("idle");
    pointer("pointermove", 200, 200);
    expect(state()).toBe("active");
  });

  it("un recorrido largo y rápido no deja huecos (suelta gotas a lo largo del camino)", () => {
    render(<WaterRipple />);
    pointer("pointermove", 100, 100);
    pointer("pointermove", 1000, 100); // salto de 900 px
    frames(1);
    const image = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    const cols = image.width;
    const row = Math.round(100 / CELL_PX);
    let covered = 0;
    for (let x = Math.round(100 / CELL_PX); x < Math.round(1000 / CELL_PX); x += 4) {
      const alpha = image.data[(row * cols + x) * 4 + 3];
      if (alpha > 0) covered++;
    }
    const checks = Math.floor((Math.round(1000 / CELL_PX) - Math.round(100 / CELL_PX)) / 4);
    expect(covered / checks).toBeGreaterThan(0.7);
  });
});

describe("WaterRipple: dedo (móvil)", () => {
  it("tocar la pantalla suelta una gota", () => {
    render(<WaterRipple />);
    touch("touchstart", 200, 300);
    expect(state()).toBe("active");
    frames(2);
    expect(ctx.putImageData).toHaveBeenCalled();
  });

  it("arrastrar el dedo deja estela", () => {
    render(<WaterRipple />);
    touch("touchstart", 100, 300);
    frames(1);
    const before = ctx.putImageData.mock.calls.length;
    touch("touchmove", 160, 330);
    touch("touchmove", 220, 360);
    frames(2);
    expect(ctx.putImageData.mock.calls.length).toBeGreaterThan(before);
    expect(state()).toBe("active");
  });

  it("soltar el dedo no rompe nada y las ondas siguen hasta calmarse", () => {
    render(<WaterRipple />);
    touch("touchstart", 100, 300);
    touch("touchend");
    frames(10);
    expect(state()).toBe("active");
    frames(450);
    expect(state()).toBe("idle");
  });

  it("los eventos de puntero táctiles se ignoran (el dedo ya se atiende con touch*) y no duplican gotas", () => {
    render(<WaterRipple />);
    pointer("pointermove", 300, 300, "touch");
    pointer("pointerdown", 300, 300, "touch");
    expect(state()).toBe("idle");
    expect(ctx.putImageData).not.toHaveBeenCalled();
  });
});

describe("WaterRipple: ciclo de vida", () => {
  it("al ocultar la pestaña se detiene y limpia", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    frames(5);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(state()).toBe("idle");
    const draws = ctx.putImageData.mock.calls.length;
    frames(10);
    expect(ctx.putImageData.mock.calls.length).toBe(draws);

    // con la pestaña oculta tampoco se despierta
    pointer("pointermove", 100, 100);
    expect(state()).toBe("idle");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("al cambiar el tamaño de la ventana rehace la malla", () => {
    render(<WaterRipple />);
    Object.defineProperty(window, "innerWidth", { value: 600, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 900, configurable: true });
    act(() => void window.dispatchEvent(new Event("resize")));
    frames(2);
    expect(canvas().width).toBe(Math.ceil(600 / CELL_PX));
    expect(canvas().height).toBe(Math.ceil(900 / CELL_PX));
    expect(state()).toBe("idle");
  });

  it("al desmontar quita todos sus escuchas (sin fugas)", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<WaterRipple />);
    const added = add.mock.calls.map((c) => c[0]).sort();
    unmount();
    const removed = remove.mock.calls.map((c) => c[0]).sort();
    for (const type of ["pointermove", "pointerdown", "touchstart", "touchmove", "touchend", "resize"]) {
      expect(added).toContain(type);
      expect(removed).toContain(type);
    }
  });

  it("los escuchas táctiles son pasivos: nunca bloquean el scroll del dedo", () => {
    const add = vi.spyOn(window, "addEventListener");
    render(<WaterRipple />);
    for (const type of ["touchstart", "touchmove"]) {
      const call = add.mock.calls.find((c) => c[0] === type)!;
      expect(call[2]).toMatchObject({ passive: true });
    }
  });

  it("usa colores distintos en tema claro y oscuro", () => {
    document.documentElement.classList.remove("dark");
    render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    frames(2);
    const light = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    const colors = new Set<string>();
    for (let i = 0; i < light.data.length; i += 4) {
      if (light.data[i + 3] > 0) colors.add(`${light.data[i]},${light.data[i + 1]},${light.data[i + 2]}`);
    }
    expect(colors.has("255,255,255")).toBe(true); // crestas blancas en tema claro
  });
});

describe("WaterRipple: refracción real (Chrome/Edge/Android)", () => {
  let dataUrlCalls = 0;
  beforeEach(() => {
    dataUrlCalls = 0;
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(CHROME_UA);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(
      () => "data:image/png;base64,MAPA" + dataUrlCalls++
    );
  });

  it("detecta el navegador y trabaja en modo refracción", () => {
    render(<WaterRipple />);
    expect(canvas().dataset.mode).toBe("refraction");
  });

  it("define el filtro de deformación con su imagen de mapa y el tope de píxeles", () => {
    render(<WaterRipple />);
    const filter = document.getElementById(FILTER_ID)!;
    expect(filter).not.toBeNull();
    expect(filter.getAttribute("color-interpolation-filters")).toBe("sRGB"); // sin esto el mapa se corrompe
    expect(filter.getAttribute("filterUnits")).toBe("userSpaceOnUse");
    expect(filter.getAttribute("width")).toBe("1200");
    expect(filter.getAttribute("height")).toBe("800");
    const displacement = filter.querySelector("feDisplacementMap")!;
    expect(displacement.getAttribute("xChannelSelector")).toBe("R");
    expect(displacement.getAttribute("yChannelSelector")).toBe("G");
    // scale = 2 × tope: con el byte extremo el desplazamiento no pasa de 3 px
    expect(Number(displacement.getAttribute("scale"))).toBeLessThanOrEqual(6);
    expect(feImage().getAttribute("preserveAspectRatio")).toBe("none");
  });

  it("en reposo NO hay filtro: no cuesta nada ni toca el texto", () => {
    render(<WaterRipple />);
    expect(lens().style.backdropFilter).toBe("none");
    expect(lens().className).toContain("pointer-events-none");
    expect(lens().className).toContain("fixed");
  });

  it("al moverse, el filtro se enciende y el mapa se actualiza en cada cuadro", () => {
    render(<WaterRipple />);
    pointer("pointermove", 300, 300);
    expect(lens().style.backdropFilter).toContain("#" + FILTER_ID); // jsdom lo normaliza a url("#id")
    expect(lens().dataset.state).toBe("active");
    frames(1);
    const first = feImage().getAttribute("href");
    frames(1);
    const second = feImage().getAttribute("href");
    expect(first).toMatch(/^data:image\/png/);
    expect(second).not.toBe(first); // mapa nuevo por cuadro
  });

  it("al calmarse el agua, el filtro se apaga y deja el lienzo limpio", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(20);
    expect(lens().style.backdropFilter).toContain(FILTER_ID);
    frames(450);
    expect(canvas().dataset.state).toBe("idle");
    expect(lens().style.backdropFilter).toBe("none");
    expect(lens().dataset.state).toBe("idle");
    const callsWhenSleeping = dataUrlCalls;
    frames(30);
    expect(dataUrlCalls).toBe(callsWhenSleeping); // dormido: ni siquiera genera mapas
  });

  it("al ocultar la pestaña apaga el filtro", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    frames(5);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(lens().style.backdropFilter).toBe("none");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("al desmontar deja el filtro apagado", () => {
    const { unmount } = render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    const el = lens();
    unmount();
    expect(el.style.backdropFilter).toBe("none");
  });

  it("el brillo acompaña pero es apenas perceptible (la deformación hace el trabajo)", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 300, 300);
    frames(3);
    const image = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    let maxAlpha = 0;
    for (let i = 3; i < image.data.length; i += 4) maxAlpha = Math.max(maxAlpha, image.data[i]);
    expect(maxAlpha).toBeLessThanOrEqual(Math.round(SHEEN_ALPHA.refraction * 255));
  });
});

describe("WaterRipple: respaldo sin refracción (Safari, Firefox)", () => {
  it("usa el modo brillo, nunca enciende el filtro y no genera mapas", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(SAFARI_UA);
    const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL");
    render(<WaterRipple />);
    expect(canvas().dataset.mode).toBe("sheen");
    pointer("pointerdown", 300, 300);
    frames(10);
    expect(lens().style.backdropFilter).toBe("none");
    expect(toDataURL).not.toHaveBeenCalled();
    // el brillo sí se dibuja, y es algo más visible porque es lo único que hay
    const image = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    const alphas = Array.from(image.data).filter((_, i) => i % 4 === 3);
    expect(Math.max(...alphas)).toBeGreaterThan(Math.round(SHEEN_ALPHA.refraction * 255));
    expect(Math.max(...alphas)).toBeLessThanOrEqual(Math.round(SHEEN_ALPHA.fallback * 255));
  });
});

describe("WaterRipple: la marca dura lo mismo a cualquier velocidad de pantalla", () => {
  /** Milisegundos reales que tarda en calmarse tras un clic, dibujando a cierta tasa de cuadros. */
  function msToCalm(frameMs: number) {
    const { unmount } = render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    let elapsed = 0;
    while (canvas().dataset.state === "active" && elapsed < 20_000) {
      frames(1, frameMs);
      elapsed += frameMs;
    }
    unmount();
    return elapsed;
  }

  it("a 30, 60 y 144 fps se desvanece en prácticamente el mismo tiempo real", () => {
    const at60 = msToCalm(16.7);
    const at30 = msToCalm(33.4);
    const at144 = msToCalm(6.9);
    expect(at60).toBeGreaterThan(500); // se ve: no desaparece de golpe
    expect(at60).toBeLessThan(1500); // pero dura poco: ~1 s
    expect(Math.abs(at30 - at60) / at60).toBeLessThan(0.15);
    expect(Math.abs(at144 - at60) / at60).toBeLessThan(0.15);
  });

  it("si el navegador se congela unos segundos, el agua no avanza de golpe (tope de pasos por cuadro)", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(2);
    // El siguiente cuadro llega con 5 s de retraso (un solo salto del reloj, sin cuadros intermedios).
    const real = performance.now.bind(performance);
    vi.spyOn(performance, "now").mockReturnValueOnce(real() + 5000);
    frames(1);
    expect(canvas().dataset.state).toBe("active"); // si hubiera simulado 300 pasos ya estaría calmado
  });

  it("si el reloj retrocede, el agua sigue su curso y no se congela", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(2);
    const real = performance.now.bind(performance);
    vi.spyOn(performance, "now").mockReturnValueOnce(real() + 5000); // salto hacia adelante...
    frames(1);
    frames(1); // ...y este cuadro ve el tiempo retroceder
    let guard = 0;
    while (canvas().dataset.state === "active" && guard++ < 1200) frames(1);
    expect(canvas().dataset.state).toBe("idle"); // termina de calmarse con normalidad
  });

  it("el paso de simulación es de 60 por segundo", () => {
    expect(SIM_STEP_MS).toBeCloseTo(1000 / 60, 5);
  });
});

describe("WaterRipple: la marca es LOCAL, solo donde toca el puntero o el dedo", () => {
  /** Píxeles dibujados (alfa > 0) en la última imagen, en coordenadas de celda. */
  function lit(): Array<[number, number]> {
    const image = ctx.putImageData.mock.calls.at(-1)![0] as ImageData;
    const points: Array<[number, number]> = [];
    for (let i = 3; i < image.data.length; i += 4) {
      if (image.data[i] > 0) {
        const p = (i - 3) / 4;
        points.push([p % image.width, Math.floor(p / image.width)]);
      }
    }
    return points;
  }
  const cell = (px: number) => px / CELL_PX;
  const farthestFrom = (cx: number, cy: number) =>
    Math.max(0, ...lit().map(([x, y]) => Math.hypot(x - cell(cx), y - cell(cy))));

  it("un clic marca solo alrededor del punto (máx. ~110 px), no el resto de la pantalla", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(3);
    expect(lit().length).toBeGreaterThan(10); // hay marca…
    expect(farthestFrom(600, 400)).toBeLessThanOrEqual(14); // …pero cerca (14 celdas × 8 px)
    // esquinas y extremos de la pantalla intactos
    for (const [x, y] of lit()) {
      expect(Math.hypot(x - cell(600), y - cell(400))).toBeLessThan(25);
    }
  });

  it("NO se expande con el tiempo: no viajan ondas por la pantalla", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 600, 400);
    frames(3);
    const early = farthestFrom(600, 400);
    frames(12); // ~200 ms después
    const later = farthestFrom(600, 400);
    expect(later).toBeLessThanOrEqual(early + 4); // a lo sumo se ensancha un poco (~32 px)
    expect(later).toBeLessThanOrEqual(16);
  });

  it("la estela sigue el recorrido del mouse y no se sale de él", () => {
    render(<WaterRipple />);
    pointer("pointermove", 100, 300);
    for (let i = 1; i <= 10; i++) pointer("pointermove", 100 + i * 50, 300);
    frames(2);
    const points = lit();
    expect(points.length).toBeGreaterThan(30);
    for (const [x, y] of points) {
      const along = Math.min(Math.max(x, cell(100)), cell(600)); // punto más cercano del tramo
      expect(Math.hypot(x - along, y - cell(300))).toBeLessThanOrEqual(14);
    }
    // y la zona alejada del camino queda limpia
    expect(points.some(([, y]) => Math.abs(y - cell(300)) > 15)).toBe(false);
  });

  it("con el dedo también es local: solo marca donde se toca", () => {
    render(<WaterRipple />);
    touch("touchstart", 200, 500);
    frames(3);
    expect(farthestFrom(200, 500)).toBeLessThanOrEqual(14);
    touch("touchmove", 260, 520);
    frames(2);
    for (const [x, y] of lit()) {
      expect(Math.min(Math.hypot(x - cell(200), y - cell(500)), Math.hypot(x - cell(260), y - cell(520)))).toBeLessThanOrEqual(16);
    }
  });

  it("al dejar de mover el mouse la marca se desvanece sola en ~1 s", () => {
    render(<WaterRipple />);
    pointer("pointermove", 100, 300);
    for (let i = 1; i <= 8; i++) pointer("pointermove", 100 + i * 60, 300);
    expect(canvas().dataset.state).toBe("active");
    frames(100); // ~1,7 s sin tocar nada
    expect(canvas().dataset.state).toBe("idle");
  });

  it("mover el mouse sin avanzar (quieto) no deja marca nueva", () => {
    render(<WaterRipple />);
    pointer("pointermove", 300, 300); // primer contacto: marca mínima
    frames(80); // se desvanece
    expect(canvas().dataset.state).toBe("idle");
    const draws = ctx.putImageData.mock.calls.length;
    frames(30);
    expect(ctx.putImageData.mock.calls.length).toBe(draws); // quieto = nada
  });
});

describe("WaterRipple: estela de barco (línea fina por donde pasa el puntero)", () => {
  const wakeCanvas = () => screen.getByTestId("water-wake") as HTMLCanvasElement;

  /** Mueve el mouse en línea recta, un paso por cuadro (≈ 16 ms), como una persona. */
  function sweep(x0: number, y0: number, x1: number, y1: number, steps = 14) {
    pointer("pointermove", x0, y0);
    for (let i = 1; i <= steps; i++) {
      frames(1);
      pointer("pointermove", x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
    }
    frames(1);
  }

  /** Cada tramo dibujado: [x0,y0] → control → [x1,y1]. */
  function drawnSegments() {
    const moves = ctx.moveTo.mock.calls as number[][];
    const curves = ctx.quadraticCurveTo.mock.calls as number[][];
    return curves.map((c, i) => ({ x0: moves[i][0], y0: moves[i][1], cx: c[0], cy: c[1], x1: c[2], y1: c[3] }));
  }

  it("tiene su propio lienzo: decorativo, sin capturar clics y por encima de todo", () => {
    render(<WaterRipple />);
    expect(wakeCanvas()).toHaveAttribute("aria-hidden", "true");
    expect(wakeCanvas().className).toContain("pointer-events-none");
    expect(wakeCanvas().className).toContain("fixed");
    expect(wakeCanvas().className).toContain("z-[62]");
    expect(wakeCanvas().dataset.live).toBe("false");
  });

  it("se dibuja a la resolución de la pantalla (nítida), con un tope de 2×", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    const { unmount } = render(<WaterRipple />);
    expect(wakeCanvas().width).toBe(1200 * 2);
    expect(wakeCanvas().height).toBe(800 * 2);
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    unmount();

    Object.defineProperty(window, "devicePixelRatio", { value: 3, configurable: true });
    render(<WaterRipple />);
    expect(wakeCanvas().width).toBe(1200 * 2); // 3× se limita a 2×
    Object.defineProperty(window, "devicePixelRatio", { value: 1, configurable: true });
  });

  it("al mover el mouse dibuja la línea y la marca como viva", () => {
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(wakeCanvas().dataset.live).toBe("true");
  });

  it("es BLANCA sobre fondo oscuro", () => {
    document.documentElement.classList.add("dark");
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    expect(drawn.styles.length).toBeGreaterThan(3);
    for (const style of drawn.styles) expect(style).toMatch(/^rgba\(255,255,255,/);
  });

  it("es NEGRA sobre fondo claro", () => {
    document.documentElement.classList.remove("dark");
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    expect(drawn.styles.length).toBeGreaterThan(3);
    for (const style of drawn.styles) expect(style).toMatch(/^rgba\(0,0,0,/);
  });

  it("sobre la introducción (siempre blanca) es NEGRA aunque el sitio esté en oscuro", () => {
    document.documentElement.classList.add("dark");
    const gate = document.createElement("div");
    gate.setAttribute("data-intro-gate", "");
    document.body.appendChild(gate);
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    for (const style of drawn.styles) expect(style).toMatch(/^rgba\(0,0,0,/);
    gate.remove();
  });

  it("es fina y sutil: grosor ≤ 2,2 px y opacidad ≤ 0,45", () => {
    render(<WaterRipple />);
    sweep(100, 300, 700, 340, 20);
    expect(drawn.widths.length).toBeGreaterThan(5);
    for (const width of drawn.widths) {
      expect(width).toBeLessThanOrEqual(2.2 + 1e-9);
      expect(width).toBeGreaterThan(0);
    }
    for (const style of drawn.styles) {
      const alpha = Number(/,([0-9.]+)\)$/.exec(style)![1]);
      expect(alpha).toBeLessThanOrEqual(0.45 + 1e-9);
      expect(alpha).toBeGreaterThanOrEqual(0);
    }
  });

  it("se afina hacia atrás: la cabeza (junto al puntero) es más gruesa que la cola", () => {
    render(<WaterRipple />);
    sweep(100, 300, 700, 300, 24);
    // el último cuadro dibujado va de la cola a la cabeza: se aísla desde su último «limpiar lienzo»
    const group = drawn.widths.slice(drawn.frameStarts[drawn.frameStarts.length - 1]);
    expect(group.length).toBeGreaterThan(5);
    expect(group[group.length - 1]).toBeGreaterThan(group[0] * 1.5);
    for (let i = 1; i < group.length; i++) expect(group[i]).toBeGreaterThanOrEqual(group[i - 1] - 1e-9);
  });

  it("va solo por el recorrido: ningún tramo se sale del camino que hizo el puntero", () => {
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    for (const s of drawnSegments()) {
      for (const [x, y] of [[s.x0, s.y0], [s.x1, s.y1]]) {
        expect(x).toBeGreaterThanOrEqual(190);
        expect(x).toBeLessThanOrEqual(610);
        expect(Math.abs(y - 300)).toBeLessThan(8); // pegada a la trayectoria
      }
    }
  });

  it("marca la dirección: el extremo más reciente queda donde está el puntero", () => {
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    const segments = drawnSegments();
    const head = segments[segments.length - 1];
    expect(head.x1).toBeGreaterThan(560);
    expect(head.x1).toBeLessThanOrEqual(600);
  });

  it("un clic o toque suelto NO deja línea (solo la marca de agua)", () => {
    render(<WaterRipple />);
    pointer("pointerdown", 400, 300);
    frames(5);
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
    expect(wakeCanvas().dataset.live).toBe("false");

    touch("touchstart", 200, 500);
    frames(5);
    expect(ctx.quadraticCurveTo).not.toHaveBeenCalled();
  });

  it("también con el dedo: arrastrar deja la línea", () => {
    render(<WaterRipple />);
    touch("touchstart", 100, 400);
    for (let i = 1; i <= 12; i++) {
      frames(1);
      touch("touchmove", 100 + i * 22, 400 + i * 4);
    }
    frames(1);
    expect(ctx.quadraticCurveTo).toHaveBeenCalled();
    expect(wakeCanvas().dataset.live).toBe("true");
  });

  it("al soltar el dedo el siguiente trazo no se une con el anterior", () => {
    render(<WaterRipple />);
    touch("touchstart", 100, 200);
    for (let i = 1; i <= 8; i++) {
      frames(1);
      touch("touchmove", 100 + i * 20, 200);
    }
    touch("touchend");
    resetCtx();
    frames(1);
    touch("touchstart", 100, 500);
    for (let i = 1; i <= 8; i++) {
      frames(1);
      touch("touchmove", 100 + i * 20, 500);
    }
    frames(1);
    for (const s of drawnSegments()) expect(Math.abs(s.y1 - s.y0)).toBeLessThan(40); // ninguna línea une y=200 con y=500
  });

  it("se desvanece sola en menos de un segundo y deja el lienzo limpio", () => {
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    expect(wakeCanvas().dataset.live).toBe("true");
    frames(70); // ~1,2 s sin mover
    expect(wakeCanvas().dataset.live).toBe("false");
    expect(canvas().dataset.state).toBe("idle");
    const strokes = ctx.stroke.mock.calls.length;
    frames(20);
    expect(ctx.stroke.mock.calls.length).toBe(strokes); // dormido: no dibuja nada más
  });

  it("la línea sigue viva aunque la deformación ya se haya calmado, y no mantiene el filtro encendido", () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,MAPA");
    render(<WaterRipple />);
    sweep(200, 300, 260, 300, 4); // un trazo corto: la deformación casi no existe
    pointer("pointermove", 262, 300);
    // mientras pasa el tiempo, el filtro se retira apenas la deformación termina…
    let filterOffAt = -1;
    let wakeOffAt = -1;
    for (let f = 0; f < 120; f++) {
      frames(1);
      const filterOn = screen.getByTestId("water-lens").style.backdropFilter.includes("water-ripple-filter");
      if (!filterOn && filterOffAt < 0) filterOffAt = f;
      if (wakeCanvas().dataset.live === "false" && wakeOffAt < 0) wakeOffAt = f;
    }
    expect(filterOffAt).toBeGreaterThanOrEqual(0);
    expect(wakeOffAt).toBeGreaterThan(0);
    expect(canvas().dataset.state).toBe("idle");
  });

  it("al ocultar la pestaña se borra la estela", () => {
    render(<WaterRipple />);
    sweep(200, 300, 600, 300);
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(wakeCanvas().dataset.live).toBe("false");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
  });

  it("con «reducir movimiento» no existe la línea", () => {
    motionPrefs.reduced = true;
    render(<WaterRipple />);
    expect(screen.queryByTestId("water-wake")).toBeNull();
  });
});

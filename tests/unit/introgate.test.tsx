import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  CHARS_PER_TICK,
  CUT_DURATION_MS,
  HOLD_AFTER_TYPING_MS,
  IntroGate,
  REVEAL_MIN_MS,
  TYPE_INTERVAL_MS,
} from "@/components/gatekeeper/IntroGate";
import {
  INTRO_ROLE,
  buildIntroLines,
  totalChars,
  truncateAt,
  visibleLines,
} from "@/components/gatekeeper/introContent";
import { useGatekeeperStore } from "@/components/gatekeeper/useGatekeeperStore";
import { NO_GTM_DELAY_MS } from "@/lib/analytics";

const motionPrefs = vi.hoisted(() => ({ reduced: false }));
vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => motionPrefs.reduced };
});

type W = Window & { dataLayer?: Record<string, unknown>[] };
const w = window as W;
const ORIGINAL_LOCATION = window.location;

const lines = buildIntroLines();
const TYPING_MS = Math.ceil(totalChars(lines) / CHARS_PER_TICK) * TYPE_INTERVAL_MS;
const FULL_SEQUENCE_MS = TYPING_MS + HOLD_AFTER_TYPING_MS + CUT_DURATION_MS;

let reload: ReturnType<typeof vi.fn>;

function stage(container: HTMLElement) {
  return container.querySelector("[data-stage]")!.getAttribute("data-stage");
}
const recruiterBtn = () => screen.getByRole("button", { name: /soy reclutador/i });
const curiousBtn = () => screen.getByRole("button", { name: /ando de curioso/i });
const reveal = () => document.querySelector("[data-stage='reveal']") as HTMLElement | null;
const events = () => (w.dataLayer ?? []).map((e) => e.event);
const STEP_MS = 10;
function advance(ms: number) {
  for (let elapsed = 0; elapsed < ms; elapsed += STEP_MS) {
    act(() => void vi.advanceTimersByTime(Math.min(STEP_MS, ms - elapsed)));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  delete w.dataLayer;
  reload = vi.fn();
  vi.stubGlobal("location", {
    reload,
    href: "http://localhost:3000/",
    origin: "http://localhost:3000",
    protocol: "http:",
    host: "localhost:3000",
    hostname: "localhost",
    pathname: "/",
    search: "",
    hash: "",
  });
  useGatekeeperStore.setState({ hasAnswered: false, audience: null, unlocking: false });
});
afterEach(() => {
  vi.useRealTimers();
  vi.stubGlobal("location", ORIGINAL_LOCATION);
  motionPrefs.reduced = false;
});

describe("contenido de la introducción", () => {
  it("usa mi experiencia real y no corta palabras a la mitad", () => {
    expect(lines[0].text).toContain("Analytics Engineer");
    expect(lines[1].text).toContain("Alegra");
    const bullets = lines.filter((l) => l.kind === "bullet");
    expect(bullets).toHaveLength(3);
    for (const l of bullets) {
      expect(l.text.length).toBeLessThanOrEqual(93);
      expect(l.text.endsWith("…")).toBe(true);
    }
  });

  it("truncateAt respeta palabras y deja intacto lo corto", () => {
    expect(truncateAt("hola mundo", 50)).toBe("hola mundo");
    expect(truncateAt("uno dos tres cuatro cinco", 14)).toBe("uno dos tres…");
  });

  it("visibleLines reparte los caracteres en orden entre las líneas", () => {
    const sample = [
      { kind: "role" as const, text: "abc" },
      { kind: "bullet" as const, text: "defg" },
    ];
    expect(visibleLines(sample, 0).map((l) => l.text)).toEqual(["", ""]);
    expect(visibleLines(sample, 2)).toMatchObject([{ text: "ab", typing: true }, { text: "" }]);
    expect(visibleLines(sample, 5)).toMatchObject([
      { text: "abc", typing: false },
      { text: "de", typing: true },
    ]);
    expect(visibleLines(sample, 99).map((l) => l.text)).toEqual(["abc", "defg"]);
  });
});

describe("secuencia: se escribe, se corta, pregunta", () => {
  it("es un diálogo accesible y no marca como oculto lo interactivo", () => {
    const { container } = render(<IntroGate />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(/qué haces aquí/i);
    expect(container.querySelector("article")).not.toHaveAttribute("aria-hidden");
    expect(recruiterBtn().closest("[aria-hidden='true']")).toBeNull();
  });

  it("al inicio el CV está vacío y los botones de respuesta aún no se pueden pulsar", () => {
    const { container } = render(<IntroGate />);
    expect(stage(container)).toBe("typing");
    expect(recruiterBtn()).toBeDisabled();
    expect(curiousBtn()).toBeDisabled();
    expect(screen.queryByText(/Alegra SAS/)).toBeNull();
  });

  it("el perfil aparece poco a poco", () => {
    render(<IntroGate />);
    advance(TYPE_INTERVAL_MS * 10);
    expect(document.body.textContent).toContain(lines[0].text.slice(0, 20));
    expect(document.body.textContent).not.toContain(lines[1].text);
    advance(TYPING_MS);
    expect(document.body.textContent).toContain(lines[1].text);
  });

  it("después de escribir hay una pausa, luego el corte y por último la pregunta", () => {
    const { container } = render(<IntroGate />);
    advance(TYPING_MS + 20);
    expect(stage(container)).toBe("typing"); // aún en la pausa
    advance(HOLD_AFTER_TYPING_MS);
    expect(stage(container)).toBe("cut");
    expect(recruiterBtn()).toBeDisabled(); // todavía cortándose
    advance(CUT_DURATION_MS);
    expect(stage(container)).toBe("question");
    expect(recruiterBtn()).toBeEnabled();
    expect(curiousBtn()).toBeEnabled();
    expect(screen.getByRole("heading", { name: /qué haces aquí/i })).toBeInTheDocument();
  });

  it("al llegar la pregunta el foco pasa al primer botón", () => {
    render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
    expect(recruiterBtn()).toHaveFocus();
  });

  it("con «reducir movimiento» muestra la pregunta de inmediato", () => {
    motionPrefs.reduced = true;
    const { container } = render(<IntroGate />);
    advance(10);
    expect(stage(container)).toBe("question");
  });
});

describe("medición con Google Tag Manager", () => {
  function toQuestion() {
    const utils = render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
    return utils;
  }

  it("registra gate_view al mostrarse, una sola vez", () => {
    render(<IntroGate />);
    expect(events()).toEqual(["gate_view"]);
    advance(FULL_SEQUENCE_MS);
    expect(events().filter((e) => e === "gate_view")).toHaveLength(1);
  });

  it("«Soy reclutador» envía su evento propio, revela el mensaje y luego recarga", () => {
    toQuestion();
    fireEvent.click(recruiterBtn());

    const pushed = w.dataLayer!.find((e) => e.event === "gate_recruiter_click")!;
    expect(pushed).toMatchObject({
      audience: "recruiter",
      gate_step: "question",
    });
    expect(events()).not.toContain("gate_curious_click");

    // Mientras se envía: la tarjeta se reemplaza por el mensaje de revelación y aún no recarga.
    expect(reveal()).toHaveTextContent("Ahora te muestro todo mi potencial");
    expect(screen.queryByRole("button", { name: /soy reclutador/i })).toBeNull();
    expect(useGatekeeperStore.getState().unlocking).toBe(true);
    expect(reload).not.toHaveBeenCalled();

    advance(NO_GTM_DELAY_MS + REVEAL_MIN_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(useGatekeeperStore.getState()).toMatchObject({
      hasAnswered: true,
      audience: "recruiter",
    });
  });

  it("«Ando de curioso» envía un evento distinto, revela otro mensaje y también recarga", () => {
    toQuestion();
    fireEvent.click(curiousBtn());

    expect(events()).toContain("gate_curious_click");
    expect(events()).not.toContain("gate_recruiter_click");
    expect(reveal()).toHaveTextContent("Bienvenido a mi mundo");
    advance(NO_GTM_DELAY_MS + REVEAL_MIN_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(useGatekeeperStore.getState()).toMatchObject({ hasAnswered: true, audience: "curious" });
  });

  it("sin importar el botón, el resultado es el mismo: guardado + recarga", () => {
    for (const pick of [recruiterBtn, curiousBtn]) {
      useGatekeeperStore.setState({ hasAnswered: false, audience: null, unlocking: false });
      reload.mockClear();
      const { unmount } = toQuestion();
      fireEvent.click(pick());
      advance(NO_GTM_DELAY_MS + REVEAL_MIN_MS);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(useGatekeeperStore.getState().hasAnswered).toBe(true);
      unmount();
    }
  });

  it("no espera el mínimo de revelación antes de recargar al cerrar con Escape", () => {
    render(<IntroGate />);
    fireEvent.keyDown(document, { key: "Escape" });
    advance(NO_GTM_DELAY_MS + STEP_MS);
    expect(reload).toHaveBeenCalledTimes(1); // «unknown»: sin mensaje de revelación que esperar
  });

  it("pulsar el botón varias veces no duplica el evento ni la recarga", () => {
    toQuestion();
    const btn = recruiterBtn();
    fireEvent.click(btn);
    fireEvent.click(btn); // la tarjeta (con ambos botones) ya fue reemplazada por el mensaje
    advance(NO_GTM_DELAY_MS + REVEAL_MIN_MS + 100);
    expect(events().filter((e) => e === "gate_recruiter_click")).toHaveLength(1);
    expect(events()).not.toContain("gate_curious_click");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("Escape cierra sin elegir: evento gate_dismiss y mismo desbloqueo", () => {
    render(<IntroGate />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(w.dataLayer!.find((e) => e.event === "gate_dismiss")).toMatchObject({
      audience: "unknown",
    });
    expect(reveal()).toBeNull(); // Escape no elige audiencia: no hay mensaje que mostrar
    advance(NO_GTM_DELAY_MS + STEP_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(useGatekeeperStore.getState()).toMatchObject({ hasAnswered: true, audience: "unknown" });
  });

  it("con GTM presente espera su confirmación y el mínimo de revelación antes de recargar", () => {
    (window as unknown as { google_tag_manager: object }).google_tag_manager = { "GTM-X": {} };
    toQuestion();
    fireEvent.click(recruiterBtn());
    advance(NO_GTM_DELAY_MS + 100);
    expect(reload).not.toHaveBeenCalled(); // GTM aún no confirmó
    const pushed = w.dataLayer!.find((e) => e.event === "gate_recruiter_click") as {
      eventCallback: () => void;
    };
    act(() => pushed.eventCallback());
    expect(reload).not.toHaveBeenCalled(); // GTM ya confirmó, pero el mensaje aún no cumplió su mínimo
    advance(REVEAL_MIN_MS);
    expect(reload).toHaveBeenCalledTimes(1);
    delete (window as unknown as { google_tag_manager?: object }).google_tag_manager;
  });
});

describe("mensaje de revelación tras elegir", () => {
  function toQuestion() {
    const utils = render(<IntroGate />);
    advance(Math.ceil(totalChars(lines) / CHARS_PER_TICK) * TYPE_INTERVAL_MS + HOLD_AFTER_TYPING_MS + CUT_DURATION_MS + 50);
    return utils;
  }

  it("reemplaza la tarjeta por el mensaje correspondiente a la audiencia elegida", () => {
    toQuestion();
    fireEvent.click(recruiterBtn());
    expect(reveal()!.textContent).toBe("Ahora te muestro todo mi potencial");
  });

  it("revela cada palabra como un span independiente, para animarlas de adentro hacia afuera", () => {
    toQuestion();
    fireEvent.click(curiousBtn());
    const words = reveal()!.querySelectorAll("span");
    expect(Array.from(words).map((w) => w.textContent?.trim())).toEqual(["Bienvenido", "a", "mi", "mundo"]);
  });

  it("con «reducir movimiento» no espera el mínimo de revelación", () => {
    motionPrefs.reduced = true;
    toQuestion();
    fireEvent.click(recruiterBtn());
    expect(reveal()).not.toBeNull();
    advance(NO_GTM_DELAY_MS + STEP_MS);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("teclado", () => {
  it("el foco se queda atrapado entre los botones disponibles", () => {
    render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
    const first = recruiterBtn();
    const second = curiousBtn();
    expect(first).toHaveFocus();
    second.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(first).toHaveFocus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(second).toHaveFocus();
  });
});

describe("la introducción es SIEMPRE blanca, sin importar el tema", () => {
  const FORBIDDEN = /(^|\s)(dark:|bg-background|bg-surface|text-foreground|text-muted|border-border|text-accent|bg-accent|border-accent|bg-black|text-white)/;

  function root() {
    return document.querySelector("[data-intro-gate]") as HTMLElement;
  }

  it("el fondo es blanco sólido, sin desenfoque ni transparencia", () => {
    render(<IntroGate />);
    expect(root().className).toContain("bg-white");
    expect(root().className).not.toMatch(/backdrop-blur|bg-white\//);
    expect(root().querySelector("article")!.className).toContain("bg-white");
  });

  it("fija el esquema de color claro y las variables que usaría el anillo de foco", () => {
    document.documentElement.classList.add("dark"); // el sitio está en oscuro por defecto
    render(<IntroGate />);
    expect(root().style.colorScheme).toBe("light");
    expect(root().style.getPropertyValue("--background")).toBe("#ffffff");
    expect(root().style.getPropertyValue("--accent-2")).toBe("#0f766e");
    document.documentElement.classList.remove("dark");
  });

  it("ningún elemento de la hoja usa colores que dependan del tema", () => {
    render(<IntroGate />);
    const offenders = [root(), ...Array.from(root().querySelectorAll("*"))]
      .filter((el) => FORBIDDEN.test(el.getAttribute("class") ?? ""))
      .map((el) => el.tagName + "." + el.getAttribute("class"));
    expect(offenders).toEqual([]);
  });

  it("también al final, con los botones de respuesta visibles", () => {
    document.documentElement.classList.add("dark");
    render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
    const offenders = Array.from(root().querySelectorAll("*"))
      .filter((el) => FORBIDDEN.test(el.getAttribute("class") ?? ""))
      .map((el) => el.tagName);
    expect(offenders).toEqual([]);
    document.documentElement.classList.remove("dark");
  });
});

describe("indicador de carga (sin botón de saltar)", () => {
  const loader = () => document.querySelector("[data-intro-loader]") as HTMLElement | null;
  const bar = () => screen.queryByRole("progressbar", { name: /progreso de carga/i });

  it("mientras se escribe el perfil se ve «Cargando perfil…» con indicador y barra", () => {
    render(<IntroGate />);
    expect(loader()).not.toBeNull();
    expect(loader()).toHaveTextContent("Cargando perfil…");
    expect(loader()!.getAttribute("role")).toBe("status");
    expect(loader()!.querySelector(".animate-spin")).not.toBeNull();
    expect(bar()).toBeInTheDocument();
  });

  it("la barra de progreso avanza con el perfil hasta el 100 %", () => {
    render(<IntroGate />);
    const start = Number(bar()!.getAttribute("aria-valuenow"));
    advance(TYPING_MS / 2);
    const middle = Number(bar()!.getAttribute("aria-valuenow"));
    expect(start).toBe(0);
    expect(middle).toBeGreaterThan(30);
    expect(middle).toBeLessThan(70);
    advance(TYPING_MS);
    expect(Number(bar()?.getAttribute("aria-valuenow") ?? 100)).toBe(100);
  });

  it("al terminar de cargar el indicador desaparece y llega la pregunta", () => {
    render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
    expect(loader()).toBeNull();
    expect(bar()).toBeNull();
  });

  it("no existe ningún botón de saltar, en ninguna etapa", () => {
    render(<IntroGate />);
    expect(screen.queryByRole("button", { name: /saltar/i })).toBeNull();
    advance(TYPING_MS + HOLD_AFTER_TYPING_MS + 100); // corte
    expect(screen.queryByRole("button", { name: /saltar/i })).toBeNull();
    advance(CUT_DURATION_MS + 100); // pregunta
    expect(screen.queryByRole("button", { name: /saltar/i })).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2); // solo las dos respuestas
  });

  it("mientras carga no hay nada pulsable: ni botones habilitados ni salida visible", () => {
    render(<IntroGate />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
  });

  it("con «reducir movimiento» no hay carga: la pregunta aparece de inmediato", () => {
    motionPrefs.reduced = true;
    render(<IntroGate />);
    advance(10);
    expect(loader()).toBeNull();
    expect(recruiterBtn()).toBeEnabled();
  });
});

describe("rol bajo el nombre", () => {
  it("dice «Process Automation Engineer» y ya no «Analytics Engineer»", () => {
    render(<IntroGate />);
    const role = document.querySelector("[data-intro-role]") as HTMLElement;
    expect(role).toHaveTextContent("Process Automation Engineer");
    expect(role.textContent).not.toMatch(/analytics/i);
    expect(INTRO_ROLE).toBe("Process Automation Engineer");
  });

  it("lectores de pantalla también reciben el rol nuevo", () => {
    render(<IntroGate />);
    expect(document.body.textContent).toContain("Process Automation Engineer. Elige una opción");
  });
});

describe("la pregunta: solo el título y los dos botones", () => {
  function question() {
    render(<IntroGate />);
    advance(FULL_SEQUENCE_MS + 50);
  }

  it("el título es «¿Qué haces aquí?», sin emoji", () => {
    question();
    const heading = screen.getByRole("heading", { name: /qué haces aquí/i });
    expect(heading.textContent).toBe("¿Qué haces aquí?");
    expect(heading.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("ya no aparece la frase «Elijas lo que elijas, te muestro todo mi potencial»", () => {
    question();
    expect(document.body.textContent).not.toMatch(/elijas lo que elijas/i);
    expect(document.body.textContent).not.toMatch(/te muestro todo mi potencial/i);
  });

  it("ya no aparece la nota «Solo cuento qué botón pulsas, sin guardar datos personales»", () => {
    question();
    expect(document.body.textContent).not.toMatch(/solo cuento/i);
    expect(document.body.textContent).not.toMatch(/datos personales/i);
  });

  it("los botones conservan sus emojis", () => {
    question();
    expect(recruiterBtn()).toHaveTextContent("Soy reclutador 🕵️");
    expect(curiousBtn()).toHaveTextContent("Ando de curioso 👀");
  });

  it("en la etapa de pregunta solo hay título y botones (sin párrafos de relleno visibles)", () => {
    question();
    const overlay = document.querySelector("[data-stage='question']")!;
    const text = overlay.textContent!.replace(/\s+/g, " ").trim();
    expect(text).toBe("¿Qué haces aquí?Soy reclutador 🕵️Ando de curioso 👀");
  });
});

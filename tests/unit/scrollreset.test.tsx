import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import {
  SCROLL_RESET_INLINE_SCRIPT,
  installScrollReset,
  scrollToTop,
  stripHash,
} from "@/lib/scrollReset";
import { ScrollReset } from "@/components/layout/ScrollReset";

let scrollTo: ReturnType<typeof vi.spyOn>;
const cleanups: Array<() => void> = [];

/** Instala el reinicio y lo desinstala al terminar la prueba (si no, los escuchas se acumulan). */
function install() {
  const cleanup = installScrollReset();
  cleanups.push(cleanup);
  return cleanup;
}

beforeEach(() => {
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  window.history.replaceState({ __next: "estado-del-enrutador" }, "", "/");
  // jsdom no define scrollRestoration: se declara para poder comprobar que se ajusta.
  Object.defineProperty(window.history, "scrollRestoration", {
    value: "auto",
    writable: true,
    configurable: true,
  });
});
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("scrollToTop", () => {
  it("va al inicio al instante (sin la animación del scroll suave)", () => {
    scrollToTop();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  });
});

describe("stripHash", () => {
  it("quita el #ancla pero conserva la ruta, la búsqueda y el estado del enrutador de Next", () => {
    window.history.replaceState({ __next: "estado-del-enrutador" }, "", "/?a=1#skills");
    expect(stripHash()).toBe(true);
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe("/?a=1");
    expect(window.history.state).toEqual({ __next: "estado-del-enrutador" });
  });

  it("sin ancla no toca nada", () => {
    expect(stripHash()).toBe(false);
  });
});

describe("installScrollReset", () => {
  it("desactiva la restauración automática, quita el ancla y sube al inicio", () => {
    window.history.replaceState(null, "", "/#contact");
    install();
    expect(window.history.scrollRestoration).toBe("manual");
    expect(window.location.hash).toBe("");
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
  });

  it("al volver desde la caché atrás/adelante (bfcache) vuelve a subir al inicio", () => {
    install();
    scrollTo.mockClear();
    window.history.replaceState(null, "", "/#skills");
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe("");
  });

  it("una carga normal (no desde caché) no repite el reinicio", () => {
    install();
    scrollTo.mockClear();
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("al salir deja la página arriba, por si algún navegador restaurara igualmente", () => {
    install();
    scrollTo.mockClear();
    window.dispatchEvent(new Event("pagehide"));
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("al limpiar quita sus escuchas", () => {
    const cleanup = install();
    cleanup();
    scrollTo.mockClear();
    window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
    window.dispatchEvent(new Event("pagehide"));
    expect(scrollTo).not.toHaveBeenCalled();
  });
});

describe("ScrollReset (componente)", () => {
  it("al montarse sube al inicio y no pinta nada", () => {
    const { container } = render(<ScrollReset />);
    expect(container).toBeEmptyDOMElement();
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "instant" });
    expect(window.history.scrollRestoration).toBe("manual");
  });
});

describe("script de <head> (se ejecuta antes que todo)", () => {
  it("desactiva la restauración y quita el #ancla, conservando el estado", () => {
    window.history.replaceState({ __next: "estado-del-enrutador" }, "", "/?x=2#education");
    new Function(SCROLL_RESET_INLINE_SCRIPT)();
    expect(window.history.scrollRestoration).toBe("manual");
    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("?x=2");
    expect(window.history.state).toEqual({ __next: "estado-del-enrutador" });
  });

  it("no lanza errores aunque el navegador no soporte scrollRestoration", () => {
    // @ts-expect-error simula un navegador antiguo
    delete window.history.scrollRestoration;
    expect(() => new Function(SCROLL_RESET_INLINE_SCRIPT)()).not.toThrow();
  });
});

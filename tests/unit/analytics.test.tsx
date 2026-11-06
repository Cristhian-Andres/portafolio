import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GATE_EVENTS,
  GTM_CALLBACK_TIMEOUT_MS,
  NO_GTM_DELAY_MS,
  isGtmPresent,
  pushEvent,
  trackThen,
} from "@/lib/analytics";
import { GoogleTagManager, isValidGtmId } from "@/components/analytics/GoogleTagManager";

type W = Window & { dataLayer?: Record<string, unknown>[]; google_tag_manager?: object };
const w = window as W;

beforeEach(() => {
  vi.useFakeTimers();
  delete w.dataLayer;
  delete w.google_tag_manager;
  document.head.querySelectorAll("script[data-test-gtm]").forEach((s) => s.remove());
});
afterEach(() => vi.useRealTimers());

describe("nombres de eventos", () => {
  it("cada botón tiene su propio evento y son distintos", () => {
    const names = Object.values(GATE_EVENTS);
    expect(new Set(names).size).toBe(names.length);
    expect(GATE_EVENTS.recruiter).toBe("gate_recruiter_click");
    expect(GATE_EVENTS.curious).toBe("gate_curious_click");
    for (const name of names) expect(name).toMatch(/^gate_[a-z_]+$/);
  });
});

describe("pushEvent", () => {
  it("crea dataLayer si no existe y agrega el evento con su ruta", () => {
    pushEvent("gate_view", { gate_step: "intro" });
    expect(w.dataLayer).toHaveLength(1);
    expect(w.dataLayer![0]).toMatchObject({
      event: "gate_view",
      gate_step: "intro",
      page_path: window.location.pathname,
    });
  });

  it("respeta un dataLayer existente (el que crea GTM) sin reemplazarlo", () => {
    const existing = [{ event: "gtm.js" }];
    w.dataLayer = existing;
    pushEvent("gate_view");
    expect(w.dataLayer).toBe(existing);
    expect(existing).toHaveLength(2);
  });
});

describe("trackThen", () => {
  it("sin GTM continúa tras una pausa corta", () => {
    const then = vi.fn();
    trackThen(GATE_EVENTS.recruiter, { audience: "recruiter" }, then);
    expect(w.dataLayer![0]).toMatchObject({ event: "gate_recruiter_click", audience: "recruiter" });
    expect(then).not.toHaveBeenCalled();
    vi.advanceTimersByTime(NO_GTM_DELAY_MS);
    expect(then).toHaveBeenCalledTimes(1);
  });

  it("con GTM espera a su eventCallback y continúa solo una vez", () => {
    w.google_tag_manager = { "GTM-TEST": {} };
    const then = vi.fn();
    trackThen(GATE_EVENTS.curious, {}, then);

    const pushed = w.dataLayer![0] as { eventCallback: () => void; eventTimeout: number };
    expect(pushed.eventTimeout).toBe(GTM_CALLBACK_TIMEOUT_MS);

    vi.advanceTimersByTime(NO_GTM_DELAY_MS + 50); // aún no debe continuar: GTM no confirmó
    expect(then).not.toHaveBeenCalled();

    pushed.eventCallback(); // GTM terminó de enviar
    pushed.eventCallback(); // un segundo aviso no duplica
    vi.advanceTimersByTime(GTM_CALLBACK_TIMEOUT_MS * 2); // ni el temporizador
    expect(then).toHaveBeenCalledTimes(1);
  });

  it("si GTM nunca responde, continúa al vencer el tiempo máximo", () => {
    w.google_tag_manager = { "GTM-TEST": {} };
    const then = vi.fn();
    trackThen(GATE_EVENTS.recruiter, {}, then);
    vi.advanceTimersByTime(GTM_CALLBACK_TIMEOUT_MS - 1);
    expect(then).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(then).toHaveBeenCalledTimes(1);
  });

  it("detecta GTM aunque todavía se esté cargando (script en la página)", () => {
    expect(isGtmPresent()).toBe(false);
    const script = document.createElement("script");
    script.src = "https://www.googletagmanager.com/gtm.js?id=GTM-TEST";
    script.dataset.testGtm = "1";
    document.head.appendChild(script);
    expect(isGtmPresent()).toBe(true);

    const then = vi.fn();
    trackThen(GATE_EVENTS.recruiter, {}, then);
    vi.advanceTimersByTime(NO_GTM_DELAY_MS + 100); // espera más que sin GTM
    expect(then).not.toHaveBeenCalled();
  });
});

describe("GoogleTagManager", () => {
  it("valida el formato del ID", () => {
    expect(isValidGtmId("GTM-ABC123")).toBe(true);
    expect(isValidGtmId("GTM-")).toBe(false);
    expect(isValidGtmId("UA-12345")).toBe(false);
    expect(isValidGtmId("GTM-abc123")).toBe(false);
    expect(isValidGtmId(undefined)).toBe(false);
    expect(isValidGtmId("GTM-AB'; alert(1)//")).toBe(false);
  });

  it("sin ID válido no renderiza nada", () => {
    const { container } = render(<GoogleTagManager gtmId="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("con ID válido el HTML de servidor incluye el iframe noscript y el cargador", () => {
    const html = renderToStaticMarkup(<GoogleTagManager gtmId="GTM-ABC123" />);
    expect(html).toContain("https://www.googletagmanager.com/ns.html?id=GTM-ABC123");
    expect(html).toContain("<noscript>");
  });
});

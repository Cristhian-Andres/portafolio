import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  detectPlatform,
  gmailAndroidIntentUrl,
  gmailIosUrl,
  gmailWebUrl,
  gmailWindowFeatures,
} from "@/lib/gmail";
import { GmailLink } from "@/components/ui/GmailLink";
import { Footer } from "@/components/layout/Footer";
import { profile } from "@/data/profile";

const ORIGINAL_IO = globalThis.IntersectionObserver;
const ORIGINAL_LOCATION = window.location;

const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36";
const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
const DESKTOP = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120";

function setUserAgent(ua: string, touchPoints = 0) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  // jsdom no define maxTouchPoints, así que no se puede espiar: se declara y se limpia a mano.
  Object.defineProperty(navigator, "maxTouchPoints", { value: touchPoints, configurable: true });
}

describe("URLs de Gmail", () => {
  it("la versión web redacta hacia mi correo con asunto y cuerpo", () => {
    const url = new URL(gmailWebUrl());
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("to")).toBe(profile.contactEmail);
    expect(url.searchParams.get("su")).toMatch(/portafolio/i);
    expect(url.searchParams.get("body")).toMatch(/^Hola Cristhian,/);
  });

  it("iOS usa el esquema de la app de Gmail", () => {
    const url = gmailIosUrl();
    expect(url.startsWith("googlegmail:///co?")).toBe(true);
    expect(new URL(url.replace("googlegmail:", "https:")).searchParams.get("to")).toBe(
      profile.contactEmail
    );
  });

  it("Android apunta al paquete de Gmail y trae respaldo a Gmail web", () => {
    const intent = gmailAndroidIntentUrl();
    expect(intent.startsWith(`intent:mailto:${profile.contactEmail}`)).toBe(true);
    expect(intent).toContain("package=com.google.android.gm");
    expect(intent).toContain(`S.browser_fallback_url=${encodeURIComponent(gmailWebUrl())}`);
    expect(intent.endsWith(";end")).toBe(true);
  });
});

describe("detectPlatform", () => {
  it("reconoce Android, iPhone, iPad moderno y escritorio", () => {
    expect(detectPlatform(ANDROID)).toBe("android");
    expect(detectPlatform(IPHONE)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5)).toBe("ios");
    expect(detectPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0)).toBe("desktop");
    expect(detectPlatform(DESKTOP)).toBe("desktop");
  });
});

describe("GmailLink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.stubGlobal("location", ORIGINAL_LOCATION);
    vi.stubGlobal("IntersectionObserver", ORIGINAL_IO);
    Reflect.deleteProperty(navigator, "maxTouchPoints");
  });

  it("en escritorio abre Gmail web en una ventana emergente aparte", () => {
    setUserAgent(DESKTOP);
    const fakeWindow = { opener: "portafolio", focus: vi.fn() };
    const open = vi.spyOn(window, "open").mockReturnValue(fakeWindow as unknown as Window);
    render(<GmailLink>Escribir</GmailLink>);
    const link = screen.getByRole("link", { name: "Escribir" });

    const notPrevented = fireEvent.click(link);

    expect(notPrevented).toBe(false); // se intercepta para no abrir también una pestaña
    expect(open).toHaveBeenCalledTimes(1);
    const [url, name, features] = open.mock.calls[0];
    expect(url).toBe(gmailWebUrl());
    expect(name).toBe("gmail-compose");
    expect(features).toMatch(/popup=yes/);
    expect(features).toMatch(/width=\d+,height=\d+/);
    expect(fakeWindow.opener).toBeNull();
    expect(fakeWindow.focus).toHaveBeenCalled();
    // sin JavaScript el enlace sigue funcionando como pestaña nueva
    expect(link).toHaveAttribute("href", gmailWebUrl());
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("si el navegador bloquea la ventana emergente, usa una pestaña nueva", () => {
    setUserAgent(DESKTOP);
    const open = vi
      .spyOn(window, "open")
      .mockReturnValueOnce(null) // ventana emergente bloqueada
      .mockReturnValueOnce({} as Window); // la pestaña sí se abre
    render(<GmailLink>Escribir</GmailLink>);
    fireEvent.click(screen.getByRole("link", { name: "Escribir" }));
    expect(open).toHaveBeenCalledTimes(2);
    expect(open.mock.calls[1]).toEqual([gmailWebUrl(), "_blank", "noopener,noreferrer"]);
  });

  it("Ctrl/Cmd + clic respeta el comportamiento nativo del navegador", () => {
    setUserAgent(DESKTOP);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<GmailLink>Escribir</GmailLink>);
    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Escribir" }), {
      ctrlKey: true,
    });
    expect(notPrevented).toBe(true);
    expect(open).not.toHaveBeenCalled();
  });

  it("la ventana emergente se centra y no supera el tamaño de la pantalla", () => {
    const features = gmailWindowFeatures();
    const get = (key: string) => Number(new RegExp(`${key}=(\\d+)`).exec(features)![1]);
    expect(get("width")).toBeLessThanOrEqual(window.screen.availWidth);
    expect(get("height")).toBeLessThanOrEqual(window.screen.availHeight);
    expect(get("left")).toBeGreaterThanOrEqual(0);
    expect(get("top")).toBeGreaterThanOrEqual(0);
  });

  it("en Android intercepta el clic para abrir la app de Gmail", () => {
    setUserAgent(ANDROID);
    const assign = vi.fn();
    vi.stubGlobal("location", {
      set href(value: string) {
        assign(value);
      },
    });
    render(<GmailLink>Escribir</GmailLink>);
    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Escribir" }));
    expect(notPrevented).toBe(false);
    expect(assign).toHaveBeenCalledWith(gmailAndroidIntentUrl());
  });

  it("en iPhone abre el esquema de la app y programa el respaldo a Gmail web", () => {
    vi.useFakeTimers();
    setUserAgent(IPHONE);
    const assign = vi.fn();
    vi.stubGlobal("location", {
      set href(value: string) {
        assign(value);
      },
    });
    render(<GmailLink>Escribir</GmailLink>);
    fireEvent.click(screen.getByRole("link", { name: "Escribir" }));
    expect(assign).toHaveBeenLastCalledWith(gmailIosUrl());

    // La app no respondió (la página sigue visible): se usa Gmail web.
    vi.advanceTimersByTime(1600);
    expect(assign).toHaveBeenLastCalledWith(gmailWebUrl());

    vi.useRealTimers();
  });
});

describe("Footer", () => {
  it("el ícono de correo va a Gmail, no a mailto:", () => {
    render(<Footer />);
    const link = screen.getByRole("link", { name: "Escríbeme por Gmail" });
    expect(link.getAttribute("href")).toContain("mail.google.com");
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });
});

describe("intent de Android", () => {
  it("no incluye scheme= (evitaría mailto:mailto:) y usa SENDTO hacia Gmail", () => {
    const intent = gmailAndroidIntentUrl();
    expect(intent).not.toContain("scheme=");
    expect(intent).toContain("action=android.intent.action.SENDTO");
    expect(intent.match(/mailto:/g)).toHaveLength(1);
  });
});

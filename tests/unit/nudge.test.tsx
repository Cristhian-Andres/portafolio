import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  NUDGE_DELAY_MS,
  NUDGE_FADE_MS,
  NUDGE_SAD_MS,
  PersuasionNudge,
} from "@/components/gatekeeper/PersuasionNudge";

const card = () => document.querySelector("[data-persuasion-nudge]") as HTMLElement | null;
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("tarjeta de persuasión: aparece a los 3 segundos (las dos audiencias)", () => {
  it("el retraso es de 3 segundos", () => {
    expect(NUDGE_DELAY_MS).toBe(3_000);
  });

  for (const audience of ["recruiter", "curious"] as const) {
    it(`${audience}: no está antes de 3 s y sí aparece a los 3 s`, () => {
      render(<PersuasionNudge audience={audience} answeredAt={1} />);
      expect(card()).toBeNull();
      advance(NUDGE_DELAY_MS - 100);
      expect(card()).toBeNull();
      advance(150);
      expect(card()).not.toBeNull();
      expect(card()!.getAttribute("data-audience")).toBe(audience);
    });
  }

  it("sin elegir (Escape) no aparece nunca", () => {
    render(<PersuasionNudge audience="unknown" answeredAt={1} />);
    advance(NUDGE_DELAY_MS * 3);
    expect(card()).toBeNull();
  });
});

describe("tarjeta de persuasión: contenido según la audiencia", () => {
  it("reclutador: invita a contratar con enlace a correo", () => {
    render(<PersuasionNudge audience="recruiter" answeredAt={1} />);
    advance(NUDGE_DELAY_MS + 50);
    expect(screen.getByText(/me vas a contratar/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /contrátame/i })).toBeTruthy();
  });

  it("curioso: invita a seguir en redes, sin «contrátame»", () => {
    render(<PersuasionNudge audience="curious" answeredAt={1} />);
    advance(NUDGE_DELAY_MS + 50);
    expect(screen.getByText(/sígueme/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "LinkedIn" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Instagram" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /contrátame/i })).toBeNull();
  });
});

describe("tarjeta de persuasión: al cerrar", () => {
  it("el RECLUTADOR se pone triste: emoji llorando y mensaje triste, y luego se va", () => {
    render(<PersuasionNudge audience="recruiter" answeredAt={1} />);
    advance(NUDGE_DELAY_MS + 50);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(card()!.getAttribute("data-leaving")).toBe("sad");
    expect(card()!.textContent).toContain("😭");
    expect(card()!.textContent).toMatch(/triste/i);
    advance(NUDGE_SAD_MS / 2);
    expect(card()).not.toBeNull(); // la tristeza se ve un momento
    expect(card()!.textContent).toContain("😭");
    // (que la tarjeta desaparece del todo lo comprueba el e2e: la salida animada no corre con temporizadores falsos)
  });

  it("el CURIOSO no se pone triste: se va sin emoji llorando", () => {
    render(<PersuasionNudge audience="curious" answeredAt={1} />);
    advance(NUDGE_DELAY_MS + 50);
    fireEvent.click(screen.getByRole("button", { name: /cerrar/i }));

    expect(card()!.getAttribute("data-leaving")).toBe("fade");
    expect(card()!.textContent).not.toContain("😭");
    expect(card()!.textContent).not.toMatch(/triste/i);
    advance(NUDGE_FADE_MS / 2);
    expect(card()!.textContent).not.toContain("😭");
  });

  it("la reacción triste dura más que el cierre normal", () => {
    expect(NUDGE_SAD_MS).toBeGreaterThan(NUDGE_FADE_MS * 2);
  });
});

describe("tarjeta de persuasión: una vez por elección", () => {
  it("no se repite para la misma elección, pero una elección nueva la vuelve a mostrar", () => {
    const first = render(<PersuasionNudge audience="curious" answeredAt={111} />);
    advance(NUDGE_DELAY_MS + 50);
    expect(card()).not.toBeNull();
    first.unmount();

    // misma elección (p. ej. una recarga): no vuelve
    const again = render(<PersuasionNudge audience="curious" answeredAt={111} />);
    advance(NUDGE_DELAY_MS + 50);
    expect(card()).toBeNull();
    again.unmount();

    // otra elección (volvió a pasar por la introducción): sí
    render(<PersuasionNudge audience="curious" answeredAt={222} />);
    advance(NUDGE_DELAY_MS + 50);
    expect(card()).not.toBeNull();
  });
});

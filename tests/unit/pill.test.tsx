import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_IO = globalThis.IntersectionObserver;
import { act, render, screen } from "@testing-library/react";
import { FloatingMailButton } from "@/components/gatekeeper/FloatingMailButton";
import { LetterQuote } from "@/components/motion/LetterQuote";

describe("FloatingMailButton", () => {
  it("es un botón compacto: emoji + «Escríbeme», sin imagen ni gif", () => {
    const { container } = render(<FloatingMailButton />);
    const link = screen.getByRole("link", { name: "Escríbeme por correo" });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://mail.google.com/mail/"));
    expect(link).toHaveTextContent("💌");
    expect(link).toHaveTextContent("Escríbeme");
    expect(container.querySelector("img")).toBeNull();
  });

  describe("sobre el footer", () => {
    afterEach(() => {
      vi.stubGlobal("IntersectionObserver", ORIGINAL_IO);
      document.querySelector("footer")?.remove();
    });

    it("se oculta cuando el footer entra en pantalla y reaparece al salir", () => {
      let notify: (entries: Array<{ isIntersecting: boolean }>) => void = () => {};
      class ControlledIO {
        constructor(cb: typeof notify) {
          notify = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
      vi.stubGlobal("IntersectionObserver", ControlledIO);
      document.body.appendChild(document.createElement("footer"));

      render(<FloatingMailButton />);
      const link = screen.getByRole("link", { name: "Escríbeme por correo" });
      expect(link).not.toHaveAttribute("aria-hidden", "true");

      act(() => notify([{ isIntersecting: true }]));
      expect(link).toHaveAttribute("aria-hidden", "true");
      expect(link).toHaveAttribute("tabindex", "-1");
      expect(link.parentElement!.className).toContain("opacity-0");

      act(() => notify([{ isIntersecting: false }]));
      expect(link).not.toHaveAttribute("aria-hidden", "true");
      expect(link.parentElement!.className).not.toContain("opacity-0");
    });
  });
});

describe("LetterQuote resplandor", () => {
  it("cada letra lleva la animación continua con desfase creciente", () => {
    const { container } = render(<LetterQuote text="Hola mundo" />);
    const letters = [...container.querySelectorAll<HTMLElement>("span[style*='--c']")];
    expect(letters.length).toBe(9);
    for (const letter of letters) expect(letter.className).toContain("animate-letter-glow");
    const delays = letters.map((l) => parseFloat(l.style.animationDelay));
    expect(delays[0]).toBe(0);
    expect([...delays].sort((a, b) => a - b)).toEqual(delays);
    expect(delays.at(-1)!).toBeGreaterThan(delays[1]);
  });
});

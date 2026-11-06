import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LetterQuote } from "@/components/motion/LetterQuote";
import { Footer } from "@/components/layout/Footer";

const QUOTE = "“Si puedes imaginarlo, puedes programarlo”";

describe("LetterQuote", () => {
  it("expone la frase completa a lectores de pantalla y oculta las letras sueltas", () => {
    const { container } = render(<LetterQuote text={QUOTE} />);
    expect(screen.getByLabelText(QUOTE)).toBeInTheDocument();
    const hidden = container.querySelectorAll('span[aria-hidden="true"]');
    expect(hidden.length).toBe(QUOTE.split(" ").length);
  });

  it("renderiza una ficha por cada letra (sin contar espacios)", () => {
    const { container } = render(<LetterQuote text="Hola mundo" />);
    const letters = container.querySelectorAll("span[style*='--c']");
    expect(letters.length).toBe("Holamundo".length);
  });

  it("no corta palabras: cada palabra es un bloque que no se parte entre líneas", () => {
    const { container } = render(<LetterQuote text="uno dos" />);
    for (const word of container.querySelectorAll('span[aria-hidden="true"]')) {
      expect(word.className).toContain("whitespace-nowrap");
    }
  });
});

describe("Footer", () => {
  it("muestra la frase y ya no muestra el rol", () => {
    render(<Footer />);
    expect(screen.getByLabelText(QUOTE)).toBeInTheDocument();
    expect(screen.queryByText("Analytics Engineer")).not.toBeInTheDocument();
  });
});

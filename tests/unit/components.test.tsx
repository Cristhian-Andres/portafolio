import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";
import { Header, NAV_LINKS } from "@/components/layout/Header";
import { Contact } from "@/components/sections/Contact";
import { profile } from "@/data/profile";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

describe("Button", () => {
  it("pasa props nativas también en anclas internas", () => {
    render(
      <Button href="#contact" aria-label="ir a contacto" data-testid="b">
        Hola
      </Button>
    );
    const link = screen.getByTestId("b");
    expect(link).toHaveAttribute("href", "#contact");
    expect(link).toHaveAttribute("aria-label", "ir a contacto");
    expect(link).not.toHaveAttribute("target");
  });

  it("abre enlaces http en pestaña nueva con rel seguro", () => {
    render(<Button href="https://example.com">Ext</Button>);
    const link = screen.getByRole("link", { name: "Ext" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("Header", () => {
  it("incluye todas las secciones, también Educación", () => {
    expect(NAV_LINKS.map((l) => l.href)).toContain("#education");
  });

  it("el menú móvil se abre, se cierra con Escape y expone aria-expanded", async () => {
    const user = userEvent.setup();
    render(<Header />);
    const toggle = screen.getByRole("button", { name: "Abrir menú" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(screen.getByRole("button", { name: "Cerrar menú" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(document.getElementById("mobile-menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(document.getElementById("mobile-menu")).not.toBeInTheDocument();
  });
});

describe("Contact", () => {
  it("ya no tiene formulario: solo el botón Escríbeme hacia Gmail", () => {
    const { container } = render(<Contact />);
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("input, textarea")).toBeNull();
    const link = screen.getByRole("link", { name: /escríbeme/i });
    expect(link).toHaveAttribute("href", expect.stringContaining("https://mail.google.com/mail/"));
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("no muestra teléfono y sí el correo y la ubicación", () => {
    render(<Contact />);
    expect(screen.queryByText(/teléfono/i)).not.toBeInTheDocument();
    expect(screen.getByText(profile.contactEmail)).toBeInTheDocument();
    expect(screen.getByText(profile.location)).toBeInTheDocument();
  });

  it("copia el correo al portapapeles y lo confirma", async () => {
    const user = userEvent.setup();
    render(<Contact />);
    await user.click(screen.getByRole("button", { name: /copiar mi correo/i }));
    expect(await screen.findByText("Correo copiado")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(profile.contactEmail);
  });
});

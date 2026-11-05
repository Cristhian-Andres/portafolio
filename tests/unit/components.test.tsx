import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "@/components/ui/Button";
import { Header, NAV_LINKS } from "@/components/layout/Header";
import { Contact, buildMailto } from "@/components/sections/Contact";
import { RecruiterModal } from "@/components/gatekeeper/RecruiterModal";
import { useGatekeeperStore } from "@/components/gatekeeper/useGatekeeperStore";
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
  it("construye un mailto con asunto y cuerpo codificados", () => {
    const href = buildMailto("Ana", "ana@x.com", "Hola & bienvenido");
    expect(href.startsWith(`mailto:${profile.contactEmail}?subject=`)).toBe(true);
    expect(href).toContain(encodeURIComponent("Hola & bienvenido"));
    expect(href).toContain(encodeURIComponent("ana@x.com"));
  });

  it("copia el correo al portapapeles y lo confirma", async () => {
    const user = userEvent.setup();
    render(<Contact />);
    await user.click(screen.getByRole("button", { name: /copiar mi correo/i }));
    expect(await screen.findByText("Correo copiado")).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(profile.contactEmail);
  });
});

describe("RecruiterModal", () => {
  it("es un dialog accesible con foco inicial", () => {
    render(<RecruiterModal />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName(/antes de seguir/i);
    expect(screen.getByRole("button", { name: /reclutador/i })).toHaveFocus();
  });

  it("registra la audiencia elegida", async () => {
    useGatekeeperStore.setState({ hasAnswered: false, audience: null, isExpanded: false });
    const user = userEvent.setup();
    render(<RecruiterModal />);
    await user.click(screen.getByRole("button", { name: /reclutador/i }));
    expect(useGatekeeperStore.getState()).toMatchObject({
      hasAnswered: true,
      audience: "recruiter",
    });
  });

  it("Escape lo cierra como visitante normal", async () => {
    useGatekeeperStore.setState({ hasAnswered: false, audience: null, isExpanded: false });
    const user = userEvent.setup();
    render(<RecruiterModal />);
    await user.keyboard("{Escape}");
    expect(useGatekeeperStore.getState()).toMatchObject({
      hasAnswered: true,
      audience: "normal",
    });
  });

  it("atrapa el foco con Tab entre los dos botones", async () => {
    const user = userEvent.setup();
    render(<RecruiterModal />);
    const [first, second] = screen.getAllByRole("button");
    expect(first).toHaveFocus();
    await user.tab();
    expect(second).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(second).toHaveFocus();
  });
});

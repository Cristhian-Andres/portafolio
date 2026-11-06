import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { skillGroups } from "@/data/skills";
import { SkillChip } from "@/components/skills/SkillChip";
import { SkillTile } from "@/components/skills/SkillTile";
import { SpotlightCard } from "@/components/skills/SpotlightCard";
import { Skills } from "@/components/sections/Skills";
import { StackMarquee } from "@/components/sections/StackMarquee";
import { brandColorOf, readableOnDark } from "@/lib/skills";

const allSkills = skillGroups.flatMap((g) => g.items);

describe("datos de skills", () => {
  it("toda skill tiene nombre e ícono válido", () => {
    for (const skill of allSkills) {
      expect(skill.name.length, skill.name).toBeGreaterThan(0);
      if (skill.icon.kind === "brand") {
        expect(skill.icon.icon.path, skill.name).toMatch(/^M/);
        expect(skill.icon.icon.hex, skill.name).toMatch(/^#[0-9a-f]{6}$/i);
      }
      if (skill.icon.kind === "mono") {
        expect(skill.icon.color, skill.name).toMatch(/^#[0-9a-f]{6}$/i);
        expect(skill.icon.text.length).toBeLessThanOrEqual(3);
      }
    }
  });

  it("los nombres son únicos dentro de cada grupo", () => {
    for (const group of skillGroups) {
      const names = group.items.map((s) => s.name);
      expect(new Set(names).size, group.id).toBe(names.length);
    }
  });

  it("incluye las tecnologías clave del perfil", () => {
    const names = allSkills.map((s) => s.name).join("|");
    for (const key of ["BigQuery", "Redshift", "Python", "Power BI", "n8n", "Docker"]) {
      expect(names).toContain(key);
    }
  });
});

describe("colores de marca", () => {
  it("aclara los logos casi negros para que se vean sobre la ficha oscura", () => {
    expect(readableOnDark("#181717")).not.toBe("#181717");
    expect(readableOnDark("#f7df1e")).toBe("#f7df1e");
  });

  it("devuelve un color por tipo de ícono", () => {
    for (const skill of allSkills) {
      expect(brandColorOf(skill.icon), skill.name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("componentes de skills", () => {
  it("SkillChip muestra nombre, detalle y fija su color de marca", () => {
    const skill = allSkills.find((s) => s.detail)!;
    render(
      <ul>
        <SkillChip skill={skill} />
      </ul>
    );
    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(skill.name);
    expect(item).toHaveTextContent(skill.detail!);
    expect(item.style.getPropertyValue("--brand")).toMatch(/^#/);
  });

  it("SkillTile pinta un svg con el path del logo de marca", () => {
    const brandSkill = allSkills.find((s) => s.icon.kind === "brand")!;
    const { container } = render(<SkillTile icon={brandSkill.icon} />);
    expect(container.querySelector("svg path")).toHaveAttribute(
      "d",
      brandSkill.icon.kind === "brand" ? brandSkill.icon.icon.path : ""
    );
  });

  it("SpotlightCard actualiza la posición del foco con el puntero", () => {
    const { container } = render(<SpotlightCard>contenido</SpotlightCard>);
    const card = container.firstElementChild as HTMLElement;
    fireEvent.pointerMove(card, { clientX: 40, clientY: 25 });
    expect(card.style.getPropertyValue("--mx")).toMatch(/px$/);
    expect(card.style.getPropertyValue("--my")).toMatch(/px$/);
  });

  it("la sección renderiza todos los grupos y todas las skills", () => {
    render(<Skills />);
    for (const group of skillGroups) {
      expect(screen.getByRole("heading", { name: group.category })).toBeInTheDocument();
    }
    for (const skill of allSkills) {
      expect(screen.getAllByText(skill.name).length, skill.name).toBeGreaterThan(0);
    }
  });

  it("el marquee lista cada skill dos veces (bucle) y oculta la copia a lectores", () => {
    const { container } = render(<StackMarquee />);
    expect(container.querySelectorAll("li").length).toBe(allSkills.length * 2);
    expect(container.querySelector('ul[aria-hidden="true"]')).not.toBeNull();
  });
});

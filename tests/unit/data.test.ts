import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { experience } from "@/data/experience";
import { education } from "@/data/education";
import { skillGroups } from "@/data/skills";
import { getYearsOfExperience } from "@/lib/experience";

const publicFile = (src: string) => path.join(process.cwd(), "public", src);

describe("integridad de los datos", () => {
  it("los ids son únicos en cada colección", () => {
    for (const list of [projects, experience, education, skillGroups]) {
      const ids = list.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("los activos referenciados existen en /public", () => {
    expect(existsSync(publicFile(profile.photoSrc))).toBe(true);
    expect(existsSync(publicFile(profile.cvUrl))).toBe(true);
    expect(existsSync(publicFile("cat.gif"))).toBe(false); // el gato ya no se usa
    for (const project of projects) {
      expect(existsSync(publicFile(project.imageSrc)), project.imageSrc).toBe(true);
    }
  });

  it("los enlaces externos usan https", () => {
    const urls = [
      ...profile.socialLinks.map((l) => l.url).filter((u) => !u.startsWith("mailto:")),
      ...projects.flatMap((p) => [p.repoUrl, p.demoUrl].filter(Boolean) as string[]),
    ];
    for (const url of urls) expect(url.startsWith("https://"), url).toBe(true);
  });

  it("el perfil tiene roles para el efecto typewriter", () => {
    expect(profile.roles.length).toBeGreaterThan(1);
  });
});

describe("getYearsOfExperience", () => {
  it("cuenta años completos desde el primer rol (2021-01)", () => {
    expect(getYearsOfExperience(new Date("2026-11-05T00:00:00Z"))).toBe(5);
    expect(getYearsOfExperience(new Date("2026-01-01T00:00:00Z"))).toBe(5);
    expect(getYearsOfExperience(new Date("2025-12-31T00:00:00Z"))).toBe(4);
  });

  it("nunca devuelve negativos", () => {
    expect(getYearsOfExperience(new Date("2000-01-01T00:00:00Z"))).toBe(0);
  });
});

describe("formación", () => {
  it("incluye el Bootcamp de IA de la UTP como el más reciente y completado", () => {
    expect(education[0]).toMatchObject({
      title: "Bootcamp de Inteligencia Artificial",
      institution: "Universidad Tecnológica de Pereira",
      period: "Ene 2026 — Jun 2026",
      status: "completed",
    });
  });
});

describe("privacidad", () => {
  it("el perfil no expone número de teléfono", () => {
    expect(profile).not.toHaveProperty("phone");
    expect(JSON.stringify(profile)).not.toMatch(/\+?\d[\d\s-]{8,}\d/);
  });
});

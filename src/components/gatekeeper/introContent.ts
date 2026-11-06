import { experience } from "@/data/experience";

/** Rol que se muestra bajo el nombre en la hoja de la introducción. */
export const INTRO_ROLE = "Process Automation Engineer";

export type IntroLineKind = "role" | "meta" | "bullet";
export interface IntroLine {
  kind: IntroLineKind;
  text: string;
}

const BULLET_MAX_CHARS = 92;
const BULLETS_SHOWN = 3;

/** Recorta en el último espacio antes de `max` y agrega «…» (sin cortar palabras). */
export function truncateAt(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Líneas del CV que se «escriben» en la introducción, tomadas de mi experiencia real. */
export function buildIntroLines(): IntroLine[] {
  const current = experience[0];
  return [
    { kind: "role", text: current.role },
    { kind: "meta", text: `${current.company} · ${current.period}` },
    ...current.bullets
      .slice(0, BULLETS_SHOWN)
      .map((bullet) => ({ kind: "bullet" as const, text: truncateAt(bullet, BULLET_MAX_CHARS) })),
  ];
}

export function totalChars(lines: IntroLine[]): number {
  return lines.reduce((sum, line) => sum + line.text.length, 0);
}

/** Reparte `typed` caracteres entre las líneas, en orden, y dice cuál está escribiéndose. */
export function visibleLines(
  lines: IntroLine[],
  typed: number
): { text: string; kind: IntroLineKind; typing: boolean }[] {
  let remaining = typed;
  return lines.map((line) => {
    const take = Math.max(0, Math.min(remaining, line.text.length));
    remaining -= take;
    return {
      kind: line.kind,
      text: line.text.slice(0, take),
      typing: take > 0 && take < line.text.length,
    };
  });
}

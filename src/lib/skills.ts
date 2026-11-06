import type { SkillIcon } from "@/types/cv";

const LIGHT_INK = "#e6edf3";

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function lighten(hex: string, amount: number): string {
  const channel = (i: number) => {
    const value = parseInt(hex.slice(i, i + 2), 16);
    return Math.round(value + (255 - value) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

/**
 * Color con el que se pinta un logo sobre la ficha oscura: los logos casi negros pasan a claro
 * y los azules/oscuros (MySQL, PostgreSQL) se aclaran un poco para no perderse.
 */
export function readableOnDark(hex: string): string {
  const l = luminance(hex);
  if (l < 0.08) return LIGHT_INK;
  if (l < 0.22) return lighten(hex, 0.4);
  return hex;
}

/** Color de marca de una skill, usado para el brillo al pasar el cursor. */
export function brandColorOf(icon: SkillIcon): string {
  switch (icon.kind) {
    case "brand":
      return readableOnDark(icon.icon.hex);
    case "lucide":
    case "mono":
      return icon.color;
  }
}

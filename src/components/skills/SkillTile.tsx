import { cn } from "@/lib/utils";
import { readableOnDark } from "@/lib/skills";
import type { SkillIcon } from "@/types/cv";

/** Ficha cuadrada con el logo de una skill (siempre oscura para que cualquier marca resalte). */
export function SkillTile({
  icon,
  size = 40,
  className,
}: {
  icon: SkillIcon;
  size?: number;
  className?: string;
}) {
  const base =
    "flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 select-none";
  const box = { width: size, height: size };
  const glyph = Math.round(size * 0.55);

  if (icon.kind === "mono") {
    return (
      <span
        aria-hidden="true"
        className={cn(base, "font-mono font-bold tracking-tight", className)}
        style={{
          ...box,
          background: icon.color,
          color: icon.ink ?? "#ffffff",
          fontSize: icon.text.length > 2 ? size * 0.26 : size * 0.34,
        }}
      >
        {icon.text}
      </span>
    );
  }

  if (icon.kind === "lucide") {
    const Icon = icon.icon;
    return (
      <span aria-hidden="true" className={cn(base, "bg-[#0c1108]", className)} style={box}>
        <Icon width={glyph} height={glyph} color={icon.color} strokeWidth={1.8} />
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={cn(base, "bg-[#0c1108]", className)} style={box}>
      <svg
        viewBox="0 0 24 24"
        width={glyph}
        height={glyph}
        fill={readableOnDark(icon.icon.hex)}
        role="img"
        aria-label={icon.icon.title}
      >
        <path d={icon.icon.path} />
      </svg>
    </span>
  );
}

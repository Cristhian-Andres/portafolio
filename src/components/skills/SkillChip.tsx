import type { CSSProperties } from "react";
import { brandColorOf } from "@/lib/skills";
import type { SkillItem } from "@/types/cv";
import { SkillTile } from "./SkillTile";

export function SkillChip({ skill }: { skill: SkillItem }) {
  const style = { "--brand": brandColorOf(skill.icon) } as CSSProperties;

  return (
    <li
      style={style}
      className="group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border border-border bg-background/60 p-2.5 sm:gap-3 sm:p-3 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--brand)] hover:bg-surface hover:shadow-[0_16px_36px_-16px_var(--brand)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <SkillTile
        icon={skill.icon}
        className="transition-all duration-300 group-hover:-rotate-6 group-hover:scale-110 group-hover:shadow-[0_0_24px_-2px_var(--brand)] motion-reduce:transform-none"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-foreground">{skill.name}</p>
        {skill.detail && <p className="font-mono text-[11px] leading-snug text-muted sm:text-xs">{skill.detail}</p>}
      </div>

      {/* Destello que cruza la ficha al pasar el cursor */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-12 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-all duration-700 group-hover:translate-x-[520%] group-hover:opacity-100 motion-reduce:hidden"
      />
    </li>
  );
}

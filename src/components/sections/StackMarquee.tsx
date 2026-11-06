import { skillGroups } from "@/data/skills";
import { SkillTile } from "@/components/skills/SkillTile";

const TOOLS = skillGroups.flatMap((group) => group.items);

export function StackMarquee() {
  return (
    <div
      className="marquee relative overflow-hidden border-y border-border bg-surface/60 py-4"
      aria-label="Tecnologías de mi stack"
    >
      <div className="animate-marquee flex w-max gap-8 whitespace-nowrap text-sm text-muted">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex gap-8">
            {TOOLS.map((tool) => (
              <li
                key={`${copy}-${tool.name}`}
                className="flex items-center gap-3 transition-colors hover:text-foreground"
              >
                <SkillTile icon={tool.icon} size={28} className="rounded-lg" />
                <span className="font-mono">{tool.name}</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

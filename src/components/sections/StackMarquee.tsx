import { skillGroups } from "@/data/skills";

const TOOLS = skillGroups.flatMap((group) => group.items);

export function StackMarquee() {
  return (
    <div
      className="marquee relative overflow-hidden border-y border-border bg-surface/60 py-4"
      aria-label="Tecnologías de mi stack"
    >
      <div className="animate-marquee flex w-max gap-10 whitespace-nowrap font-mono text-sm text-muted">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex gap-10">
            {TOOLS.map((tool) => (
              <li key={`${copy}-${tool}`} className="flex items-center gap-10">
                <span>{tool}</span>
                <span className="text-accent">/</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

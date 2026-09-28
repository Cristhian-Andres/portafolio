import { skillGroups } from "@/data/skills";
import { profile } from "@/data/profile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

export function Skills() {
  return (
    <section id="skills" className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Lo que domino" title="Skills" />

        <div className="grid gap-6 sm:grid-cols-2">
          {skillGroups.map((group, index) => (
            <FadeInWhenVisible
              key={group.id}
              delay={index * 0.05}
              className="rounded-2xl border border-border bg-background p-6"
            >
              <h3 className="text-sm font-semibold text-foreground">{group.category}</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <Badge key={item}>{item}</Badge>
                ))}
              </div>
            </FadeInWhenVisible>
          ))}
        </div>

        <FadeInWhenVisible className="mt-10 rounded-2xl border border-border bg-background p-6">
          <h3 className="text-sm font-semibold text-foreground">Habilidades blandas</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.softSkills.map((skill) => (
              <Badge key={skill}>{skill}</Badge>
            ))}
          </div>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

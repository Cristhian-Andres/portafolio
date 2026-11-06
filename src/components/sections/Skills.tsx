import { Sparkles } from "lucide-react";
import { skillGroups } from "@/data/skills";
import { profile } from "@/data/profile";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";
import { SkillChip } from "@/components/skills/SkillChip";
import { SpotlightCard } from "@/components/skills/SpotlightCard";

export function Skills() {
  return (
    <section id="skills" className="relative overflow-hidden border-t border-border py-24">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-accent-solid/10 blur-[110px]"
      />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Lo que domino" title="Skills" />

        <div className="grid gap-6 md:grid-cols-2">
          {skillGroups.map((group, index) => {
            const GroupIcon = group.icon;
            return (
              <FadeInWhenVisible key={group.id} delay={index * 0.06} className="h-full">
                <SpotlightCard>
                  <div className="mb-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                      <GroupIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{group.category}</h3>
                      <p className="font-mono text-xs text-muted">
                        {String(group.items.length).padStart(2, "0")} tecnologías
                      </p>
                    </div>
                  </div>

                  <ul className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    {group.items.map((skill) => (
                      <SkillChip key={skill.name} skill={skill} />
                    ))}
                  </ul>
                </SpotlightCard>
              </FadeInWhenVisible>
            );
          })}
        </div>

        <FadeInWhenVisible className="mt-6" delay={0.1}>
          <SpotlightCard>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-foreground">Habilidades blandas</h3>
            </div>
            <ul className="flex flex-wrap gap-2">
              {profile.softSkills.map((skill) => (
                <li key={skill}>
                  <Badge className="px-4 py-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent hover:text-accent">
                    {skill}
                  </Badge>
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

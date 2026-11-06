import { GraduationCap } from "lucide-react";
import { education } from "@/data/education";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

export function Education() {
  return (
    <section id="education" className="border-t border-border py-24">
      <div className="mx-auto max-w-3xl px-6">
        <SectionHeading eyebrow="Formación" title="Educación" />

        <div className="space-y-4">
          {education.map((item, index) => (
            <FadeInWhenVisible
              key={item.id}
              delay={index * 0.05}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted">{item.institution}</p>
                <p className="mt-1 text-xs text-accent">
                  {item.period}
                  {item.status === "in-progress" && " · En curso"}
                </p>
              </div>
            </FadeInWhenVisible>
          ))}
        </div>
      </div>
    </section>
  );
}

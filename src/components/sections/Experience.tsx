import { SectionHeading } from "@/components/ui/SectionHeading";
import { ExperienceTimeline } from "@/components/timeline/ExperienceTimeline";

export function Experience() {
  return (
    <section id="experience" className="border-t border-border py-24">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Mi trayectoria" title="Experiencia" />
        <ExperienceTimeline />
      </div>
    </section>
  );
}

import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Badge } from "@/components/ui/Badge";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";
import { GithubIcon } from "@/components/icons/BrandIcons";

export function Projects() {
  return (
    <section id="projects" className="border-t border-border bg-surface/40 py-24">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Primeros pasos" title="Proyectos académicos" />
        <p className="mx-auto -mt-8 mb-12 max-w-2xl text-center text-sm text-muted">
          Antes de especializarme en datos, así fue como empecé: proyectos de formación que
          construyeron las bases de lo que hago hoy.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {projects.map((project, index) => (
            <FadeInWhenVisible
              key={project.id}
              delay={index * 0.05}
              className="overflow-hidden rounded-2xl border border-border bg-background"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-surface">
                <Image
                  src={project.imageSrc}
                  alt={project.title}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                  {project.period}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{project.title}</h3>
                <p className="mt-2 text-sm text-muted">{project.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag}>{tag}</Badge>
                  ))}
                </div>

                <div className="mt-5 flex items-center gap-4 text-sm font-medium">
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-foreground hover:text-accent"
                  >
                    <GithubIcon className="h-4 w-4" /> Repositorio
                  </a>
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-foreground hover:text-accent"
                    >
                      <ArrowUpRight className="h-4 w-4" /> Demo
                    </a>
                  )}
                </div>
              </div>
            </FadeInWhenVisible>
          ))}
        </div>
      </div>
    </section>
  );
}

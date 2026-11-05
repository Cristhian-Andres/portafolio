import { profile } from "@/data/profile";
import { education } from "@/data/education";
import { skillGroups } from "@/data/skills";
import { getYearsOfExperience } from "@/lib/experience";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RevealText } from "@/components/motion/RevealText";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";
import { SqlCard } from "@/components/sections/SqlCard";

const BIO_PARAGRAPHS = [
  "Empecé programando por curiosidad y hoy trabajo transformando datos en decisiones y automatizando procesos con IA: diseño arquitecturas de datos, data warehouses y modelos analíticos que convierten información dispersa en una sola fuente de verdad, y construyo bots y flujos con IA que le quitan trabajo manual al equipo.",
  `En ${profile.location.split(",")[0]} construí una base en ingeniería y desarrollo de software que fui orientando cada vez más hacia el mundo de los datos: SQL avanzado, Python, BigQuery, AWS Redshift y arquitecturas self-service BI son hoy mi terreno principal, sin perder la mirada full-stack con la que empecé.`,
  "Sigo aprendiendo de forma continua — actualmente en Ingeniería de Sistemas — porque la calidad y la gobernanza de datos evolucionan tan rápido como las herramientas que las soportan.",
];

export function About() {
  const stats = [
    { label: "Años de experiencia", value: `+${getYearsOfExperience()}` },
    { label: "Formaciones académicas", value: `${education.length}` },
    {
      label: "Tecnologías en mi stack",
      value: `${skillGroups.reduce((total, group) => total + group.items.length, 0)}`,
    },
  ];

  return (
    <section id="about" className="py-24">
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow="Conóceme" title="Mi historia" />

        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="min-w-0">
            <div className="space-y-5 text-base leading-relaxed text-muted">
              {BIO_PARAGRAPHS.map((paragraph, index) => (
                <RevealText key={index} text={paragraph} />
              ))}
            </div>

            <FadeInWhenVisible className="mt-10 grid grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border bg-surface p-4 text-center"
                >
                  <p className="gradient-text text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted">{stat.label}</p>
                </div>
              ))}
            </FadeInWhenVisible>
          </div>

          <SqlCard />
        </div>
      </div>
    </section>
  );
}

import { Download } from "lucide-react";
import { profile } from "@/data/profile";
import { experience } from "@/data/experience";
import { education } from "@/data/education";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/motion/RevealText";
import { FadeInWhenVisible } from "@/components/motion/FadeInWhenVisible";

const STATS = [
  { label: "Años de experiencia", value: "+5" },
  { label: "Formaciones completadas", value: `${education.length}` },
  { label: "Roles y proyectos", value: `${experience.length}+` },
];

const BIO_PARAGRAPHS = [
  "Empecé programando por curiosidad y hoy trabajo transformando datos crudos en decisiones: diseño arquitecturas de datos, data warehouses y modelos analíticos que convierten información dispersa en una sola fuente de verdad para el negocio.",
  `En ${profile.location.split(",")[0]} construí una base en ingeniería y desarrollo de software que fui orientando cada vez más hacia el mundo de los datos: SQL avanzado, Python, BigQuery, AWS Redshift y arquitecturas self-service BI son hoy mi terreno principal, sin perder la mirada full-stack con la que empecé.`,
  "Sigo aprendiendo de forma continua — actualmente en Ingeniería de Sistemas — porque la calidad y la gobernanza de datos evolucionan tan rápido como las herramientas que las soportan.",
];

export function About() {
  return (
    <section id="about" className="border-t border-border py-24">
      <div className="mx-auto max-w-4xl px-6">
        <SectionHeading eyebrow="Conóceme" title="Mi historia" />

        <div className="space-y-5 text-base leading-relaxed text-muted">
          {BIO_PARAGRAPHS.map((paragraph) => (
            <RevealText key={paragraph.slice(0, 24)} text={paragraph} />
          ))}
        </div>

        <FadeInWhenVisible className="mt-10 grid grid-cols-3 gap-4">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-surface p-4 text-center"
            >
              <p className="text-2xl font-semibold text-accent">{stat.value}</p>
              <p className="mt-1 text-xs text-muted">{stat.label}</p>
            </div>
          ))}
        </FadeInWhenVisible>

        <FadeInWhenVisible className="mt-10" delay={0.15}>
          <Button href={profile.cvUrl} variant="outline" icon={<Download className="h-4 w-4" />}>
            Descargar CV
          </Button>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}

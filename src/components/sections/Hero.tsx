import Image from "next/image";
import { Download, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { getYearsOfExperience } from "@/lib/experience";
import { Button } from "@/components/ui/Button";
import { Typewriter } from "@/components/motion/Typewriter";
import { HeroSceneLoader } from "@/components/sections/HeroSceneLoader";

export function Hero() {
  const years = getYearsOfExperience();

  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden"
    >
      <div aria-hidden="true" className="bg-grid absolute inset-0" />
      <div
        aria-hidden="true"
        className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-accent-solid/20 blur-[120px]"
      />
      <div
        aria-hidden="true"
        className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-accent-2/20 blur-[120px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-[1.15fr_1fr]">
        <div className="relative z-10 order-2 md:order-1">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 font-mono text-xs text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-2" />
            $ whoami · +{years} años transformando datos
          </p>

          <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Cristhian <span className="gradient-text">Luna</span>
          </h1>

          <p className="mt-4 h-8 font-mono text-lg text-accent-2 sm:text-xl">
            <span className="text-muted">&gt; </span>
            <Typewriter words={profile.roles} />
          </p>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{profile.tagline}</p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="#contact" icon={<Mail className="h-4 w-4" />}>
              Hablemos
            </Button>
            <Button
              href={profile.cvUrl}
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              download
            >
              Descargar CV
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs text-muted">
            {["BigQuery", "AWS Redshift", "SQL + Python", "Power BI", "IA / LLMs", "n8n"].map((tool) => (
              <li key={tool} className="flex items-center gap-2">
                <span className="text-accent">▸</span>
                {tool}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative order-1 mx-auto aspect-square w-full max-w-sm md:order-2">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-solid/40 to-accent-2/40 blur-3xl" />
          <div className="absolute -inset-[6%] md:-inset-[20%]">
            <HeroSceneLoader />
          </div>
          <div className="relative h-full w-full overflow-hidden rounded-full border-2 border-accent/60 bg-surface shadow-2xl shadow-accent-solid/30">
            <Image
              src={profile.photoSrc}
              alt={profile.name}
              fill
              sizes="(min-width: 768px) 24rem, 80vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

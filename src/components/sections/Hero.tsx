import Image from "next/image";
import { Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { Button } from "@/components/ui/Button";
import { HeroSceneLoader } from "@/components/sections/HeroSceneLoader";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden"
    >
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 py-20 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Hola, soy Cristhian
          </p>
          <h1 className="mt-3 text-4xl font-semibold text-foreground sm:text-5xl">
            {profile.role}
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted">
            {profile.summary}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button href="#contact" icon={<Mail className="h-4 w-4" />}>
              Escríbeme
            </Button>
            <Button href="#experience" variant="outline">
              Ver mi trayectoria
            </Button>
          </div>
        </div>

        <div className="relative order-1 mx-auto aspect-square w-full max-w-sm md:order-2">
          <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -inset-[20%]">
            <HeroSceneLoader />
          </div>
          <div className="relative h-full w-full overflow-hidden rounded-full border border-border bg-surface">
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

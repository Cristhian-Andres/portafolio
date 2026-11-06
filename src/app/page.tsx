"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { StackMarquee } from "@/components/sections/StackMarquee";
import { About } from "@/components/sections/About";
import { Experience } from "@/components/sections/Experience";
import { Skills } from "@/components/sections/Skills";
import { Education } from "@/components/sections/Education";
import { Projects } from "@/components/sections/Projects";
import { Contact } from "@/components/sections/Contact";
import { useGatekeeperStore } from "@/components/gatekeeper/useGatekeeperStore";

const SECTIONS = {
  stack: <StackMarquee key="stack" />,
  about: <About key="about" />,
  experience: <Experience key="experience" />,
  skills: <Skills key="skills" />,
  education: <Education key="education" />,
  projects: <Projects key="projects" />,
} as const;

type SectionKey = keyof typeof SECTIONS;

/** Orden actual: cuenta la historia en orden cronológico/formal. */
const RECRUITER_ORDER: SectionKey[] = [
  "stack",
  "about",
  "experience",
  "skills",
  "education",
  "projects",
];

/** Orden más espontáneo: el trabajo primero, antes que la trayectoria formal. */
const CURIOUS_ORDER: SectionKey[] = [
  "projects",
  "stack",
  "skills",
  "about",
  "experience",
  "education",
];

export default function Home() {
  const audience = useGatekeeperStore((state) => state.audience);
  const order = audience === "curious" ? CURIOUS_ORDER : RECRUITER_ORDER;

  return (
    <>
      <Header />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Hero />
        {order.map((key) => SECTIONS[key])}
        <Contact />
      </main>
      <Footer />
    </>
  );
}

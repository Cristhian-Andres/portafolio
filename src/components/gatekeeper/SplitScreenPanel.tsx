"use client";

import { motion } from "framer-motion";
import { Mail, Sparkles } from "lucide-react";
import { profile } from "@/data/profile";
import { CAT_GIF_URL } from "@/lib/constants";
import { useGatekeeperStore } from "./useGatekeeperStore";
import type { Audience } from "./useGatekeeperStore";

const COPY: Record<Audience, { title: string; body: string }> = {
  recruiter: {
    title: "¡Hola, reclutador! 🕵️‍♂️",
    body: "Este gato certifica que valgo la pena. Explora con calma: experiencia, skills y proyectos están aquí al lado.",
  },
  normal: {
    title: "¡Qué bueno tenerte por aquí! 🐈",
    body: "Este gato te acompaña mientras exploras. Cuando quieras, ocúltalo con «Seguir explorando».",
  },
};

export function SplitScreenPanel() {
  const audience = useGatekeeperStore((state) => state.audience) ?? "normal";
  const expand = useGatekeeperStore((state) => state.expand);
  const copy = COPY[audience];

  return (
    <motion.aside
      layoutId="cat-panel"
      aria-label="Mensaje del gato"
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="fixed inset-x-0 bottom-0 z-40 flex flex-col justify-center gap-3 border-t border-accent/40 bg-surface/95 p-5 text-center shadow-2xl backdrop-blur md:inset-y-0 md:left-auto md:right-0 md:w-[380px] md:gap-4 md:border-l md:border-t-0 md:p-6 md:text-left"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CAT_GIF_URL}
        alt="Gato curioso"
        width={112}
        height={112}
        decoding="async"
        className="mx-auto h-24 w-24 rounded-2xl object-cover md:mx-0 md:h-28 md:w-28"
      />

      <h3 className="text-lg font-semibold text-foreground">{copy.title}</h3>
      <p className="text-sm text-muted">{copy.body}</p>

      <div className="mt-1 flex flex-col gap-3 sm:flex-row md:flex-col">
        <a
          href={`mailto:${profile.contactEmail}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-solid-hover"
        >
          <Mail className="h-4 w-4" /> Escríbeme
        </a>
        <button
          type="button"
          onClick={expand}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Sparkles className="h-4 w-4" /> Seguir explorando
        </button>
      </div>
    </motion.aside>
  );
}

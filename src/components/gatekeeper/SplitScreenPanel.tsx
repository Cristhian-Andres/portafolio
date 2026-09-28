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
    body: "Este gato certifica que valgo la pena. Mi experiencia, skills y proyectos completos están a un clic.",
  },
  normal: {
    title: "¡Qué bueno tenerte por aquí! 🐈",
    body: "Este gato guarda todo mi perfil. Dale a «ver todo» y descubre en qué ando últimamente.",
  },
};

export function SplitScreenPanel() {
  const audience = useGatekeeperStore((state) => state.audience) ?? "normal";
  const expand = useGatekeeperStore((state) => state.expand);
  const copy = COPY[audience];

  return (
    <motion.aside
      layoutId="cat-panel"
      transition={{ duration: 0.45, ease: "easeInOut" }}
      className="fixed inset-x-0 bottom-0 z-40 flex h-[48vh] flex-col justify-center gap-4 border-t border-border bg-surface p-6 text-center shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:h-auto md:w-[380px] md:border-l md:border-t-0 md:text-left"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CAT_GIF_URL}
        alt="Gato curioso"
        className="mx-auto h-28 w-28 rounded-2xl object-cover md:mx-0"
      />

      <h3 className="text-lg font-semibold text-foreground">{copy.title}</h3>
      <p className="text-sm text-muted">{copy.body}</p>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row md:flex-col">
        <a
          href={`mailto:${profile.contactEmail}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
        >
          <Mail className="h-4 w-4" /> Escríbeme
        </a>
        <button
          type="button"
          onClick={expand}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          <Sparkles className="h-4 w-4" /> Ver todo el perfil
        </button>
      </div>
    </motion.aside>
  );
}

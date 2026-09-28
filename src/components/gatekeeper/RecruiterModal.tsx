"use client";

import { motion } from "framer-motion";
import { CAT_GIF_URL } from "@/lib/constants";
import { useGatekeeperStore } from "./useGatekeeperStore";

export function RecruiterModal() {
  const answer = useGatekeeperStore((state) => state.answer);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 px-6 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        layoutId="cat-panel"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl border border-border bg-surface p-8 text-center shadow-2xl"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CAT_GIF_URL}
          alt="Gato mirando con sospecha"
          className="mx-auto h-32 w-32 rounded-2xl object-cover"
        />

        <h2 className="mt-5 text-lg font-semibold text-foreground">
          Antes de seguir... 👀
        </h2>
        <p className="mt-2 text-sm text-muted">
          ¿Eres reclutador o una persona normal que llegó por curiosidad?
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => answer("recruiter")}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-strong"
          >
            Soy reclutador 🕵️
          </button>
          <button
            type="button"
            onClick={() => answer("normal")}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Solo soy curioso 🐈
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

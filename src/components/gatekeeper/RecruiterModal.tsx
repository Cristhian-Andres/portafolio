"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CAT_GIF_URL } from "@/lib/constants";
import { useGatekeeperStore } from "./useGatekeeperStore";

export function RecruiterModal() {
  const answer = useGatekeeperStore((state) => state.answer);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button"));
    buttons[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        answer("normal");
        return;
      }
      if (event.key !== "Tab" || buttons.length === 0) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [answer]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-6 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        ref={dialogRef}
        layoutId="cat-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gatekeeper-title"
        aria-describedby="gatekeeper-desc"
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm rounded-3xl border border-accent/40 bg-surface p-8 text-center shadow-2xl shadow-accent-solid/30"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={CAT_GIF_URL}
          alt="Gato mirando con sospecha"
          width={128}
          height={128}
          decoding="async"
          className="mx-auto h-32 w-32 rounded-2xl object-cover"
        />

        <h2 id="gatekeeper-title" className="mt-5 text-lg font-semibold text-foreground">
          Antes de seguir... 👀
        </h2>
        <p id="gatekeeper-desc" className="mt-2 text-sm text-muted">
          ¿Eres reclutador o una persona normal que llegó por curiosidad?
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => answer("recruiter")}
            className="rounded-full bg-accent-solid px-5 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-solid-hover"
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

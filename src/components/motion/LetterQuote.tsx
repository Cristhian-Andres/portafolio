"use client";

import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Frase con efecto por letra: entrada en cascada, degradado a lo largo del texto
 * y cada letra se levanta y brilla al pasar el cursor.
 */
export function LetterQuote({ text, className }: { text: string; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  const total = [...text.replace(/ /g, "")].length;
  let index = 0;

  return (
    <p aria-label={text} className={cn("font-semibold leading-snug", className)}>
      {words.map((word, wordIndex) => (
        <span
          key={`${wordIndex}-${word}`}
          aria-hidden="true"
          className="mr-[0.3em] inline-block whitespace-nowrap last:mr-0"
        >
          {[...word].map((char) => {
            const position = index++;
            const mix = Math.round((position / Math.max(total - 1, 1)) * 100);
            return (
              <motion.span
                key={position}
                className="inline-block"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18, filter: "blur(6px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.45, delay: position * 0.028, ease: "easeOut" }}
              >
                <span
                  style={
                    {
                      "--c": `color-mix(in oklab, var(--accent) ${100 - mix}%, var(--accent-2))`,
                      // Desfase por letra: el resplandor viaja de izquierda a derecha sin parar.
                      animationDelay: `${(position * 0.08).toFixed(2)}s`,
                    } as CSSProperties
                  }
                  className="animate-letter-glow inline-block cursor-default text-[color:var(--c)] transition-transform duration-200 hover:-translate-y-1.5 hover:scale-125 hover:animate-none hover:text-foreground hover:[text-shadow:0_0_22px_var(--accent)] motion-reduce:transition-none motion-reduce:hover:transform-none"
                >
                  {char}
                </span>
              </motion.span>
            );
          })}
        </span>
      ))}
    </p>
  );
}

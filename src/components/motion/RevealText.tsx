"use client";

import { motion, useReducedMotion } from "framer-motion";

export function RevealText({
  text,
  className,
  once = true,
}: {
  text: string;
  className?: string;
  once?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");

  if (shouldReduceMotion) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className} aria-label={text}>
      {words.map((word, index) => (
        <motion.span
          key={`${index}-${word}`}
          aria-hidden="true"
          className="mr-[0.28em] inline-block"
          initial={{ opacity: 0, y: "0.35em", filter: "blur(4px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once, amount: 0.6 }}
          transition={{ duration: 0.4, delay: index * 0.015, ease: "easeOut" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

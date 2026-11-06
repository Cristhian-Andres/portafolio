"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const TYPE_MS = 55;
const DELETE_MS = 28;
const HOLD_MS = 1600;

export function Typewriter({ words, className }: { words: string[]; className?: string }) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (shouldReduceMotion) return;
    const word = words[index];
    let delay = deleting ? DELETE_MS : TYPE_MS;
    if (!deleting && text === word) delay = HOLD_MS;

    const timer = setTimeout(() => {
      if (!deleting && text === word) {
        setDeleting(true);
      } else if (deleting && text === "") {
        setDeleting(false);
        setIndex((value) => (value + 1) % words.length);
      } else {
        setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [text, deleting, index, words, shouldReduceMotion]);

  if (shouldReduceMotion) {
    return <span className={className}>{words[0]}</span>;
  }

  return (
    <span className={className}>
      <span className="sr-only">{words.join(", ")}</span>
      <span aria-hidden="true">
        {text}
        <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] animate-pulse bg-accent-2" />
      </span>
    </span>
  );
}

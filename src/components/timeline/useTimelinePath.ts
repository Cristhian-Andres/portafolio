"use client";

import { useRef } from "react";
import { useScroll, useSpring } from "framer-motion";

export function useTimelinePath() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.85", "end 0.6"],
  });

  const pathLength = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.5,
  });

  return { containerRef, pathLength };
}

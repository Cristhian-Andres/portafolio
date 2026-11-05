"use client";

import { motion } from "framer-motion";
import { experience } from "@/data/experience";
import { TimelineNode } from "./TimelineNode";
import { useTimelinePath } from "./useTimelinePath";

const WAVE_PATH =
  "M5 0 C 8 8, 2 17, 5 25 C 8 33, 2 42, 5 50 C 8 58, 2 67, 5 75 C 8 83, 2 92, 5 100";

export function ExperienceTimeline() {
  const { containerRef, pathLength } = useTimelinePath();

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="absolute left-6 top-0 h-full w-3 -translate-x-1/2 md:left-1/2"
        viewBox="0 0 10 100"
        preserveAspectRatio="none"
        fill="none"
        aria-hidden="true"
      >
        <path d={WAVE_PATH} stroke="var(--border)" strokeWidth="2" />
        <motion.path
          d={WAVE_PATH}
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{ pathLength }}
        />
      </svg>

      <ol className="relative flex flex-col gap-16 md:gap-20">
        {experience.map((item, index) => (
          <li key={item.id}>
            <TimelineNode experience={item} index={index} />
          </li>
        ))}
      </ol>
    </div>
  );
}

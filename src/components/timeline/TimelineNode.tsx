"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import type { Experience } from "@/types/cv";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function TimelineNode({
  experience,
  index,
}: {
  experience: Experience;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const isEven = index % 2 === 0;

  return (
    <div ref={ref} className="relative pl-10 md:pl-0">
      <span
        className={cn(
          "absolute left-6 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-accent bg-background transition-transform duration-500 md:left-1/2",
          isInView ? "scale-100" : "scale-0"
        )}
      />

      <motion.div
        initial={{ opacity: 0, x: isEven ? -24 : 24 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "rounded-2xl border border-border bg-surface p-6 md:w-[46%]",
          isEven ? "md:mr-auto" : "md:ml-auto"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">
          {experience.period}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-foreground">{experience.role}</h3>
        <p className="text-sm text-muted">{experience.company}</p>

        <ul className="mt-4 space-y-2 text-sm text-muted">
          {experience.bullets.map((bullet, i) => (
            <li key={i}>{bullet}</li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap gap-2">
          {experience.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
